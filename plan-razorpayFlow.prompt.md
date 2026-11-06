Razorpay implementation and study plan for this codebase

Goal
- Explain the full Razorpay payment flow in this project from the user journey through the server verification and webhook processing.
- Help a learner understand the sequence of pages, actions, DB changes, and security checks.
- Keep the explanation grounded in the actual code structure and behavior in this app.

Project context
- This is a Next.js app with App Router.
- Checkout flow is driven by a client component at app/checkout/checkout-form.tsx.
- The server-side order creation and payment initialization happen in app/actions/order.ts and lib/checkout.ts.
- Razorpay client creation is centralized in lib/razorpay.ts.
- Signature verification and payment confirmation happen in app/api/razorpay/verify/route.ts and lib/payment-processing.ts.
- Webhook handling is in app/api/razorpay/webhook/route.ts.

Core flow to explain
1. User starts at cart page and clicks "Proceed to Checkout".
2. Checkout form loads the Razorpay checkout script.
3. Form submission triggers placeOrder() server action.
4. Server action validates user and request payload.
5. Server creates or reuses a local order and pending payment entry.
6. Server reserves stock and computes totals in a DB transaction.
7. Server creates a Razorpay order via SDK with amount, currency, receipt.
8. Client receives razorpayOrderId, amount, keyId and opens the Razorpay checkout popup.
9. User completes payment in Razorpay UI.
10. Razorpay returns payment_id, order_id, and signature.
11. Client sends those to /api/razorpay/verify.
12. Server validates the user session and verifies the HMAC signature.
13. Server fetches the payment from Razorpay and confirms status is captured.
14. Server marks the local payment as PAID and order as CONFIRMED.
15. Server clears cart and redirects to order details.
16. Webhook endpoint handles async payment/refund events and relies on event idempotency.

Key concepts to emphasize
- The browser is untrusted; the server must validate everything.
- Payment verification is done using HMAC SHA256 with the Razorpay secret.
- The app stores its own order state in the database and only marks it paid after signature verification and payment confirmation.
- The local order is the business record; the Razorpay order is the gateway record.
- Stock reservation and order creation happen before payment confirmation.
- The system uses a transaction so status changes are atomic and consistent.
- Webhooks and verification both protect against missing or delayed payment events.

Important code references
- app/cart/page.tsx
- app/checkout/checkout-form.tsx
- app/actions/order.ts
- lib/checkout.ts
- lib/razorpay.ts
- app/api/razorpay/verify/route.ts
- lib/payment-processing.ts
- app/api/razorpay/webhook/route.ts

What to highlight in the explanation
- How data flows from UI to server and back.
- Why the order is created before the payment is confirmed.
- Why the signature validation is essential.
- Why there are both verification API and webhook API.
- Why the app uses DB transactions and checks for state transitions.
- Why `gatewayOrderId` and `gatewayPaymentId` are stored locally.
- Why the project uses `eventId` idempotency for webhook handling.

Good study questions
- Why does the app store the payment in the DB before Razorpay confirms it?
- Why is verifying the HMAC on the backend necessary?
- What does `processCapturedPayment()` check before updating status?
- Why is the order locked inside the database transaction?
- How do webhooks and route verification complement each other?
- What would happen if the client were trusted for payment success?

Output style
- Use clear step-by-step explanation.
- Keep it technical but readable.
- Prefer real code references and function names from the project.
- Use a diagram or sequence flow when helpful.
- Explain the security rationale, not just the syntax.

Optional refinement target
- Convert this into a learning note with sections: overview, request lifecycle, security checks, DB state transitions, webhook handling, and debugging checklist.
