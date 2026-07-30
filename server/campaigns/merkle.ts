import {
  encodeAbiParameters,
  keccak256,
  stringToHex,
  type Hex,
} from "viem";

export type CampaignLeaf = {
  allocationId: string;
  index: number;
  amountAtomic: string;
};

export function contractAllocationId(allocationId: string) {
  return keccak256(stringToHex(allocationId));
}

export function campaignLeaf(value: CampaignLeaf) {
  const inner = keccak256(encodeAbiParameters(
    [{ type: "uint256" }, { type: "bytes32" }, { type: "uint256" }],
    [BigInt(value.index), contractAllocationId(value.allocationId), BigInt(value.amountAtomic)],
  ));
  return keccak256(inner);
}

function pair(left: Hex, right: Hex) {
  return keccak256(
    left.toLowerCase() < right.toLowerCase()
      ? (`0x${left.slice(2)}${right.slice(2)}` as Hex)
      : (`0x${right.slice(2)}${left.slice(2)}` as Hex),
  );
}

export function buildCampaignTree(values: CampaignLeaf[]) {
  if (!values.length) throw new Error("A campaign needs at least one allocation.");
  const leaves = values.map(campaignLeaf);
  const layers: Hex[][] = [leaves];
  while (layers.at(-1)!.length > 1) {
    const current = layers.at(-1)!;
    const next: Hex[] = [];
    for (let index = 0; index < current.length; index += 2) {
      next.push(index + 1 < current.length ? pair(current[index], current[index + 1]) : current[index]);
    }
    layers.push(next);
  }
  return {
    root: layers.at(-1)![0],
    proof(index: number) {
      if (index < 0 || index >= leaves.length) throw new Error("Allocation index is outside the tree.");
      const proof: Hex[] = [];
      let cursor = index;
      for (let layerIndex = 0; layerIndex < layers.length - 1; layerIndex += 1) {
        const layer = layers[layerIndex];
        const sibling = cursor ^ 1;
        if (sibling < layer.length) proof.push(layer[sibling]);
        cursor = Math.floor(cursor / 2);
      }
      return proof;
    },
  };
}
