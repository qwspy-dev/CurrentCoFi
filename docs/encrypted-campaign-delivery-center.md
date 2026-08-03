# Encrypted campaign delivery center

Current CoFi now persists every private recipient claim URL created by an allowlisted campaign. The full credential is encrypted with the server's AES-GCM application secret; the database stores only ciphertext and a masked version of the offchain identity. An authenticated project member—or a scoped developer key—can recover links for an authorized campaign.

## Operator workflow

1. Create a USDC or Arc project-token recipient campaign.
2. Open **Delivery center** to see masked recipients and settlement states.
3. Copy a private link, create a QR code, prepare an email/X/Telegram/SMS handoff, or export an operator-only CSV.
4. Current CoFi records the selected handoff channel and timestamp in the audit ledger.
5. The record changes to **claimed** only after the corresponding allocation is confirmed on Arc.

“Handoff recorded” deliberately does not mean that an email, social network, or game provider confirmed delivery. Native provider delivery receipts remain an external-integration milestone.

## Integration surface

- Workspace API: `GET|POST /api/v1/deliveries`
- Developer API: `GET|POST /api/v1/developer/deliveries`
- SDK: `current.deliveries.list()` and `current.deliveries.recordHandoff()`
- MCP: `current_list_campaign_deliveries` and approval-gated `current_record_campaign_handoff`

The developer write route requires `campaigns:write`, request signing, and a bounded request body. The MCP write requires the exact confirmation `I_APPROVE_CURRENT_DELIVERY_HANDOFF`.

## Privacy and evidence

Grant evidence contains aggregate ready, handed-off, and claimed counts, but it excludes raw recipient identities and private claim URLs. QR codes and downloaded manifests contain claim credentials and must only be shared with intended recipients.
