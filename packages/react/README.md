# @currentcofi/react

Drop-in claim and referral surfaces for Arc projects.

```tsx
import { CurrentClaimEmbed } from "@currentcofi/react";

export function Reward({ claimUrl }: { claimUrl: string }) {
  return <CurrentClaimEmbed claimUrl={claimUrl} accent="#22e4d5" />;
}
```

The component reads public claim metadata, keeps project credentials out of the browser, and sends the recipient into Current CoFi's hosted wallet onboarding and sponsored claim flow.
