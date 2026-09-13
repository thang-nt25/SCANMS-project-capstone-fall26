# FR-24: Merchant payout approval and VietQR export

The prototype `/app/payouts` embeds the live `/merchant/payouts` page. Demo KOLs and static totals are no longer actionable. Authentication and shop ownership remain enforced by the API.

## Approval

- Open **Duyệt và tải bill** on a PENDING or PROCESSING request.
- Review the real KOL contact/tax details, masked bank account, and stored gross/tax/net amounts. No tax is recalculated.
- Confirm only after successfully transferring the displayed net amount at the bank.
- Choose or drop one JPG, PNG or PDF bill, at most 5 MiB (or a lower configured server limit). Preview/remove the selected file. WEBP remains supported by the legacy backend for compatibility, but is not offered by the new form.
- Optionally enter the real bank transaction reference and a note of up to 500 characters. A missing reference is stored as NULL, never fabricated.
- Submit once; controls are disabled while uploading. Failures retain the modal and inputs. Refresh payout history before retrying an ambiguous network failure.

`POST /api/payouts/:payoutId/approve` accepts multipart `bill`, optional `note`, optional `bankRefCode`. The API infers the owned shop from the payout. The existing shop-scoped PATCH endpoint remains compatible and still requires `bankRefCode`.

The existing response envelope contains `data.id`, `data.payoutId`, uppercase `data.status`, `data.approvedAt`, and `data.hasBill`. To view a bill, request the owner-authorized `/api/stores/:storeId/payouts/:payoutId/bill` endpoint; its private download URL expires after 120 seconds. Public permanent bill URLs are deliberately not returned.

Approval locks the payout and records the status, private proof and approval audit (including note) in one transaction. It never debits the wallet again. Duplicate bill hashes and duplicate provided shop/bank references remain rejected. Notes are stored in audit details, so no additional note column is needed.

## Deployment migration

Review and deploy `backend/prisma/migrations/20260913123000_fr24_receipt_approval/migration.sql` through the team's migration workflow **after** the existing FR-24 migration. It only replaces the approval-proof CHECK to make the bank reference optional. It does not update historical payouts, tax, wallets or ledgers, and does not remove duplicate-proof indexes. `NOT VALID` preserves legacy rows while checking new writes.

The migration is applied only to the disposable Docker QA database during testing. Do not run `db push` or apply migrations to shared Supabase without the leader's approval and migration-history review.

PDF bills use the existing authenticated Cloudinary image-resource storage. Cloudinary validates the actual PDF during upload; password-protected PDFs are unsupported in this flow. Ensure PDF delivery is allowed for the deployment account: [Cloudinary PDF documentation](https://cloudinary.com/documentation/ts_how_to_upload_manage_and_deliver_pdf_files). Browser PDF previews display a document icon rather than embedding potentially active document content.

## Export

Select eligible PENDING requests, then **Xuất Excel VietQR / Napas247**. The existing backend generates the real XLSX and moves the selected payouts to PROCESSING in a transaction. Export does not transfer money or approve payouts. Bank BIN/name mappings come from `PAYOUT_VIETQR_BANKS`, never demo bank details.

The workbook includes batch/payout/KOL IDs, bank code/BIN, account number/name, gross/tax/net, currency, transfer description and VietQR URL. Account numbers remain text to preserve leading zeros. This is a reconciliation/payment-preparation workbook, not a universal bank-specific Napas247 import template.

Use batch history to re-download the same workbook after a failed download; do not export or transfer again blindly. PROCESSING requests cannot be automatically rejected/refunded.

## Verification

Tests cover bill type/extension/size validation, PDF signature checks, real multipart POST authentication/ownership, transactional approval without a second debit, note persistence, repeat approval, browser previews/removal, double submit, export and batch re-download. PostgreSQL tests use only an opt-in disposable local database; successful storage is mocked in those integration tests. Docker without configured private storage must return a handled error, not a fake successful approval.

No new dependency, CSS file or `.env` change is required.
