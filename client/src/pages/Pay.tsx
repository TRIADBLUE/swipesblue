import { useState, useEffect } from "react";
import { useParams } from "wouter";
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";

interface SessionData {
  id: string;
  amount: number;
  currency: string;
  description: string;
  customerEmail: string;
  status: string;
  clientSecret: string;
  successUrl: string;
  cancelUrl: string;
}

function PaymentForm({
  session,
  onSuccess,
}: {
  session: SessionData;
  onSuccess: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setProcessing(true);
    setError(null);

    const result = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: session.successUrl.replace("{SESSION_ID}", session.id),
        receipt_email: session.customerEmail,
      },
    });

    if (result.error) {
      setError(result.error.message || "Payment failed. Please try again.");
      setProcessing(false);
    } else {
      onSuccess();
    }
  };

  const formatAmount = (cents: number, currency: string) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency.toUpperCase(),
    }).format(cents / 100);
  };

  return (
    <form onSubmit={handleSubmit} className="pay-form">
      <div className="pay-summary">
        <p className="pay-description">{session.description}</p>
        <p className="pay-amount">
          {formatAmount(session.amount, session.currency)}
        </p>
      </div>

      <div className="pay-email">
        <span className="pay-email-label">Email</span>
        <span className="pay-email-value">{session.customerEmail}</span>
      </div>

      <div className="pay-element-container">
        <PaymentElement />
      </div>

      {error && <div className="pay-error">{error}</div>}

      <button
        type="submit"
        disabled={!stripe || processing}
        className="pay-submit"
      >
        {processing
          ? "Processing..."
          : `Pay ${formatAmount(session.amount, session.currency)}`}
      </button>

      <button
        type="button"
        onClick={() => {
          window.location.href = session.cancelUrl;
        }}
        className="pay-cancel"
      >
        Cancel
      </button>
    </form>
  );
}

export default function Pay() {
  const params = useParams<{ sessionId: string }>();
  const [session, setSession] = useState<SessionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [completed, setCompleted] = useState(false);
  const [stripePromise, setStripePromise] = useState<ReturnType<
    typeof loadStripe
  > | null>(null);

  useEffect(() => {
    // Load Stripe with the publishable key injected server-side
    const key = (window as any).__STRIPE_PUBLISHABLE_KEY__;
    if (key) {
      setStripePromise(loadStripe(key));
    }
  }, []);

  useEffect(() => {
    async function fetchSession() {
      try {
        const response = await fetch(
          `/api/v1/checkout/sessions/${params.sessionId}`,
        );
        if (!response.ok) {
          if (response.status === 404) {
            setError("This payment session has expired or was already completed.");
          } else {
            setError("Failed to load payment session.");
          }
          return;
        }
        const data = await response.json();
        setSession(data);
      } catch {
        setError("Failed to load payment session.");
      } finally {
        setLoading(false);
      }
    }
    fetchSession();
  }, [params.sessionId]);

  const handleSuccess = () => {
    setCompleted(true);

    // Notify parent iframe
    try {
      window.parent.postMessage(
        {
          event: "payment.completed",
          sessionId: params.sessionId,
        },
        "*",
      );
    } catch {
      // Not in an iframe — no-op
    }
  };

  if (loading) {
    return (
      <div className="pay-container">
        <div className="pay-card">
          <div className="pay-loading">Loading payment details...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="pay-container">
        <div className="pay-card">
          <div className="pay-error-page">
            <h2>Payment Unavailable</h2>
            <p>{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (completed) {
    return (
      <div className="pay-container">
        <div className="pay-card">
          <div className="pay-success">
            <div className="pay-success-icon">&#10003;</div>
            <h2>Payment Successful</h2>
            <p>Your payment has been processed. You will be redirected shortly.</p>
          </div>
        </div>
      </div>
    );
  }

  if (!session || !stripePromise) {
    return (
      <div className="pay-container">
        <div className="pay-card">
          <div className="pay-loading">Initializing payment...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="pay-container">
      <div className="pay-card">
        <div className="pay-header">
          <div className="pay-logo">
            <span className="pay-logo-slash">/</span>
            <span className="pay-logo-text">swipesblue</span>
          </div>
          <span className="pay-secure">Secure Checkout</span>
        </div>

        <Elements
          stripe={stripePromise}
          options={{
            clientSecret: session.clientSecret,
            appearance: {
              theme: "stripe",
              variables: {
                colorPrimary: "#09080E",
                fontFamily: "Archivo, system-ui, sans-serif",
              },
            },
          }}
        >
          <PaymentForm session={session} onSuccess={handleSuccess} />
        </Elements>

        <div className="pay-footer">
          <p>Powered by swipesblue.com</p>
        </div>
      </div>

      <style>{`
        .pay-container {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #f6f9fc;
          padding: 20px;
          font-family: Archivo, system-ui, sans-serif;
        }
        .pay-card {
          background: white;
          border-radius: 12px;
          box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
          max-width: 480px;
          width: 100%;
          padding: 32px;
        }
        .pay-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 24px;
          padding-bottom: 16px;
          border-bottom: 1px solid #e5e7eb;
        }
        .pay-logo {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 18px;
          font-weight: 600;
        }
        .pay-logo-slash {
          color: #09080E;
          font-weight: 700;
        }
        .pay-logo-text {
          color: #09080E;
        }
        .pay-secure {
          font-size: 12px;
          color: #6b7280;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .pay-summary {
          text-align: center;
          margin-bottom: 24px;
        }
        .pay-description {
          color: #374151;
          font-size: 16px;
          margin: 0 0 8px 0;
        }
        .pay-amount {
          font-size: 32px;
          font-weight: 700;
          color: #09080E;
          margin: 0;
        }
        .pay-email {
          display: flex;
          justify-content: space-between;
          padding: 12px 0;
          border-top: 1px solid #f3f4f6;
          border-bottom: 1px solid #f3f4f6;
          margin-bottom: 20px;
          font-size: 14px;
        }
        .pay-email-label {
          color: #6b7280;
        }
        .pay-email-value {
          color: #111827;
        }
        .pay-element-container {
          margin-bottom: 20px;
        }
        .pay-error {
          background: #fef2f2;
          color: #dc2626;
          padding: 12px;
          border-radius: 8px;
          font-size: 14px;
          margin-bottom: 16px;
        }
        .pay-submit {
          width: 100%;
          padding: 14px;
          background: #09080E;
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          margin-bottom: 8px;
          font-family: inherit;
        }
        .pay-submit:hover:not(:disabled) {
          background: #1a1a2e;
        }
        .pay-submit:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        .pay-cancel {
          width: 100%;
          padding: 12px;
          background: transparent;
          color: #6b7280;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          font-size: 14px;
          cursor: pointer;
          font-family: inherit;
        }
        .pay-cancel:hover {
          background: #f9fafb;
        }
        .pay-footer {
          text-align: center;
          margin-top: 20px;
          padding-top: 16px;
          border-top: 1px solid #f3f4f6;
        }
        .pay-footer p {
          font-size: 12px;
          color: #9ca3af;
          margin: 0;
        }
        .pay-loading {
          text-align: center;
          padding: 40px;
          color: #6b7280;
          font-size: 14px;
        }
        .pay-error-page {
          text-align: center;
          padding: 20px;
        }
        .pay-error-page h2 {
          color: #111827;
          margin-bottom: 8px;
        }
        .pay-error-page p {
          color: #6b7280;
        }
        .pay-success {
          text-align: center;
          padding: 20px;
        }
        .pay-success-icon {
          width: 48px;
          height: 48px;
          background: #10b981;
          color: white;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 24px;
          margin: 0 auto 16px;
        }
        .pay-success h2 {
          color: #111827;
          margin-bottom: 8px;
        }
        .pay-success p {
          color: #6b7280;
        }
      `}</style>
    </div>
  );
}
