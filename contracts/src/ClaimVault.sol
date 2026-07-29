// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

interface IERC20 {
    function balanceOf(address account) external view returns (uint256);
    function transfer(address to, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
}

library SafeToken {
    error TokenCallFailed();

    function safeTransfer(IERC20 token, address to, uint256 amount) internal {
        (bool success, bytes memory data) =
            address(token).call(abi.encodeCall(token.transfer, (to, amount)));
        if (!success || (data.length != 0 && !abi.decode(data, (bool)))) {
            revert TokenCallFailed();
        }
    }

    function safeTransferFrom(IERC20 token, address from, address to, uint256 amount) internal {
        (bool success, bytes memory data) =
            address(token).call(abi.encodeCall(token.transferFrom, (from, to, amount)));
        if (!success || (data.length != 0 && !abi.decode(data, (bool)))) {
            revert TokenCallFailed();
        }
    }
}

contract ClaimVault {
    using SafeToken for IERC20;

    enum Status {
        None,
        Active,
        Claimed,
        Cancelled,
        Refunded
    }

    struct Claim {
        address sender;
        address token;
        address refundAddress;
        uint128 amount;
        uint64 expiresAt;
        bool cancelable;
        Status status;
        bytes32 secretHash;
    }

    error AlreadyExists();
    error AlreadyInitialized();
    error AuthorizationExpired();
    error FeeOnTransferTokenUnsupported();
    error InvalidAddress();
    error InvalidAmount();
    error InvalidAuthorization();
    error InvalidExpiration();
    error InvalidSecret();
    error InvalidStatus();
    error NotCancelable();
    error NotExpired();
    error NotOwner();
    error NotSender();
    error Paused();
    error Reentrancy();

    event AuthorizerUpdated(address indexed previousAuthorizer, address indexed newAuthorizer);
    event ClaimCancelled(bytes32 indexed claimId, address indexed refundAddress, uint256 amount);
    event ClaimCompleted(
        bytes32 indexed claimId,
        address indexed recipient,
        address indexed token,
        uint256 amount
    );
    event ClaimCreated(
        bytes32 indexed claimId,
        address indexed sender,
        address indexed token,
        uint256 amount,
        uint64 expiresAt,
        address refundAddress,
        bool cancelable,
        bytes32 secretHash
    );
    event ClaimRefunded(bytes32 indexed claimId, address indexed refundAddress, uint256 amount);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    event PauseUpdated(bool paused);

    uint256 private constant _SECP256K1N_DIV_2 =
        0x7fffffffffffffffffffffffffffffff5d576e7357a4501ddfe92f46681b20a0;

    mapping(bytes32 claimId => Claim claim) public claims;

    address public owner;
    address public authorizer;
    bool public paused;
    uint256 private _entered;

    constructor(address initialOwner, address initialAuthorizer) {
        if (initialOwner == address(0) || initialAuthorizer == address(0)) {
            revert InvalidAddress();
        }

        owner = initialOwner;
        authorizer = initialAuthorizer;
        _entered = 1;

        emit OwnershipTransferred(address(0), initialOwner);
        emit AuthorizerUpdated(address(0), initialAuthorizer);
    }

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    modifier nonReentrant() {
        if (_entered != 1) revert Reentrancy();
        _entered = 2;
        _;
        _entered = 1;
    }

    modifier whenNotPaused() {
        if (paused) revert Paused();
        _;
    }

    function createClaim(
        bytes32 claimId,
        address token,
        uint128 amount,
        bytes32 secretHash,
        uint64 expiresAt,
        address refundAddress,
        bool cancelable
    ) external nonReentrant whenNotPaused {
        if (claimId == bytes32(0) || secretHash == bytes32(0)) revert InvalidSecret();
        if (token == address(0) || refundAddress == address(0)) revert InvalidAddress();
        if (amount == 0) revert InvalidAmount();
        if (expiresAt <= block.timestamp) revert InvalidExpiration();
        if (claims[claimId].status != Status.None) revert AlreadyExists();

        IERC20 asset = IERC20(token);
        uint256 balanceBefore = asset.balanceOf(address(this));

        claims[claimId] = Claim({
            sender: msg.sender,
            token: token,
            refundAddress: refundAddress,
            amount: amount,
            expiresAt: expiresAt,
            cancelable: cancelable,
            status: Status.Active,
            secretHash: secretHash
        });

        asset.safeTransferFrom(msg.sender, address(this), amount);

        if (asset.balanceOf(address(this)) - balanceBefore != amount) {
            revert FeeOnTransferTokenUnsupported();
        }

        emit ClaimCreated(
            claimId,
            msg.sender,
            token,
            amount,
            expiresAt,
            refundAddress,
            cancelable,
            secretHash
        );
    }

    function claim(
        bytes32 claimId,
        bytes32 secret,
        address recipient,
        uint64 authorizationDeadline,
        bytes calldata signature
    ) external nonReentrant whenNotPaused {
        Claim storage storedClaim = claims[claimId];

        if (storedClaim.status != Status.Active) revert InvalidStatus();
        if (block.timestamp >= storedClaim.expiresAt) revert InvalidStatus();
        if (recipient == address(0)) revert InvalidAddress();
        if (keccak256(abi.encodePacked(secret)) != storedClaim.secretHash) revert InvalidSecret();
        if (block.timestamp > authorizationDeadline) revert AuthorizationExpired();

        bytes32 digest = authorizationDigest(claimId, recipient, authorizationDeadline);
        if (_recover(digest, signature) != authorizer) revert InvalidAuthorization();

        storedClaim.status = Status.Claimed;
        IERC20(storedClaim.token).safeTransfer(recipient, storedClaim.amount);

        emit ClaimCompleted(claimId, recipient, storedClaim.token, storedClaim.amount);
    }

    function cancel(bytes32 claimId) external nonReentrant {
        Claim storage storedClaim = claims[claimId];

        if (storedClaim.status != Status.Active) revert InvalidStatus();
        if (msg.sender != storedClaim.sender) revert NotSender();
        if (!storedClaim.cancelable) revert NotCancelable();

        storedClaim.status = Status.Cancelled;
        IERC20(storedClaim.token).safeTransfer(storedClaim.refundAddress, storedClaim.amount);

        emit ClaimCancelled(claimId, storedClaim.refundAddress, storedClaim.amount);
    }

    function refundExpired(bytes32 claimId) external nonReentrant {
        Claim storage storedClaim = claims[claimId];

        if (storedClaim.status != Status.Active) revert InvalidStatus();
        if (block.timestamp < storedClaim.expiresAt) revert NotExpired();

        storedClaim.status = Status.Refunded;
        IERC20(storedClaim.token).safeTransfer(storedClaim.refundAddress, storedClaim.amount);

        emit ClaimRefunded(claimId, storedClaim.refundAddress, storedClaim.amount);
    }

    function authorizationDigest(bytes32 claimId, address recipient, uint64 deadline)
        public
        view
        returns (bytes32)
    {
        bytes32 inner = keccak256(
            abi.encode(block.chainid, address(this), claimId, recipient, deadline)
        );
        return keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", inner));
    }

    function setPaused(bool newPaused) external onlyOwner {
        paused = newPaused;
        emit PauseUpdated(newPaused);
    }

    function setAuthorizer(address newAuthorizer) external onlyOwner {
        if (newAuthorizer == address(0)) revert InvalidAddress();
        address previousAuthorizer = authorizer;
        authorizer = newAuthorizer;
        emit AuthorizerUpdated(previousAuthorizer, newAuthorizer);
    }

    function transferOwnership(address newOwner) external onlyOwner {
        if (newOwner == address(0)) revert InvalidAddress();
        address previousOwner = owner;
        owner = newOwner;
        emit OwnershipTransferred(previousOwner, newOwner);
    }

    function _recover(bytes32 digest, bytes calldata signature) private pure returns (address) {
        if (signature.length != 65) return address(0);

        bytes32 r;
        bytes32 s;
        uint8 v;
        assembly {
            r := calldataload(signature.offset)
            s := calldataload(add(signature.offset, 32))
            v := byte(0, calldataload(add(signature.offset, 64)))
        }

        if (uint256(s) > _SECP256K1N_DIV_2 || (v != 27 && v != 28)) return address(0);
        return ecrecover(digest, v, r, s);
    }
}
