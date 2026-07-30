"use client";

import { CurrentClaimEmbed } from "@currentcofi/react";

export function ClaimReward({ claimUrl }: { claimUrl: string }) {
  return (
    <CurrentClaimEmbed
      claimUrl={claimUrl}
      referralCode="founding-current"
      accent="#22e4d5"
    />
  );
}
