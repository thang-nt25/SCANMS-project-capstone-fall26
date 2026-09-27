# PayOS checkout for SCANMS

The buyer signs in, enters delivery details and confirms the order. SCANMS creates the order at the database price, then creates a PayOS payment link for that order. The buyer can scan the PayOS QR or open the hosted PayOS page. The order is marked `PAID` only after a signed PayOS webhook is verified, including the order code, amount, currency and payment link ID. A browser return URL never marks an order paid.

## Configuration

1. Create a payment channel in [my.payos.vn](https://my.payos.vn/) and copy its **Client ID**, **API Key** and **Checksum Key** into `backend/.env` as `PAYOS_CLIENT_ID`, `PAYOS_API_KEY` and `PAYOS_CHECKSUM_KEY`. Do not put them in frontend environment files.
2. Set `PAYOS_STOREFRONT_URL` to the public HTTPS origin of the SCANMS frontend, such as `https://scanms.example` (without a path). Local development defaults to `http://localhost:5173`.
3. Register the public HTTPS webhook URL `https://YOUR_API_DOMAIN/api/orders/payos/webhook` in the PayOS channel. PayOS sends a signed sample webhook when registering; the endpoint acknowledges a valid sample without changing an order. Once PayOS confirms registration, set `PAYOS_WEBHOOK_URL` to that exact URL in `backend/.env` and restart the backend. Checkout stays disabled until this value exists.
4. Ensure the production frontend and backend URLs are reachable and use a PayOS test transaction to verify that the order changes from `WAITING_PAYMENT` to `PAID` and gets one `PAYOS` payment transaction.

Until the keys and return URL are configured, checkout disables the PayOS confirmation button and the backend refuses to create a `PAYOS` order. Existing VietQR reconciliation and manual order routes remain separate.

PayOS API and webhook behavior: [official PayOS API](https://payos.vn/docs/api/), [Node SDK](https://payos.vn/docs/sdks/back-end/node/).
