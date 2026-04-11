/**
 * Checkout Session Service
 *
 * Creates hosted and embedded checkout sessions for partner platforms.
 * Uses SwipesBlue's own payment gateway credentials internally.
 * No gateway-specific details are ever exposed to calling platforms.
 */

import Stripe from "stripe";
import crypto from "crypto";
import { storage } from "../storage";
import type { CheckoutSession } from "@shared/schema";

// Initialize gateway client — credentials stay in SwipesBlue's environment only
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "");

export interface CreateCheckoutRequest {
  mode?: "redirect" | "embedded";
  amount: number; // in cents
  currency: string;
  description: string;
  customerEmail: string;
  metadata?: Record<string, any>;
  successUrl: string;
  cancelUrl: string;
  webhookUrl?: string;
}

export interface CreateCheckoutResponse {
  id: string;
  url: string;
  mode?: string;
}

/**
 * Create a new checkout session for a partner platform.
 */
export async function createCheckoutSession(
  request: CreateCheckoutRequest,
  platform: string,
  apiKeyId: string,
): Promise<CreateCheckoutResponse> {
  const mode = request.mode || "redirect";

  // Create the gateway checkout session
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ["card"],
    mode: "payment",
    customer_email: request.customerEmail,
    line_items: [
      {
        price_data: {
          currency: request.currency,
          product_data: {
            name: request.description,
          },
          unit_amount: request.amount,
        },
        quantity: 1,
      },
    ],
    success_url: request.successUrl.replace("{SESSION_ID}", "{CHECKOUT_SESSION_ID}"),
    cancel_url: request.cancelUrl,
    metadata: {
      ...(request.metadata || {}),
      webhookUrl: request.webhookUrl || "",
      platform: platform,
      apiKeyId: apiKeyId,
    },
  });

  // Store checkout session in our database
  const dbSession = await storage.createCheckoutSession({
    platform,
    apiKeyId,
    gatewaySessionId: session.id,
    mode,
    amount: request.amount,
    currency: request.currency,
    description: request.description,
    customerEmail: request.customerEmail,
    successUrl: request.successUrl,
    cancelUrl: request.cancelUrl,
    webhookUrl: request.webhookUrl || null,
    metadata: request.metadata || null,
    status: "pending",
  });

  if (mode === "embedded") {
    // Return a SwipesBlue-hosted payment page URL
    const baseUrl = process.env.NODE_ENV === "production"
      ? "https://swipesblue.com"
      : `http://localhost:${process.env.PORT || 5000}`;

    return {
      id: dbSession.id,
      url: `${baseUrl}/pay/${dbSession.id}`,
      mode: "embedded",
    };
  }

  // Redirect mode — return the gateway's hosted checkout URL
  return {
    id: dbSession.id,
    url: session.url!,
  };
}

/**
 * Handle a completed checkout event from the payment gateway webhook.
 */
export async function handleCheckoutCompleted(
  gatewaySessionId: string,
): Promise<void> {
  // Look up the checkout session
  const session = await storage.getCheckoutSessionByGatewayId(gatewaySessionId);
  if (!session) {
    console.error(`No checkout session found for gateway session: ${gatewaySessionId}`);
    return;
  }

  // Get payment details from the gateway
  const gatewaySession = await stripe.checkout.sessions.retrieve(gatewaySessionId, {
    expand: ["payment_intent.payment_method"],
  });

  // Extract card details
  let cardBrand: string | null = null;
  let cardLastFour: string | null = null;
  let paymentMethod: string | null = "card";

  const paymentIntent = gatewaySession.payment_intent as Stripe.PaymentIntent | null;
  if (paymentIntent) {
    const pm = paymentIntent.payment_method as Stripe.PaymentMethod | null;
    if (pm?.card) {
      cardBrand = pm.card.brand || null;
      cardLastFour = pm.card.last4 || null;
    }
  }

  // Update the checkout session as completed
  await storage.updateCheckoutSession(session.id, {
    status: "completed",
    cardBrand,
    cardLastFour,
    paymentMethod,
    paidAt: new Date(),
  });

  // Forward confirmation to partner's webhook URL
  if (session.webhookUrl) {
    const payload = {
      event: "payment.completed",
      sessionId: session.id,
      amount: session.amount,
      currency: session.currency,
      customerEmail: session.customerEmail,
      metadata: session.metadata,
      paidAt: new Date().toISOString(),
    };

    try {
      const payloadString = JSON.stringify(payload);

      // Look up the API key's secret for HMAC signing
      const apiKey = await storage.getApiKey(session.apiKeyId);
      const signingSecret = apiKey?.apiSecret;

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        "User-Agent": "SwipesBlue-Webhook/1.0",
        "X-Webhook-Event": "payment.completed",
        "X-Webhook-Timestamp": new Date().toISOString(),
      };

      if (signingSecret) {
        const signature = crypto
          .createHmac("sha256", signingSecret)
          .update(payloadString)
          .digest("hex");
        headers["X-Swipesblue-Signature"] = signature;
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const response = await fetch(session.webhookUrl, {
        method: "POST",
        headers,
        body: payloadString,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        console.error(
          `[Checkout] Webhook forward to ${session.webhookUrl} returned ${response.status}`,
        );
      }
    } catch (err) {
      console.error(`[Checkout] Failed to forward webhook to ${session.webhookUrl}:`, err);
    }
  }
}

/**
 * Handle a failed or expired checkout event from the payment gateway webhook.
 */
export async function handleCheckoutFailed(
  gatewaySessionId: string,
): Promise<void> {
  const session = await storage.getCheckoutSessionByGatewayId(gatewaySessionId);
  if (!session) return;

  await storage.updateCheckoutSession(session.id, { status: "failed" });

  if (session.webhookUrl) {
    const payload = {
      event: "payment.failed",
      sessionId: session.id,
      amount: session.amount,
      currency: session.currency,
      customerEmail: session.customerEmail,
      metadata: session.metadata,
      failedAt: new Date().toISOString(),
    };

    try {
      const payloadString = JSON.stringify(payload);
      const apiKey = await storage.getApiKey(session.apiKeyId);
      const signingSecret = apiKey?.apiSecret;

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        "User-Agent": "SwipesBlue-Webhook/1.0",
        "X-Webhook-Event": "payment.failed",
        "X-Webhook-Timestamp": new Date().toISOString(),
      };

      if (signingSecret) {
        headers["X-Swipesblue-Signature"] = crypto
          .createHmac("sha256", signingSecret)
          .update(payloadString)
          .digest("hex");
      }

      await fetch(session.webhookUrl, {
        method: "POST",
        headers,
        body: payloadString,
      });
    } catch (err) {
      console.error(`[Checkout] Failed to forward failure webhook:`, err);
    }
  }
}

/**
 * Verify a gateway webhook signature.
 */
export function constructWebhookEvent(
  rawBody: string | Buffer,
  signature: string,
): Stripe.Event {
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!endpointSecret) {
    throw new Error("STRIPE_WEBHOOK_SECRET is not configured");
  }
  return stripe.webhooks.constructEvent(rawBody, signature, endpointSecret);
}

/**
 * Get a checkout session for the embedded payment page.
 */
export async function getCheckoutSessionForPayment(
  sessionId: string,
): Promise<{ session: CheckoutSession; clientSecret: string } | null> {
  const session = await storage.getCheckoutSession(sessionId);
  if (!session || session.status !== "pending") {
    return null;
  }

  // Get the gateway session to retrieve the payment intent client secret
  if (!session.gatewaySessionId) return null;

  const gatewaySession = await stripe.checkout.sessions.retrieve(session.gatewaySessionId);
  const paymentIntentId = gatewaySession.payment_intent as string;

  if (!paymentIntentId) return null;

  const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

  return {
    session,
    clientSecret: paymentIntent.client_secret!,
  };
}
