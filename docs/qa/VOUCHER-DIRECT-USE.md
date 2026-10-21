# Voucher: discovery and direct use

## Behavior

- Product pages request coupons with `productId`; discovery checks shop, category,
  explicit products, campaign products, live products, dates, budget and usage.
- Discovery is not a reservation. Quantity, variant, customer usage and current
  prices are checked again by validation and order placement.
- Customer voucher cards expose eligible products. Product links carry a
  `voucher` query parameter; saving a coupon is optional.
- Shop vouchers use the existing goods validation API. Platform goods and
  shipping use their respective stacked-voucher slots at checkout.
- Shipping discounts require a calculated shipping fee. A voucher can be selected
  before an address is filled; validation runs again when the fee changes.
- Admin platform issuance keeps the existing per-store, 100% platform-funded
  model and adds start/end scheduling and a customer usage limit. This is not a
  cross-store coupon or a change to reimbursement accounting.
- No database migration is introduced.

## Manual acceptance checks

1. Create a shop voucher restricted to product A. Confirm it appears on A but not B.
2. Repeat for a category, a campaign and a live-session product.
3. Click a shop voucher on A. Confirm the discount appears without saving the code.
4. Change quantity or variant. Confirm the old discount is removed/revalidated.
5. Open Customer → Vouchers → Dùng ngay. Choose A and confirm the code is carried
   to A and applied; no saved-coupon request is required for this action.
6. Click a platform goods voucher and inspect its own slot in checkout.
7. Click a shipping voucher, enter an address and confirm the discount is capped
   at the shipping fee. Change the address and verify recalculation.
8. Remove the automatically selected extra voucher. Change the phone/address and
   confirm the removed code does not silently reapply.
9. Submit while validation is pending: placement must wait.
10. In Admin → Affiliate oversight → Coupons, schedule a platform coupon and set
    a per-customer limit. Before its start it must not be publicly discoverable.
11. Exhaust a voucher's budget or expire it; neither discovery nor validation
    should treat it as available.

## Limit

The eligible-product picker loads 24 products per page with a load-more action.
Runtime authenticated checkout and real payment
must be verified with test accounts; automated tests do not place real orders.
