import { type ReactNode } from "react";
export type CurrentClaimPreview = {
    amount: string;
    asset: string;
    claimable: boolean;
    expiresAt: string | null;
    message: string;
    project: {
        name: string;
        logoUrl: string | null;
    };
    sender: string;
    status: string;
};
export type CurrentClaimEmbedProps = {
    token?: string;
    claimUrl?: string;
    referralCode?: string;
    baseUrl?: string;
    preview?: CurrentClaimPreview;
    accent?: string;
    compact?: boolean;
    onOpen?: (url: string) => void;
};
export declare function CurrentClaimEmbed({ token, claimUrl, referralCode, baseUrl, preview, accent, compact, onOpen, }: CurrentClaimEmbedProps): import("react/jsx-runtime").JSX.Element;
export declare function CurrentReferralLink({ claimUrl, referralCode, children, className, }: {
    claimUrl: string;
    referralCode: string;
    children?: ReactNode;
    className?: string;
}): import("react/jsx-runtime").JSX.Element;
//# sourceMappingURL=index.d.ts.map