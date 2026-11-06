"use client";

import { useActionState, useRef, useState } from "react";

import { useRouter } from "next/navigation";

import { useCart } from "@/app/providers/cart-provider";

import { placeOrder, type CheckoutState } from "@/app/actions/order";
import Script from "next/script";
type RazorpaySuccessResponse = {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
};

type RazorpayOptions = {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  order_id: string;
  handler: (response: RazorpaySuccessResponse) => void;
  modal: {
    ondismiss: () => void;
  };
};

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayOptions) => {
      open: () => void;
      on: (
        event: string,
        callback: (response: unknown) => void,
      ) => void;
    };
  }
}
type Address = {
  id: string;
  fullName: string;
  addressLine: string;
  city: string;
  state: string;
  postalCode: string;
  phone: string;
  isDefault: boolean;
};

type CheckoutFormProps = {
  addresses: Address[];
};

const initialState: CheckoutState = {};

export default function CheckoutForm({ addresses }: CheckoutFormProps) {
  const { isLoaded, items, totalAmount, clearCart } = useCart();

  const router = useRouter();

  const defaultAddress =
    addresses.find((address) => address.isDefault) ?? addresses[0];

  const [selectedAddressId, setSelectedAddressId] = useState(
    defaultAddress?.id ?? "",
  );

  const [shipping, setShipping] = useState({
    fullName: defaultAddress?.fullName ?? "",
    addressLine: defaultAddress?.addressLine ?? "",
    city: defaultAddress?.city ?? "",
    state: defaultAddress?.state ?? "",
    postalCode: defaultAddress?.postalCode ?? "",
    phone: defaultAddress?.phone ?? "",
  });

  const [state, formAction, pending] = useActionState(placeOrder, initialState);
  const checkoutKeyInput = useRef<HTMLInputElement>(null);
  const [checkoutError, setCheckoutError] = useState("");
  const [scriptReady, setScriptReady] = useState(false);

  async function completePayment(response: RazorpaySuccessResponse, orderId: string) {
    setCheckoutError("Verifying your payment…");
    try {
      const result = await fetch("/api/razorpay/verify", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ orderId, ...response }) });
      const data = await result.json();
      // if (!result.ok || !data.success) throw new Error(data.message ?? "Payment verification failed.");
      if (!result.ok || !data.success || data.status !== "PAID") {
        throw new Error(data.message ?? "Payment verification failed.");
      }
      clearCart();
      router.push(`/orders/${orderId}`);
    } catch (error) {
      setCheckoutError(error instanceof Error ? `${error.message} Your payment may still be processing; check your order before retrying.` : "Payment verification failed. Check your order before retrying.");
    }
  }

  function openRazorpayCheckout() {
    if (!state.orderId || !state.razorpayOrderId || !state.keyId || !state.amount) return;
    if (!window.Razorpay) { setCheckoutError("Payment window failed to load. Reload the page and try again."); return; }
    const instance = new window.Razorpay({
      key: state.keyId, amount: state.amount, currency: state.currency ?? "INR", name: "NovaCart", description: `Order ${state.orderId}`, order_id: state.razorpayOrderId,
      handler: (response) => { void completePayment(response, state.orderId!); },
      modal: { ondismiss: () => { setCheckoutError("Payment was not completed. Your order is reserved for 30 minutes; you can retry from the order page."); } },
    });
    instance.on("payment.failed", (event: unknown) => {
      const description = (event as { error?: { description?: string } })?.error?.description;
      setCheckoutError(description ?? "Payment failed. You can retry from your order page.");
    });
    instance.open();
  }

  function handleAddressChange(address: Address) {
    setSelectedAddressId(address.id);

    setShipping({
      fullName: address.fullName,
      addressLine: address.addressLine,
      city: address.city,
      state: address.state,
      postalCode: address.postalCode,
      phone: address.phone,
    });
  }

  if (!isLoaded) return <p role="status">Loading your cart…</p>;

  if (items.length === 0) {
    return <p className="mt-6 text-gray-600">Your cart is empty.</p>;
  }

  return (
    <div className="mt-8">
      {/* Order Summary */}
      <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="afterInteractive" onReady={() => setScriptReady(true)} />
      <div className="mb-8 rounded-lg border p-5">
        <h2 className="text-xl font-semibold">Order Summary</h2>

        <div className="mt-4 space-y-3">
          {items.map((item) => (
            <div key={item.id} className="flex justify-between">
              <span>
                {item.name} × {item.quantity}
              </span>

              <span>
                ₹{(item.price * item.quantity).toLocaleString("en-IN")}
              </span>
            </div>
          ))}
        </div>

        <div className="mt-5 border-t pt-4 text-right font-bold">
          Total: ₹{totalAmount.toLocaleString("en-IN")}
        </div>
      </div>

      {/* Saved Addresses */}

      {addresses.length > 0 && (
        <div className="mb-8">
          <h2 className="text-xl font-semibold">Saved Addresses</h2>

          <div className="mt-4 space-y-3">
            {addresses.map((address) => (
              <label
                key={address.id}
                className="flex cursor-pointer gap-3 rounded-lg border p-4"
              >
                <input
                  type="radio"
                  name="savedAddress"
                  value={address.id}
                  checked={selectedAddressId === address.id}
                  onChange={() => handleAddressChange(address)}
                />

                <div>
                  <p className="font-semibold">{address.fullName}</p>

                  <p className="text-sm text-gray-600">{address.addressLine}</p>

                  <p className="text-sm text-gray-600">
                    {address.city}, {address.state} {address.postalCode}
                  </p>

                  <p className="text-sm text-gray-600">{address.phone}</p>

                  {address.isDefault && (
                    <span className="text-xs font-semibold">Default</span>
                  )}
                </div>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Checkout Form */}

      <form action={formAction} onSubmit={() => { if (checkoutKeyInput.current && !checkoutKeyInput.current.value) checkoutKeyInput.current.value = window.crypto.randomUUID(); }} className="space-y-5">
        <input ref={checkoutKeyInput} type="hidden" name="checkoutKey" />
        <input
          type="hidden"
          name="items"
          value={JSON.stringify(
            items.map((item) => ({
              id: item.id,
              quantity: item.quantity,
            })),
          )}
        />

        <div>
          <label htmlFor="fullName" className="mb-1 block font-medium">
            Full Name
          </label>

          <input
            id="fullName"
            name="fullName"
            value={shipping.fullName}
            onChange={(e) =>
              setShipping({
                ...shipping,
                fullName: e.target.value,
              })
            }
            className="w-full rounded-lg border px-4 py-2"
          />
        </div>

        <div>
          <label htmlFor="addressLine" className="mb-1 block font-medium">
            Address
          </label>

          <textarea
            id="addressLine"
            name="addressLine"
            value={shipping.addressLine}
            onChange={(e) =>
              setShipping({
                ...shipping,
                addressLine: e.target.value,
              })
            }
            rows={3}
            className="w-full rounded-lg border px-4 py-2"
          />
        </div>

        <div>
          <label htmlFor="city" className="mb-1 block font-medium">
            City
          </label>

          <input
            id="city"
            name="city"
            value={shipping.city}
            onChange={(e) =>
              setShipping({
                ...shipping,
                city: e.target.value,
              })
            }
            className="w-full rounded-lg border px-4 py-2"
          />
        </div>

        <div>
          <label htmlFor="state" className="mb-1 block font-medium">
            State
          </label>

          <input
            id="state"
            name="state"
            value={shipping.state}
            onChange={(e) =>
              setShipping({
                ...shipping,
                state: e.target.value,
              })
            }
            className="w-full rounded-lg border px-4 py-2"
          />
        </div>

        <div>
          <label htmlFor="postalCode" className="mb-1 block font-medium">
            Postal Code
          </label>

          <input
            id="postalCode"
            name="postalCode"
            value={shipping.postalCode}
            onChange={(e) =>
              setShipping({
                ...shipping,
                postalCode: e.target.value,
              })
            }
            className="w-full rounded-lg border px-4 py-2"
          />
        </div>

        <div>
          <label htmlFor="phone" className="mb-1 block font-medium">
            Phone
          </label>

          <input
            id="phone"
            name="phone"
            value={shipping.phone}
            onChange={(e) =>
              setShipping({
                ...shipping,
                phone: e.target.value,
              })
            }
            className="w-full rounded-lg border px-4 py-2"
          />
        </div>

        {(state.message && !state.success || checkoutError) && (
          <p role="alert" className="text-sm text-red-600">{checkoutError || state.message}</p>
        )}

        <label className="flex items-center gap-2">
          <input type="checkbox" name="saveAddress" value="true" />

          <span>Save this address for future orders</span>
        </label>

        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-lg bg-black px-6 py-3 text-white disabled:opacity-50"
        >
          {pending ? "Preparing secure payment…" : "Pay securely with Razorpay"}
        </button>
      </form>
      {state.success && state.orderId && state.razorpayOrderId && <button type="button" onClick={openRazorpayCheckout} disabled={!scriptReady} className="mt-4 w-full rounded-lg bg-emerald-700 px-6 py-3 text-white disabled:opacity-50">{scriptReady ? "Continue to Razorpay" : "Loading secure payment…"}</button>}
    </div>
  );
}
