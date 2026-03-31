import type { Express } from "express";
import { createServer, type Server } from "http";
import rateLimit from "express-rate-limit";
import { doubleCsrf } from "csrf-csrf";
import { storage } from "./storage";
import {
  insertProductSchema,
  insertCartItemSchema,
  insertOrderSchema,
  insertOrderItemSchema,
  insertPaymentGatewaySchema,
  insertPaymentTransactionSchema,
  insertMerchantSchema,
  insertCustomerAccountSchema,
  insertCustomerPaymentMethodSchema,
  insertCustomerSupportTicketSchema,
  insertSecuritySettingsSchema,
  insertFraudScoreSchema,
  insertDeviceFingerprintSchema,
  insertChargebackAlertSchema,
  insertCheckoutSettingsSchema,
  insertAbTestSchema,
  insertAbTestResultSchema,
  insertCheckoutAnalyticsSchema,
  insertSavedCartSchema,
  insertCartRecommendationSchema,
  insertCartNoteSchema,
  insertInventoryReservationSchema,
  insertAnalyticsDailySchema,
  insertAnalyticsProductsSchema,
  insertCustomerLtvSchema,
  insertScheduledReportSchema,
  insertBrandSettingsSchema,
  insertEmailTemplateSchema,
  insertReceiptSettingsSchema,
  insertMerchantSubscriptionSchema,
  insertAddonSubscriptionSchema,
  insertApiLogSchema,
  insertCustomerVaultSchema,
  insertVaultPaymentMethodSchema,
  type InsertOrderItem,
} from "@shared/schema";
import { z } from "zod";
import { NMIPaymentGateway } from "./payment-gateways/nmi";
import { NMIPartnerService } from "./services/nmi-partner";
import { MerchantPaymentService, type MerchantPaymentRequest } from "./services/merchant-payment";
import { CustomerVaultService } from "./services/customer-vault";
import { requireApiKey, requirePermission, generateApiKey, generateApiSecret, type AuthenticatedRequest } from "./middleware/api-auth";
import { webhookService, WebhookEventType } from "./services/webhook";
import { normalizeTier, meetsMinTier as sharedMeetsMinTier, TIER_PRODUCT_LIMITS as SHARED_TIER_PRODUCT_LIMITS } from "@shared/tier-constants";

// Rate limiters
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  message: { error: "Too many login attempts. Try again in 15 minutes." },
  standardHeaders: true,
  legacyHeaders: false,
});

const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100,
  message: { error: "Too many requests. Slow down." },
  standardHeaders: true,
  legacyHeaders: false,
});

const paymentLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30,
  message: { error: "Too many payment requests. Try again shortly." },
  standardHeaders: true,
  legacyHeaders: false,
});

// CSRF protection for session-based state-changing routes
// NOTE: Frontend must fetch /api/csrf-token and include the token in the x-csrf-token header
// for all POST/PUT/PATCH/DELETE requests to session-based endpoints. Will be wired in a future prompt.
const { doubleCsrfProtection, generateCsrfToken } = doubleCsrf({
  getSecret: () => process.env.CSRF_SECRET || "swipesblue-csrf-secret-change-in-production",
  getSessionIdentifier: (req) => (req as any).sessionID || "",
  cookieName: "__csrf",
  cookieOptions: {
    httpOnly: true,
    sameSite: "strict" as const,
    secure: process.env.NODE_ENV === "production",
  },
  getCsrfTokenFromRequest: (req) => req.headers["x-csrf-token"] as string || null,
});

export async function registerRoutes(app: Express): Promise<Server> {
  // CSRF token endpoint
  app.get("/api/csrf-token", (req, res) => {
    // Ensure session exists so the CSRF token can bind to it
    if (!(req.session as any).initialized) {
      (req.session as any).initialized = true;
    }
    const token = generateCsrfToken(req, res);
    res.json({ token });
  });

  // Session helper to get session ID from express-session
  function getSessionId(req: any): string {
    if (!req.session) {
      throw new Error("Session not initialized");
    }
    // Use the session ID provided by express-session
    // When saveUninitialized is false, we need to ensure the session exists
    // by setting a property on it
    if (!req.session.initialized) {
      req.session.initialized = true;
    }
    return req.sessionID;
  }

  // Products endpoints
  app.get("/api/products", async (_req, res) => {
    try {
      const products = await storage.getAllProducts();
      res.json(products);
    } catch (error) {
      console.error("Error fetching products:", error);
      res.status(500).json({ message: "Failed to fetch products" });
    }
  });

  app.get("/api/products/search", async (req, res) => {
    try {
      const { q } = req.query;
      if (!q || typeof q !== "string") {
        return res.status(400).json({ message: "Search query is required" });
      }
      const products = await storage.searchProducts(q);
      res.json(products);
    } catch (error) {
      console.error("Error searching products:", error);
      res.status(500).json({ message: "Failed to search products" });
    }
  });

  app.get("/api/products/category/:category", async (req, res) => {
    try {
      const { category } = req.params;
      const products = await storage.getProductsByCategory(category);
      res.json(products);
    } catch (error) {
      console.error("Error fetching products by category:", error);
      res.status(500).json({ message: "Failed to fetch products" });
    }
  });

  app.get("/api/products/:id", async (req, res) => {
    try {
      const product = await storage.getProduct(req.params.id);
      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }
      res.json(product);
    } catch (error) {
      console.error("Error fetching product:", error);
      res.status(500).json({ message: "Failed to fetch product" });
    }
  });

  app.post("/api/products", async (req, res) => {
    try {
      const validatedData = insertProductSchema.parse(req.body);
      const product = await storage.createProduct(validatedData);
      res.status(201).json(product);
    } catch (error) {
      console.error("Error creating product:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid product data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create product" });
    }
  });

  app.patch("/api/products/:id", async (req, res) => {
    try {
      const product = await storage.updateProduct(req.params.id, req.body);
      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }
      res.json(product);
    } catch (error) {
      console.error("Error updating product:", error);
      res.status(500).json({ message: "Failed to update product" });
    }
  });

  app.delete("/api/products/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteProduct(req.params.id);
      if (!deleted) {
        return res.status(404).json({ message: "Product not found" });
      }
      res.json({ message: "Product deleted successfully" });
    } catch (error) {
      console.error("Error deleting product:", error);
      res.status(500).json({ message: "Failed to delete product" });
    }
  });

  // Add-on Products endpoints
  app.get("/api/add-ons", async (_req, res) => {
    try {
      const addOns = await storage.getActiveAddOnProducts();
      res.json(addOns);
    } catch (error) {
      console.error("Error fetching add-on products:", error);
      res.status(500).json({ message: "Failed to fetch add-on products" });
    }
  });

  app.get("/api/add-ons/:slug", async (req, res) => {
    try {
      const addOn = await storage.getAddOnProductBySlug(req.params.slug);
      if (!addOn) {
        return res.status(404).json({ message: "Add-on product not found" });
      }
      res.json(addOn);
    } catch (error) {
      console.error("Error fetching add-on product:", error);
      res.status(500).json({ message: "Failed to fetch add-on product" });
    }
  });

  // Cart endpoints
  app.get("/api/cart", async (req, res) => {
    try {
      const sessionId = getSessionId(req);
      const items = await storage.getCartItemsWithProducts(sessionId);
      res.json(items);
    } catch (error) {
      console.error("Error fetching cart:", error);
      res.status(500).json({ message: "Failed to fetch cart" });
    }
  });

  app.post("/api/cart", doubleCsrfProtection, async (req, res) => {
    try {
      const sessionId = getSessionId(req);
      const validatedData = insertCartItemSchema.parse({
        ...req.body,
        sessionId,
      });
      const item = await storage.addToCart(validatedData);
      res.status(201).json(item);
    } catch (error) {
      console.error("Error adding to cart:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid cart item data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to add to cart" });
    }
  });

  app.patch("/api/cart/:id", doubleCsrfProtection, async (req, res) => {
    try {
      const { quantity } = req.body;
      if (typeof quantity !== "number" || quantity < 1) {
        return res.status(400).json({ message: "Invalid quantity" });
      }
      const item = await storage.updateCartItemQuantity(req.params.id, quantity);
      if (!item) {
        return res.status(404).json({ message: "Cart item not found" });
      }
      res.json(item);
    } catch (error) {
      console.error("Error updating cart item:", error);
      res.status(500).json({ message: "Failed to update cart item" });
    }
  });

  app.delete("/api/cart/:id", doubleCsrfProtection, async (req, res) => {
    try {
      const deleted = await storage.removeFromCart(req.params.id);
      if (!deleted) {
        return res.status(404).json({ message: "Cart item not found" });
      }
      res.json({ message: "Item removed from cart" });
    } catch (error) {
      console.error("Error removing from cart:", error);
      res.status(500).json({ message: "Failed to remove from cart" });
    }
  });

  app.delete("/api/cart", doubleCsrfProtection, async (req, res) => {
    try {
      const sessionId = getSessionId(req);
      await storage.clearCart(sessionId);
      res.json({ message: "Cart cleared" });
    } catch (error) {
      console.error("Error clearing cart:", error);
      res.status(500).json({ message: "Failed to clear cart" });
    }
  });

  // Orders endpoints
  app.get("/api/orders", async (req, res) => {
    try {
      const sessionId = getSessionId(req);
      const orders = await storage.getOrdersBySession(sessionId);
      res.json(orders);
    } catch (error) {
      console.error("Error fetching orders:", error);
      res.status(500).json({ message: "Failed to fetch orders" });
    }
  });

  app.get("/api/orders/:id", async (req, res) => {
    try {
      const order = await storage.getOrder(req.params.id);
      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }
      const items = await storage.getOrderItems(order.id);
      res.json({ ...order, items });
    } catch (error) {
      console.error("Error fetching order:", error);
      res.status(500).json({ message: "Failed to fetch order" });
    }
  });

  app.post("/api/orders", async (req, res) => {
    try {
      const sessionId = getSessionId(req);
      
      const orderItemInputSchema = insertOrderItemSchema.omit({ orderId: true });
      
      const orderSchema = insertOrderSchema.extend({
        items: z.array(orderItemInputSchema),
        payment: z.object({
          paymentToken: z.string().min(1, "Payment token required"),
          cardholderName: z.string().optional(),
        }),
      });

      const validatedData = orderSchema.parse({
        ...req.body,
        sessionId,
      });

      const { items: orderItemsData, payment, ...orderData } = validatedData;

      const gateway = await storage.getDefaultPaymentGateway();
      if (!gateway) {
        return res.status(400).json({ message: "No payment gateway configured" });
      }

      const nmiGateway = new NMIPaymentGateway();
      const nameParts = (payment.cardholderName || orderData.customerName || "").trim().split(/\s+/);

      const paymentResult = await nmiGateway.sale({
        paymentToken: payment.paymentToken,
        amount: parseFloat(orderData.total as string),
        email: orderData.customerEmail,
        firstName: nameParts[0] || "",
        lastName: nameParts.slice(1).join(" ") || "",
        address1: orderData.shippingAddress,
        city: orderData.shippingCity,
        state: orderData.shippingState,
        zip: orderData.shippingZip,
      });

      if (!paymentResult.success) {
        return res.status(400).json({
          message: "Payment failed",
          error: paymentResult.errorMessage
        });
      }

      const order = await storage.createOrder(orderData, orderItemsData as InsertOrderItem[]);

      await storage.updateOrderPaymentStatus(order.id, "paid");

      const cardLastFour = paymentResult.rawResponse?.cc_number?.slice(-4);

      await storage.createPaymentTransaction({
        orderId: order.id,
        gatewayId: gateway.id,
        gatewayTransactionId: paymentResult.transactionId,
        amount: orderData.total,
        status: "success",
        paymentMethod: cardLastFour ? `****${cardLastFour}` : "card",
        gatewayResponse: paymentResult.rawResponse,
      });

      await storage.clearCart(sessionId);

      res.status(201).json({ ...order, transactionId: paymentResult.transactionId });
    } catch (error) {
      console.error("Error creating order:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid order data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create order" });
    }
  });

  // Dashboard Virtual Terminal — process a card-not-present payment
  app.post("/api/dashboard/terminal/charge", paymentLimiter, async (req, res) => {
    try {
      const terminalSchema = z.object({
        amount: z.number().positive("Amount must be positive"),
        paymentToken: z.string().min(1, "Payment token required"),
        cardholderName: z.string().optional(),
        email: z.string().email().optional(),
        billingAddress: z.object({
          address: z.string(),
          city: z.string(),
          state: z.string(),
          zip: z.string(),
          country: z.string().optional(),
        }).optional(),
        description: z.string().optional(),
        orderId: z.string().optional(),
        invoiceNumber: z.string().optional(),
        type: z.enum(["sale", "auth"]).default("sale"),
      });

      const data = terminalSchema.parse(req.body);
      const nmiGateway = new NMIPaymentGateway();

      const nameParts = (data.cardholderName || "").trim().split(/\s+/);

      const params = {
        paymentToken: data.paymentToken,
        amount: data.amount,
        email: data.email,
        firstName: nameParts[0] || "",
        lastName: nameParts.slice(1).join(" ") || "",
        address1: data.billingAddress?.address,
        city: data.billingAddress?.city,
        state: data.billingAddress?.state,
        zip: data.billingAddress?.zip,
        country: data.billingAddress?.country,
        description: data.description,
        orderId: data.orderId,
        invoiceNumber: data.invoiceNumber,
      };

      const result = data.type === "auth"
        ? await nmiGateway.authorize(params)
        : await nmiGateway.sale(params);

      if (!result.success) {
        // Save declined transaction if merchant is logged in
        const merchantId = (req.session as any)?.merchantId;
        if (merchantId) {
          try {
            await storage.createMerchantTransaction({
              merchantId,
              transactionId: result.transactionId || null,
              amount: String(data.amount),
              currency: "USD",
              status: "declined",
              type: data.type,
              customerName: data.cardholderName || null,
              cardBrand: result.rawResponse?.cc_type || result.rawResponse?.card_type || null,
              cardLastFour: result.rawResponse?.cc_number?.slice(-4) || null,
              authCode: null,
              email: data.email || null,
              description: data.description || null,
              orderId: data.orderId || null,
            });
          } catch (e) {
            console.error("Failed to save declined transaction:", e);
          }
        }
        return res.status(400).json({
          success: false,
          error: result.errorMessage || "Transaction declined",
        });
      }

      // Save approved transaction if merchant is logged in
      const merchantId = (req.session as any)?.merchantId;
      const cardBrand = result.rawResponse?.cc_type || result.rawResponse?.card_type || null;
      const cardLastFour = result.rawResponse?.cc_number?.slice(-4) || null;

      if (merchantId) {
        try {
          await storage.createMerchantTransaction({
            merchantId,
            transactionId: result.transactionId || null,
            amount: String(data.amount),
            currency: "USD",
            status: "approved",
            type: data.type,
            customerName: data.cardholderName || null,
            cardBrand,
            cardLastFour,
            authCode: result.authCode || null,
            email: data.email || null,
            description: data.description || null,
            orderId: data.orderId || null,
          });
        } catch (e) {
          console.error("Failed to save transaction:", e);
        }
      }

      res.json({
        success: true,
        transactionId: result.transactionId,
        authCode: result.authCode,
        amount: data.amount,
        type: data.type,
        cardBrand,
        cardLastFour,
        message: result.message || "Transaction approved",
      });
    } catch (error) {
      console.error("Terminal charge error:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid request", errors: error.errors });
      }
      res.status(500).json({ error: "Failed to process terminal transaction" });
    }
  });

  // Payment gateways endpoints
  app.get("/api/payment-gateways", async (_req, res) => {
    try {
      const gateways = await storage.getAllPaymentGateways();
      res.json(gateways.map(g => ({ ...g, config: undefined })));
    } catch (error) {
      console.error("Error fetching payment gateways:", error);
      res.status(500).json({ message: "Failed to fetch payment gateways" });
    }
  });

  app.get("/api/payment-gateways/default", async (_req, res) => {
    try {
      const gateway = await storage.getDefaultPaymentGateway();
      if (!gateway) {
        return res.status(404).json({ message: "No default payment gateway configured" });
      }
      res.json({ ...gateway, config: undefined });
    } catch (error) {
      console.error("Error fetching default gateway:", error);
      res.status(500).json({ message: "Failed to fetch default gateway" });
    }
  });

  app.post("/api/payment-gateways", async (req, res) => {
    try {
      const validatedData = insertPaymentGatewaySchema.parse(req.body);
      const gateway = await storage.createPaymentGateway(validatedData);
      res.status(201).json({ ...gateway, config: undefined });
    } catch (error) {
      console.error("Error creating payment gateway:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid gateway data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create payment gateway" });
    }
  });

  app.patch("/api/payment-gateways/:id", async (req, res) => {
    try {
      const gateway = await storage.updatePaymentGateway(req.params.id, req.body);
      if (!gateway) {
        return res.status(404).json({ message: "Payment gateway not found" });
      }
      res.json({ ...gateway, config: undefined });
    } catch (error) {
      console.error("Error updating payment gateway:", error);
      res.status(500).json({ message: "Failed to update payment gateway" });
    }
  });

  app.post("/api/payment-gateways/:id/set-default", async (req, res) => {
    try {
      const gateway = await storage.setDefaultGateway(req.params.id);
      if (!gateway) {
        return res.status(404).json({ message: "Payment gateway not found" });
      }
      res.json({ ...gateway, config: undefined });
    } catch (error) {
      console.error("Error setting default gateway:", error);
      res.status(500).json({ message: "Failed to set default gateway" });
    }
  });

  // Transactions endpoints
  app.get("/api/transactions", async (_req, res) => {
    try {
      const transactions = await storage.getAllTransactions();
      res.json(transactions);
    } catch (error) {
      console.error("Error fetching transactions:", error);
      res.status(500).json({ message: "Failed to fetch transactions" });
    }
  });

  app.get("/api/transactions/order/:orderId", async (req, res) => {
    try {
      const transactions = await storage.getTransactionsByOrder(req.params.orderId);
      res.json(transactions);
    } catch (error) {
      console.error("Error fetching transactions:", error);
      res.status(500).json({ message: "Failed to fetch transactions" });
    }
  });

  // Merchant Management API endpoints (Partner API v1)

  // Create a new merchant account via NMI Partner API
  app.post("/api/v1/merchants/create", async (req, res) => {
    try {
      // Validate the merchant boarding request
      const merchantBoardingSchema = z.object({
        businessName: z.string().min(1, "Business name is required"),
        businessEmail: z.string().email("Valid email is required"),
        businessPhone: z.string().optional(),
        businessAddress: z.string().optional(),
        businessCity: z.string().optional(),
        businessState: z.string().optional(),
        businessZip: z.string().optional(),
        businessCountry: z.string().default("US"),
        platform: z.enum(["businessblueprint", "hostsblue", "swipesblue"]),
        platformClientId: z.string().min(1, "Platform client ID is required"),
        dba: z.string().optional(),
        website: z.string().url().optional(),
        taxId: z.string().optional(),
        businessType: z.string().optional(),
        merchantCategoryCode: z.string().optional(),
        annualVolume: z.number().optional(),
        averageTicket: z.number().optional(),
        highTicket: z.number().optional(),
      });

      const validatedData = merchantBoardingSchema.parse(req.body);

      // Check if merchant already exists for this platform client
      const existingMerchant = await storage.getMerchantByPlatformClientId(
        validatedData.platform,
        validatedData.platformClientId
      );

      if (existingMerchant) {
        return res.status(409).json({
          message: "Merchant already exists for this platform client",
          merchantId: existingMerchant.id,
          status: existingMerchant.status,
        });
      }

      // Create gateway account via NMI Boarding API
      const nmiPartnerService = new NMIPartnerService();

      // Split contact name for NMI (requires first/last separately)
      const contactName = validatedData.businessName.split(/\s+/);
      const contactFirstName = contactName[0] || validatedData.businessName;
      const contactLastName = contactName.slice(1).join(" ") || validatedData.businessName;

      let gatewayAccount;
      try {
        gatewayAccount = await nmiPartnerService.createGatewayAccount({
          company: validatedData.businessName,
          address_1: validatedData.businessAddress || "",
          city: validatedData.businessCity || "",
          state: validatedData.businessState || "",
          postal: validatedData.businessZip || "",
          country: validatedData.businessCountry,
          url: validatedData.website,
          timezone_id: 1, // US Eastern default
          contact_first_name: contactFirstName,
          contact_last_name: contactLastName,
          contact_phone: validatedData.businessPhone || "",
          contact_email: validatedData.businessEmail,
          username: `${validatedData.platform}_${validatedData.platformClientId}`,
          external_identifier: validatedData.platformClientId,
        });
      } catch (nmiError) {
        return res.status(400).json({
          message: "Failed to create NMI gateway account",
          error: nmiError instanceof Error ? nmiError.message : "Unknown boarding error",
        });
      }

      // Store merchant in database with NMI gateway ID
      const partnerId = process.env.NMI_PARTNER_ID || "";
      const merchant = await storage.createMerchant({
        platform: validatedData.platform,
        platformClientId: validatedData.platformClientId,
        nmiMerchantId: String(gatewayAccount.id),
        partnerId,
        businessName: validatedData.businessName,
        businessEmail: validatedData.businessEmail,
        businessPhone: validatedData.businessPhone || null,
        businessAddress: validatedData.businessAddress || null,
        businessCity: validatedData.businessCity || null,
        businessState: validatedData.businessState || null,
        businessZip: validatedData.businessZip || null,
        businessCountry: validatedData.businessCountry,
        status: gatewayAccount.status || "pending",
        nmiApplicationStatus: gatewayAccount.status || null,
        nmiApplicationData: gatewayAccount as any,
        metadata: {
          dba: validatedData.dba,
          website: validatedData.website,
          businessType: validatedData.businessType,
          merchantCategoryCode: validatedData.merchantCategoryCode,
          annualVolume: validatedData.annualVolume,
          averageTicket: validatedData.averageTicket,
          highTicket: validatedData.highTicket,
        },
      });

      // Trigger merchant.created webhook
      await webhookService.sendWebhookEvent(
        WebhookEventType.MERCHANT_CREATED,
        validatedData.platform,
        {
          merchantId: merchant.id,
          platformClientId: validatedData.platformClientId,
          nmiMerchantId: merchant.nmiMerchantId,
          businessName: validatedData.businessName,
          businessEmail: validatedData.businessEmail,
          status: merchant.status,
          nmiGatewayId: gatewayAccount.id,
        }
      );

      res.status(201).json({
        merchantId: merchant.id,
        nmiMerchantId: merchant.nmiMerchantId,
        nmiGatewayId: gatewayAccount.id,
        status: merchant.status,
        message: "Merchant gateway account created successfully",
      });
    } catch (error) {
      console.error("Error creating merchant:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          message: "Invalid merchant data",
          errors: error.errors,
        });
      }
      res.status(500).json({
        message: "Failed to create merchant",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  // Get all merchants
  app.get("/api/v1/merchants", async (_req, res) => {
    try {
      const merchants = await storage.getAllMerchants();
      res.json(merchants);
    } catch (error) {
      console.error("Error fetching merchants:", error);
      res.status(500).json({ message: "Failed to fetch merchants" });
    }
  });

  // Get merchants by platform
  app.get("/api/v1/merchants/platform/:platform", async (req, res) => {
    try {
      const { platform } = req.params;
      const merchants = await storage.getMerchantsByPlatform(platform);
      res.json(merchants);
    } catch (error) {
      console.error("Error fetching merchants by platform:", error);
      res.status(500).json({ message: "Failed to fetch merchants" });
    }
  });

  // Get specific merchant
  app.get("/api/v1/merchants/:id", async (req, res) => {
    try {
      const merchant = await storage.getMerchant(req.params.id);
      if (!merchant) {
        return res.status(404).json({ message: "Merchant not found" });
      }
      res.json(merchant);
    } catch (error) {
      console.error("Error fetching merchant:", error);
      res.status(500).json({ message: "Failed to fetch merchant" });
    }
  });

  // Update merchant status
  app.patch("/api/v1/merchants/:id/status", async (req, res) => {
    try {
      const statusSchema = z.object({
        status: z.enum(["active", "suspended", "pending", "rejected"]),
      });

      const { status } = statusSchema.parse(req.body);
      const merchant = await storage.updateMerchantStatus(req.params.id, status);

      if (!merchant) {
        return res.status(404).json({ message: "Merchant not found" });
      }

      // If activating or suspending, also update in NMI
      if ((status === "active" || status === "suspended") && merchant.nmiMerchantId) {
        try {
          const nmiPartnerService = new NMIPartnerService();
          const nmiStatus = status === "suspended" ? "restricted" : "active";
          await nmiPartnerService.setMerchantStatus(
            parseInt(merchant.nmiMerchantId, 10),
            nmiStatus
          );
        } catch (nmiError) {
          console.error("Failed to update NMI merchant status:", nmiError);
          // Continue anyway - we updated our database
        }
      }

      // Trigger appropriate webhook based on status
      if (status === "active") {
        await webhookService.sendWebhookEvent(
          WebhookEventType.MERCHANT_APPROVED,
          merchant.platform,
          {
            merchantId: merchant.id,
            platformClientId: merchant.platformClientId,
            nmiMerchantId: merchant.nmiMerchantId,
            businessName: merchant.businessName,
            businessEmail: merchant.businessEmail,
            status: merchant.status,
          }
        );
      } else if (status === "suspended") {
        await webhookService.sendWebhookEvent(
          WebhookEventType.MERCHANT_SUSPENDED,
          merchant.platform,
          {
            merchantId: merchant.id,
            platformClientId: merchant.platformClientId,
            nmiMerchantId: merchant.nmiMerchantId,
            businessName: merchant.businessName,
            businessEmail: merchant.businessEmail,
            status: merchant.status,
          }
        );
      }

      res.json(merchant);
    } catch (error) {
      console.error("Error updating merchant status:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          message: "Invalid status",
          errors: error.errors,
        });
      }
      res.status(500).json({ message: "Failed to update merchant status" });
    }
  });

  // Check merchant application status with NMI
  app.get("/api/v1/merchants/:id/nmi-status", async (req, res) => {
    try {
      const merchant = await storage.getMerchant(req.params.id);
      if (!merchant) {
        return res.status(404).json({ message: "Merchant not found" });
      }

      if (!merchant.nmiMerchantId) {
        return res.status(400).json({
          message: "Merchant does not have an NMI merchant ID yet",
        });
      }

      const nmiPartnerService = new NMIPartnerService();
      const gatewayAccount = await nmiPartnerService.getGatewayAccount(
        parseInt(merchant.nmiMerchantId, 10)
      );

      // Update our database with the latest status
      if (gatewayAccount.status) {
        await storage.updateMerchant(merchant.id, {
          nmiApplicationStatus: gatewayAccount.status,
        });
      }

      res.json({
        merchantId: merchant.id,
        nmiMerchantId: merchant.nmiMerchantId,
        nmiGatewayId: gatewayAccount.id,
        status: gatewayAccount.status,
        company: gatewayAccount.company,
      });
    } catch (error) {
      console.error("Error checking NMI merchant status:", error);
      res.status(500).json({ message: "Failed to check merchant status" });
    }
  });

  // Partner Payment Processing API (requires API key authentication)

  // Process a payment on behalf of a merchant
  app.post("/api/v1/payments/process", paymentLimiter, requireApiKey, requirePermission("process_payments"), async (req, res) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const platform = authReq.apiKey!.platform;

      // Validate payment request — paymentToken from Collect.js, never raw card data
      const paymentSchema = z.object({
        merchantId: z.string().uuid("Invalid merchant ID"),
        amount: z.number().positive("Amount must be positive"),
        currency: z.string().default("USD"),
        paymentToken: z.string().min(1, "Payment token required"),
        customerEmail: z.string().email("Valid email required"),
        customerName: z.string().optional(),
        billingAddress: z.object({
          address: z.string(),
          city: z.string(),
          state: z.string(),
          zip: z.string(),
          country: z.string().optional(),
        }).optional(),
        platformOrderId: z.string().optional(),
        metadata: z.record(z.any()).optional(),
        description: z.string().optional(),
        invoiceNumber: z.string().optional(),
      });

      const validatedData = paymentSchema.parse(req.body);

      // Get merchant
      const merchant = await storage.getMerchant(validatedData.merchantId);
      if (!merchant) {
        return res.status(404).json({
          error: "Merchant not found",
          message: "The specified merchant ID does not exist",
        });
      }

      // Verify merchant belongs to the requesting platform (unless internal)
      if (platform !== "internal" && merchant.platform !== platform) {
        return res.status(403).json({
          error: "Forbidden",
          message: "Cannot process payments for merchants from other platforms",
        });
      }

      // Process the payment via NMI using the Collect.js token
      const paymentService = new MerchantPaymentService();
      const paymentResult = await paymentService.processPayment(merchant, validatedData as MerchantPaymentRequest);

      if (!paymentResult.success) {
        // Log failed transaction
        const failedTransaction = await storage.createPartnerPaymentTransaction({
          merchantId: merchant.id,
          platform: platform,
          platformOrderId: validatedData.platformOrderId || null,
          gatewayTransactionId: null,
          amount: validatedData.amount.toString(),
          currency: validatedData.currency,
          status: "failed",
          customerEmail: validatedData.customerEmail,
          customerName: validatedData.customerName || null,
          billingAddress: validatedData.billingAddress || null,
          errorMessage: paymentResult.errorMessage || null,
          gatewayResponse: paymentResult.rawResponse || null,
          metadata: validatedData.metadata || null,
          refundedAmount: "0",
          refundedAt: null,
        });

        // Trigger payment.failed webhook
        await webhookService.sendWebhookEvent(
          WebhookEventType.PAYMENT_FAILED,
          platform,
          {
            transactionId: failedTransaction.id,
            merchantId: merchant.id,
            platformOrderId: validatedData.platformOrderId || null,
            amount: validatedData.amount,
            currency: validatedData.currency,
            customerEmail: validatedData.customerEmail,
            errorMessage: paymentResult.errorMessage,
            metadata: validatedData.metadata,
          }
        );

        return res.status(400).json({
          success: false,
          error: "Payment failed",
          message: paymentResult.errorMessage || "Payment processing failed",
        });
      }

      // Extract card details from response
      const cardBrand = paymentResult.rawResponse?.cc_type || paymentResult.rawResponse?.card_type;
      const cardLastFour = paymentResult.rawResponse?.cc_number?.slice(-4);

      // Log successful transaction
      const transaction = await storage.createPartnerPaymentTransaction({
        merchantId: merchant.id,
        platform: platform,
        platformOrderId: validatedData.platformOrderId || null,
        gatewayTransactionId: paymentResult.transactionId || null,
        amount: validatedData.amount.toString(),
        currency: validatedData.currency,
        status: "success",
        paymentMethod: "credit_card",
        cardBrand: cardBrand || null,
        cardLastFour: cardLastFour || null,
        customerEmail: validatedData.customerEmail,
        customerName: validatedData.customerName || null,
        billingAddress: validatedData.billingAddress || null,
        errorMessage: null,
        gatewayResponse: paymentResult.rawResponse || null,
        metadata: validatedData.metadata || null,
        refundedAmount: "0",
        refundedAt: null,
      });

      // Trigger payment.success webhook
      await webhookService.sendWebhookEvent(
        WebhookEventType.PAYMENT_SUCCESS,
        platform,
        {
          transactionId: transaction.id,
          merchantId: merchant.id,
          platformOrderId: validatedData.platformOrderId || null,
          gatewayTransactionId: paymentResult.transactionId,
          authCode: paymentResult.authCode,
          amount: validatedData.amount,
          currency: validatedData.currency,
          cardBrand: cardBrand,
          cardLastFour: cardLastFour,
          customerEmail: validatedData.customerEmail,
          customerName: validatedData.customerName,
          metadata: validatedData.metadata,
        }
      );

      res.status(201).json({
        success: true,
        transactionId: transaction.id,
        gatewayTransactionId: paymentResult.transactionId,
        authCode: paymentResult.authCode,
        amount: validatedData.amount,
        currency: validatedData.currency,
        status: "success",
        cardBrand: cardBrand,
        cardLastFour: cardLastFour,
        message: paymentResult.message || "Payment processed successfully",
        createdAt: transaction.createdAt,
      });
    } catch (error) {
      console.error("Payment processing error:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: "Invalid payment request",
          message: "Validation failed",
          errors: error.errors,
        });
      }
      res.status(500).json({
        error: "Internal server error",
        message: "Failed to process payment",
      });
    }
  });

  // Authorize a payment (hold without capturing)
  app.post("/api/v1/payments/authorize", paymentLimiter, requireApiKey, requirePermission("process_payments"), async (req, res) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const platform = authReq.apiKey!.platform;

      const authSchema = z.object({
        merchantId: z.string().uuid("Invalid merchant ID"),
        amount: z.number().positive("Amount must be positive"),
        currency: z.string().default("USD"),
        paymentToken: z.string().min(1, "Payment token required"),
        customerEmail: z.string().email("Valid email required"),
        customerName: z.string().optional(),
        billingAddress: z.object({
          address: z.string(),
          city: z.string(),
          state: z.string(),
          zip: z.string(),
          country: z.string().optional(),
        }).optional(),
        platformOrderId: z.string().optional(),
        description: z.string().optional(),
      });

      const validatedData = authSchema.parse(req.body);

      const merchant = await storage.getMerchant(validatedData.merchantId);
      if (!merchant) {
        return res.status(404).json({ error: "Merchant not found" });
      }

      if (platform !== "internal" && merchant.platform !== platform) {
        return res.status(403).json({ error: "Forbidden", message: "Cannot process payments for merchants from other platforms" });
      }

      const paymentService = new MerchantPaymentService();
      const result = await paymentService.authorizePayment(merchant, validatedData as MerchantPaymentRequest);

      if (!result.success) {
        return res.status(400).json({
          success: false,
          error: "Authorization failed",
          message: result.errorMessage || "Authorization declined",
        });
      }

      const cardBrand = result.rawResponse?.cc_type || result.rawResponse?.card_type;
      const cardLastFour = result.rawResponse?.cc_number?.slice(-4);

      const transaction = await storage.createPartnerPaymentTransaction({
        merchantId: merchant.id,
        platform,
        platformOrderId: validatedData.platformOrderId || null,
        gatewayTransactionId: result.transactionId || null,
        amount: validatedData.amount.toString(),
        currency: validatedData.currency,
        status: "authorized",
        paymentMethod: "credit_card",
        cardBrand: cardBrand || null,
        cardLastFour: cardLastFour || null,
        customerEmail: validatedData.customerEmail,
        customerName: validatedData.customerName || null,
        billingAddress: validatedData.billingAddress || null,
        errorMessage: null,
        gatewayResponse: result.rawResponse || null,
        metadata: null,
        refundedAmount: "0",
        refundedAt: null,
      });

      res.status(201).json({
        success: true,
        transactionId: transaction.id,
        gatewayTransactionId: result.transactionId,
        authCode: result.authCode,
        amount: validatedData.amount,
        currency: validatedData.currency,
        status: "authorized",
        cardBrand,
        cardLastFour,
        message: result.message || "Authorization approved",
      });
    } catch (error) {
      console.error("Authorization error:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid request", errors: error.errors });
      }
      res.status(500).json({ error: "Internal server error", message: "Failed to authorize payment" });
    }
  });

  // Capture a previously authorized payment
  app.post("/api/v1/payments/capture", paymentLimiter, requireApiKey, requirePermission("process_payments"), async (req, res) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const platform = authReq.apiKey!.platform;

      const captureSchema = z.object({
        transactionId: z.string().uuid("Invalid transaction ID"),
        amount: z.number().positive().optional(),
      });

      const validatedData = captureSchema.parse(req.body);

      const transaction = await storage.getPartnerPaymentTransaction(validatedData.transactionId);
      if (!transaction) {
        return res.status(404).json({ error: "Transaction not found" });
      }

      if (platform !== "internal" && transaction.platform !== platform) {
        return res.status(403).json({ error: "Forbidden", message: "Cannot capture transactions from other platforms" });
      }

      if (transaction.status !== "authorized") {
        return res.status(400).json({ error: "Invalid status", message: "Only authorized transactions can be captured" });
      }

      if (!transaction.gatewayTransactionId) {
        return res.status(400).json({ error: "Missing gateway transaction ID" });
      }

      const merchant = await storage.getMerchant(transaction.merchantId);
      if (!merchant) {
        return res.status(404).json({ error: "Merchant not found" });
      }

      const paymentService = new MerchantPaymentService();
      const result = await paymentService.capturePayment(merchant, transaction.gatewayTransactionId, validatedData.amount);

      if (!result.success) {
        return res.status(400).json({
          success: false,
          error: "Capture failed",
          message: result.errorMessage || "Capture processing failed",
        });
      }

      await storage.updatePartnerPaymentTransaction(transaction.id, {
        status: "success",
      });

      res.json({
        success: true,
        transactionId: transaction.id,
        gatewayTransactionId: result.transactionId,
        amount: validatedData.amount || parseFloat(transaction.amount),
        status: "captured",
        message: result.message || "Payment captured successfully",
      });
    } catch (error) {
      console.error("Capture error:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid request", errors: error.errors });
      }
      res.status(500).json({ error: "Internal server error", message: "Failed to capture payment" });
    }
  });

  // Void a transaction before settlement
  app.post("/api/v1/payments/void", paymentLimiter, requireApiKey, requirePermission("process_payments"), async (req, res) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const platform = authReq.apiKey!.platform;

      const voidSchema = z.object({
        transactionId: z.string().uuid("Invalid transaction ID"),
      });

      const validatedData = voidSchema.parse(req.body);

      const transaction = await storage.getPartnerPaymentTransaction(validatedData.transactionId);
      if (!transaction) {
        return res.status(404).json({ error: "Transaction not found" });
      }

      if (platform !== "internal" && transaction.platform !== platform) {
        return res.status(403).json({ error: "Forbidden", message: "Cannot void transactions from other platforms" });
      }

      if (!transaction.gatewayTransactionId) {
        return res.status(400).json({ error: "Missing gateway transaction ID" });
      }

      const merchant = await storage.getMerchant(transaction.merchantId);
      if (!merchant) {
        return res.status(404).json({ error: "Merchant not found" });
      }

      const paymentService = new MerchantPaymentService();
      const result = await paymentService.voidPayment(merchant, transaction.gatewayTransactionId);

      if (!result.success) {
        return res.status(400).json({
          success: false,
          error: "Void failed",
          message: result.errorMessage || "Void processing failed",
        });
      }

      await storage.updatePartnerPaymentTransaction(transaction.id, {
        status: "voided",
      });

      res.json({
        success: true,
        transactionId: transaction.id,
        gatewayTransactionId: result.transactionId,
        status: "voided",
        message: result.message || "Transaction voided successfully",
      });
    } catch (error) {
      console.error("Void error:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid request", errors: error.errors });
      }
      res.status(500).json({ error: "Internal server error", message: "Failed to void transaction" });
    }
  });

  // Process a refund
  app.post("/api/v1/payments/refund", requireApiKey, requirePermission("process_refunds"), async (req, res) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const platform = authReq.apiKey!.platform;

      const refundSchema = z.object({
        transactionId: z.string().uuid("Invalid transaction ID"),
        amount: z.number().positive().optional(),
        reason: z.string().optional(),
      });

      const validatedData = refundSchema.parse(req.body);

      // Get the original transaction
      const transaction = await storage.getPartnerPaymentTransaction(validatedData.transactionId);

      if (!transaction) {
        return res.status(404).json({
          error: "Transaction not found",
          message: "The specified transaction ID does not exist",
        });
      }

      // Verify platform access
      if (platform !== "internal" && transaction.platform !== platform) {
        return res.status(403).json({
          error: "Forbidden",
          message: "Cannot refund transactions from other platforms",
        });
      }

      // Check if already fully refunded
      const refundedAmount = parseFloat(transaction.refundedAmount || "0");
      const transactionAmount = parseFloat(transaction.amount);

      if (refundedAmount >= transactionAmount) {
        return res.status(400).json({
          error: "Already refunded",
          message: "This transaction has already been fully refunded",
        });
      }

      // Get merchant
      const merchant = await storage.getMerchant(transaction.merchantId);
      if (!merchant) {
        return res.status(404).json({
          error: "Merchant not found",
        });
      }

      // Calculate refund amount
      const refundAmount = validatedData.amount || (transactionAmount - refundedAmount);

      if (refundAmount + refundedAmount > transactionAmount) {
        return res.status(400).json({
          error: "Invalid refund amount",
          message: "Refund amount exceeds available balance",
        });
      }

      // Process refund
      const paymentService = new MerchantPaymentService();
      const refundResult = await paymentService.processRefund(
        merchant,
        transaction.gatewayTransactionId!,
        refundAmount,
        validatedData.reason
      );

      if (!refundResult.success) {
        return res.status(400).json({
          success: false,
          error: "Refund failed",
          message: refundResult.errorMessage || "Refund processing failed",
        });
      }

      // Update transaction with refund info
      const newRefundedAmount = refundedAmount + refundAmount;
      const isFullyRefunded = newRefundedAmount >= transactionAmount;
      await storage.updatePartnerPaymentTransaction(transaction.id, {
        refundedAmount: newRefundedAmount.toString(),
        refundedAt: new Date(),
        status: isFullyRefunded ? "refunded" : "success",
      });

      // Trigger payment.refunded webhook
      await webhookService.sendWebhookEvent(
        WebhookEventType.PAYMENT_REFUNDED,
        platform,
        {
          transactionId: transaction.id,
          merchantId: merchant.id,
          platformOrderId: transaction.platformOrderId || null,
          gatewayTransactionId: refundResult.transactionId,
          originalAmount: parseFloat(transaction.amount),
          refundAmount: refundAmount,
          totalRefunded: newRefundedAmount,
          isFullyRefunded: isFullyRefunded,
          reason: validatedData.reason,
          customerEmail: transaction.customerEmail,
          metadata: transaction.metadata,
        }
      );

      res.json({
        success: true,
        transactionId: transaction.id,
        gatewayTransactionId: refundResult.transactionId,
        refundAmount: refundAmount,
        totalRefunded: newRefundedAmount,
        message: refundResult.message || "Refund processed successfully",
      });
    } catch (error) {
      console.error("Refund processing error:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: "Invalid refund request",
          errors: error.errors,
        });
      }
      res.status(500).json({
        error: "Internal server error",
        message: "Failed to process refund",
      });
    }
  });

  // Get transactions for a merchant
  app.get("/api/v1/payments/merchant/:merchantId", requireApiKey, async (req, res) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const platform = authReq.apiKey!.platform;
      const { merchantId } = req.params;

      // Get merchant to verify platform access
      const merchant = await storage.getMerchant(merchantId);
      if (!merchant) {
        return res.status(404).json({ message: "Merchant not found" });
      }

      if (platform !== "internal" && merchant.platform !== platform) {
        return res.status(403).json({
          error: "Forbidden",
          message: "Cannot access transactions for merchants from other platforms",
        });
      }

      const transactions = await storage.getPartnerPaymentTransactionsByMerchant(merchantId);
      res.json(transactions);
    } catch (error) {
      console.error("Error fetching merchant transactions:", error);
      res.status(500).json({ message: "Failed to fetch transactions" });
    }
  });

  // Get transactions for a platform
  app.get("/api/v1/payments/platform/:platform", requireApiKey, async (req, res) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const requestedPlatform = req.params.platform;

      // Verify platform access
      if (authReq.apiKey!.platform !== "internal" && authReq.apiKey!.platform !== requestedPlatform) {
        return res.status(403).json({
          error: "Forbidden",
          message: "Cannot access transactions from other platforms",
        });
      }

      const transactions = await storage.getPartnerPaymentTransactionsByPlatform(requestedPlatform);
      res.json(transactions);
    } catch (error) {
      console.error("Error fetching platform transactions:", error);
      res.status(500).json({ message: "Failed to fetch transactions" });
    }
  });

  // Get specific transaction details
  app.get("/api/v1/payments/:transactionId", requireApiKey, async (req, res) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const platform = authReq.apiKey!.platform;
      const { transactionId } = req.params;

      const transaction = await storage.getPartnerPaymentTransaction(transactionId);
      if (!transaction) {
        return res.status(404).json({ message: "Transaction not found" });
      }

      // Verify platform access
      if (platform !== "internal" && transaction.platform !== platform) {
        return res.status(403).json({
          error: "Forbidden",
          message: "Cannot access transactions from other platforms",
        });
      }

      res.json(transaction);
    } catch (error) {
      console.error("Error fetching transaction:", error);
      res.status(500).json({ message: "Failed to fetch transaction" });
    }
  });

  // Customer Vault — Add a card to the vault (tokenize without charging)
  app.post("/api/v1/payments/vault/add", paymentLimiter, requireApiKey, requirePermission("process_payments"), async (req, res) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const platform = authReq.apiKey!.platform;

      const vaultAddSchema = z.object({
        merchantId: z.string().uuid("Invalid merchant ID"),
        paymentToken: z.string().min(1, "Payment token required"),
        customerEmail: z.string().email().optional(),
        customerName: z.string().optional(),
        billingAddress: z.object({
          address: z.string(),
          city: z.string(),
          state: z.string(),
          zip: z.string(),
          country: z.string().optional(),
        }).optional(),
      });

      const validatedData = vaultAddSchema.parse(req.body);

      const merchant = await storage.getMerchant(validatedData.merchantId);
      if (!merchant) {
        return res.status(404).json({ error: "Merchant not found" });
      }

      if (platform !== "internal" && merchant.platform !== platform) {
        return res.status(403).json({ error: "Forbidden", message: "Cannot access merchants from other platforms" });
      }

      if (merchant.status !== "active") {
        return res.status(400).json({ error: "Merchant not active" });
      }

      const nmiGateway = new NMIPaymentGateway();
      const nameParts = (validatedData.customerName || "").trim().split(/\s+/);

      const result = await nmiGateway.addCustomerToVault({
        paymentToken: validatedData.paymentToken,
        email: validatedData.customerEmail,
        firstName: nameParts[0] || "",
        lastName: nameParts.slice(1).join(" ") || "",
        address1: validatedData.billingAddress?.address,
        city: validatedData.billingAddress?.city,
        state: validatedData.billingAddress?.state,
        zip: validatedData.billingAddress?.zip,
        country: validatedData.billingAddress?.country,
      });

      if (!result.success) {
        return res.status(400).json({
          success: false,
          error: "Vault add failed",
          message: result.errorMessage || "Failed to add card to vault",
        });
      }

      res.status(201).json({
        success: true,
        customerVaultId: result.customerVaultId,
        message: result.message || "Card added to vault successfully",
      });
    } catch (error) {
      console.error("Vault add error:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid request", errors: error.errors });
      }
      res.status(500).json({ error: "Internal server error", message: "Failed to add card to vault" });
    }
  });

  // Customer Vault — Charge a stored card
  app.post("/api/v1/payments/vault/charge", paymentLimiter, requireApiKey, requirePermission("process_payments"), async (req, res) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const platform = authReq.apiKey!.platform;

      const vaultChargeSchema = z.object({
        merchantId: z.string().uuid("Invalid merchant ID"),
        customerVaultId: z.string().min(1, "Customer vault ID required"),
        amount: z.number().positive("Amount must be positive"),
        currency: z.string().default("USD"),
        description: z.string().optional(),
        platformOrderId: z.string().optional(),
        customerEmail: z.string().email().optional(),
        customerName: z.string().optional(),
        metadata: z.record(z.any()).optional(),
      });

      const validatedData = vaultChargeSchema.parse(req.body);

      const merchant = await storage.getMerchant(validatedData.merchantId);
      if (!merchant) {
        return res.status(404).json({ error: "Merchant not found" });
      }

      if (platform !== "internal" && merchant.platform !== platform) {
        return res.status(403).json({ error: "Forbidden", message: "Cannot access merchants from other platforms" });
      }

      if (merchant.status !== "active" || !merchant.nmiMerchantId) {
        return res.status(400).json({ error: "Merchant not active or not fully configured" });
      }

      const nmiGateway = new NMIPaymentGateway();
      const result = await nmiGateway.chargeVaultCustomer({
        customerVaultId: validatedData.customerVaultId,
        amount: validatedData.amount,
        description: validatedData.description,
        orderId: validatedData.platformOrderId,
      });

      if (!result.success) {
        const failedTransaction = await storage.createPartnerPaymentTransaction({
          merchantId: merchant.id,
          platform,
          platformOrderId: validatedData.platformOrderId || null,
          gatewayTransactionId: null,
          amount: validatedData.amount.toString(),
          currency: validatedData.currency,
          status: "failed",
          customerEmail: validatedData.customerEmail || null,
          customerName: validatedData.customerName || null,
          billingAddress: null,
          errorMessage: result.errorMessage || null,
          gatewayResponse: result.rawResponse || null,
          metadata: validatedData.metadata || null,
          refundedAmount: "0",
          refundedAt: null,
        });

        return res.status(400).json({
          success: false,
          transactionId: failedTransaction.id,
          error: "Vault charge failed",
          message: result.errorMessage || "Payment from vault failed",
        });
      }

      const cardBrand = result.rawResponse?.cc_type || result.rawResponse?.card_type;
      const cardLastFour = result.rawResponse?.cc_number?.slice(-4);

      const transaction = await storage.createPartnerPaymentTransaction({
        merchantId: merchant.id,
        platform,
        platformOrderId: validatedData.platformOrderId || null,
        gatewayTransactionId: result.transactionId || null,
        amount: validatedData.amount.toString(),
        currency: validatedData.currency,
        status: "success",
        paymentMethod: "vault",
        cardBrand: cardBrand || null,
        cardLastFour: cardLastFour || null,
        customerEmail: validatedData.customerEmail || null,
        customerName: validatedData.customerName || null,
        billingAddress: null,
        errorMessage: null,
        gatewayResponse: result.rawResponse || null,
        metadata: validatedData.metadata || null,
        refundedAmount: "0",
        refundedAt: null,
      });

      res.status(201).json({
        success: true,
        transactionId: transaction.id,
        gatewayTransactionId: result.transactionId,
        authCode: result.authCode,
        amount: validatedData.amount,
        currency: validatedData.currency,
        status: "success",
        cardBrand,
        cardLastFour,
        message: result.message || "Vault payment processed successfully",
      });
    } catch (error) {
      console.error("Vault charge error:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid request", errors: error.errors });
      }
      res.status(500).json({ error: "Internal server error", message: "Failed to charge vault customer" });
    }
  });

  // Customer Vault Management — add customer + card via the orchestration service
  app.post("/api/v1/vault/customers", paymentLimiter, requireApiKey, requirePermission("process_payments"), async (req, res) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const platform = authReq.apiKey!.platform;

      const addSchema = z.object({
        merchantId: z.string().uuid().optional(),
        paymentToken: z.string().min(1, "Payment token required"),
        firstName: z.string().min(1),
        lastName: z.string().min(1),
        email: z.string().email(),
        phone: z.string().optional(),
        company: z.string().optional(),
        billingAddress: z.string().optional(),
        billingCity: z.string().optional(),
        billingState: z.string().optional(),
        billingZip: z.string().optional(),
        billingCountry: z.string().optional(),
        nickname: z.string().optional(),
      });

      const data = addSchema.parse(req.body);

      // Verify merchant belongs to platform if provided
      if (data.merchantId) {
        const merchant = await storage.getMerchant(data.merchantId);
        if (!merchant) {
          return res.status(404).json({ error: "Merchant not found" });
        }
        if (platform !== "internal" && merchant.platform !== platform) {
          return res.status(403).json({ error: "Forbidden" });
        }
      }

      const vaultService = new CustomerVaultService();
      const result = await vaultService.addToVault({
        ...data,
        sourcePlatform: platform,
      });

      if (!result.success) {
        return res.status(400).json({
          success: false,
          error: result.errorMessage || "Failed to add to vault",
        });
      }

      res.status(201).json({
        success: true,
        customerId: result.customer!.id,
        paymentMethodId: result.paymentMethod!.id,
        nmiVaultId: result.nmiVaultId,
        message: "Customer and card added to vault",
      });
    } catch (error) {
      console.error("Vault add customer error:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid request", errors: error.errors });
      }
      res.status(500).json({ error: "Failed to add customer to vault" });
    }
  });

  // Charge a vault customer's stored card
  app.post("/api/v1/vault/customers/:customerId/charge", paymentLimiter, requireApiKey, requirePermission("process_payments"), async (req, res) => {
    try {
      const { customerId } = req.params;

      const chargeSchema = z.object({
        amount: z.number().positive(),
        paymentMethodId: z.string().optional(),
        description: z.string().optional(),
        orderId: z.string().optional(),
      });

      const data = chargeSchema.parse(req.body);

      const vaultService = new CustomerVaultService();
      const result = await vaultService.chargeVaultCustomer({
        customerId,
        paymentMethodId: data.paymentMethodId,
        amount: data.amount,
        description: data.description,
        orderId: data.orderId,
      });

      if (!result.success) {
        return res.status(400).json({
          success: false,
          error: result.errorMessage || "Vault charge failed",
        });
      }

      res.json({
        success: true,
        transactionId: result.transactionId,
        authCode: result.authCode,
        amount: result.amount,
        message: result.message,
      });
    } catch (error) {
      console.error("Vault charge error:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid request", errors: error.errors });
      }
      res.status(500).json({ error: "Failed to charge vault customer" });
    }
  });

  // List vault customers for a merchant
  app.get("/api/v1/vault/merchants/:merchantId/customers", requireApiKey, async (req, res) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const platform = authReq.apiKey!.platform;
      const { merchantId } = req.params;

      const merchant = await storage.getMerchant(merchantId);
      if (!merchant) {
        return res.status(404).json({ error: "Merchant not found" });
      }

      if (platform !== "internal" && merchant.platform !== platform) {
        return res.status(403).json({ error: "Forbidden" });
      }

      const vaultService = new CustomerVaultService();
      const customers = await vaultService.getCustomersByMerchant(merchantId);
      res.json(customers);
    } catch (error) {
      console.error("Vault list customers error:", error);
      res.status(500).json({ error: "Failed to list vault customers" });
    }
  });

  // Get payment methods for a vault customer
  app.get("/api/v1/vault/customers/:customerId/payment-methods", requireApiKey, async (req, res) => {
    try {
      const { customerId } = req.params;

      const vaultService = new CustomerVaultService();
      const methods = await vaultService.getPaymentMethods(customerId);
      res.json(methods);
    } catch (error) {
      console.error("Vault payment methods error:", error);
      res.status(500).json({ error: "Failed to list payment methods" });
    }
  });

  // Delete a payment method from the vault
  app.delete("/api/v1/vault/payment-methods/:id", requireApiKey, requirePermission("process_payments"), async (req, res) => {
    try {
      const deleted = await storage.deleteVaultPaymentMethod(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Payment method not found" });
      }
      res.json({ success: true, message: "Payment method removed" });
    } catch (error) {
      console.error("Vault delete payment method error:", error);
      res.status(500).json({ error: "Failed to delete payment method" });
    }
  });

  // Public config — returns the Collect.js tokenization key for the frontend
  app.get("/api/config/public-key", (_req, res) => {
    const collectJsKey = process.env.SWIPESBLUE_COLLECTJS;
    if (!collectJsKey) {
      return res.status(500).json({ error: "Collect.js tokenization key not configured" });
    }
    res.json({ tokenizationKey: collectJsKey });
  });

  // API Key Management Endpoints (internal use only)

  // Create a new API key
  app.post("/api/v1/api-keys/create", apiLimiter, requireAdmin, async (req, res) => {
    try {
      const apiKeySchema = z.object({
        platform: z.enum(["businessblueprint", "hostsblue", "swipesblue", "scansblue", "internal"]),
        name: z.string().min(1, "Name is required"),
        permissions: z.array(z.string()).default(["*"]),
        metadata: z.record(z.any()).optional(),
      });

      const validatedData = apiKeySchema.parse(req.body);

      // Generate API key and secret
      const apiKey = generateApiKey();
      const apiSecret = generateApiSecret();

      // Create API key in database
      const createdKey = await storage.createApiKey({
        platform: validatedData.platform,
        name: validatedData.name,
        apiKey: apiKey,
        apiSecret: apiSecret,
        isActive: true,
        permissions: validatedData.permissions,
        metadata: validatedData.metadata || null,
        lastUsedAt: null,
      });

      res.status(201).json({
        id: createdKey.id,
        platform: createdKey.platform,
        name: createdKey.name,
        apiKey: apiKey, // Return the key only once!
        apiSecret: apiSecret,
        permissions: createdKey.permissions,
        isActive: createdKey.isActive,
        createdAt: createdKey.createdAt,
        message: "API key created successfully. Store these credentials securely - they won't be shown again.",
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: "Invalid API key data",
          errors: error.errors,
        });
      }
      res.status(500).json({ message: "Failed to create API key" });
    }
  });

  // List API keys (without exposing the actual keys)
  app.get("/api/v1/api-keys", apiLimiter, requireAdmin, async (_req, res) => {
    try {
      const keys = await storage.getAllApiKeys();

      // Remove sensitive data, return masked key prefix for identification
      const sanitizedKeys = keys.map(key => ({
        id: key.id,
        platform: key.platform,
        name: key.name,
        apiKey: key.apiKey ? `${key.apiKey.slice(0, 12)}${"•".repeat(20)}` : "",
        isActive: key.isActive,
        permissions: key.permissions,
        lastUsedAt: key.lastUsedAt,
        createdAt: key.createdAt,
      }));

      res.json(sanitizedKeys);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch API keys" });
    }
  });

  // Deactivate an API key
  app.delete("/api/v1/api-keys/:id", apiLimiter, requireAdmin, async (req, res) => {
    try {
      const deactivated = await storage.deactivateApiKey(req.params.id);
      if (!deactivated) {
        return res.status(404).json({ message: "API key not found" });
      }
      res.json({ message: "API key deactivated successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to deactivate API key" });
    }
  });

  // Webhook Management API (requires API key authentication)

  // Register a new webhook endpoint
  app.post("/api/v1/webhooks/register", requireApiKey, async (req, res) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const platform = authReq.apiKey!.platform;

      const webhookSchema = z.object({
        url: z.string().url("Invalid webhook URL"),
        events: z.array(z.nativeEnum(WebhookEventType)).min(1, "At least one event type required"),
      });

      const validatedData = webhookSchema.parse(req.body);

      // Register webhook
      const { endpoint, secret } = await webhookService.registerWebhook(
        platform,
        validatedData.url,
        validatedData.events
      );

      // Return webhook details with secret (only shown once)
      res.status(201).json({
        id: endpoint.id,
        platform: endpoint.platform,
        url: endpoint.url,
        events: endpoint.events,
        secret: secret, // This is the only time the secret is returned
        isActive: endpoint.isActive,
        createdAt: endpoint.createdAt,
        message: "Webhook registered successfully. Save the secret - it won't be shown again.",
      });
    } catch (error) {
      console.error("Error registering webhook:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: "Invalid webhook registration",
          message: "Validation failed",
          errors: error.errors,
        });
      }
      if (error instanceof Error && error.message.includes("Invalid")) {
        return res.status(400).json({
          error: "Invalid webhook data",
          message: error.message,
        });
      }
      res.status(500).json({
        error: "Internal server error",
        message: "Failed to register webhook",
      });
    }
  });

  // List webhooks for the authenticated platform
  app.get("/api/v1/webhooks", requireApiKey, async (req, res) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const platform = authReq.apiKey!.platform;

      const endpoints = await storage.getWebhookEndpointsByPlatform(platform);

      // Remove secrets from response
      const sanitizedEndpoints = endpoints.map(endpoint => ({
        id: endpoint.id,
        platform: endpoint.platform,
        url: endpoint.url,
        events: endpoint.events,
        isActive: endpoint.isActive,
        createdAt: endpoint.createdAt,
        updatedAt: endpoint.updatedAt,
        // Don't return secret
      }));

      res.json(sanitizedEndpoints);
    } catch (error) {
      console.error("Error fetching webhooks:", error);
      res.status(500).json({
        error: "Internal server error",
        message: "Failed to fetch webhooks",
      });
    }
  });

  // Delete a webhook endpoint
  app.delete("/api/v1/webhooks/:id", requireApiKey, async (req, res) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const platform = authReq.apiKey!.platform;

      // Get the webhook to verify it belongs to this platform
      const endpoint = await storage.getWebhookEndpoint(req.params.id);

      if (!endpoint) {
        return res.status(404).json({
          error: "Webhook not found",
          message: "The specified webhook endpoint does not exist",
        });
      }

      // Verify platform ownership (unless internal)
      if (platform !== "internal" && endpoint.platform !== platform) {
        return res.status(403).json({
          error: "Forbidden",
          message: "Cannot delete webhooks from other platforms",
        });
      }

      // Delete the webhook (this will also cascade delete all deliveries)
      const deleted = await storage.deleteWebhookEndpoint(req.params.id);

      if (!deleted) {
        return res.status(404).json({
          error: "Webhook not found",
          message: "Failed to delete webhook",
        });
      }

      res.json({
        success: true,
        message: "Webhook deleted successfully",
      });
    } catch (error) {
      console.error("Error deleting webhook:", error);
      res.status(500).json({
        error: "Internal server error",
        message: "Failed to delete webhook",
      });
    }
  });

  // Test a webhook endpoint
  app.post("/api/v1/webhooks/:id/test", requireApiKey, async (req, res) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const platform = authReq.apiKey!.platform;

      // Get the webhook to verify it belongs to this platform
      const endpoint = await storage.getWebhookEndpoint(req.params.id);

      if (!endpoint) {
        return res.status(404).json({
          error: "Webhook not found",
          message: "The specified webhook endpoint does not exist",
        });
      }

      // Verify platform ownership (unless internal)
      if (platform !== "internal" && endpoint.platform !== platform) {
        return res.status(403).json({
          error: "Forbidden",
          message: "Cannot test webhooks from other platforms",
        });
      }

      // Send test webhook
      const result = await webhookService.testWebhook(req.params.id);

      if (result.success) {
        res.json({
          success: true,
          status: result.status,
          message: result.message,
        });
      } else {
        res.status(400).json({
          success: false,
          message: result.message,
        });
      }
    } catch (error) {
      console.error("Error testing webhook:", error);
      res.status(500).json({
        error: "Internal server error",
        message: "Failed to test webhook",
      });
    }
  });

  // ========================================
  // Admin Authentication
  // ========================================
  
  // ========================================
  // Merchant Auth Endpoints
  // ========================================
  // These endpoints handle merchant/user authentication with database persistence
  
  // Password hashing utilities
  const hashPassword = async (password: string): Promise<string> => {
    const crypto = await import("crypto");
    const salt = crypto.randomBytes(16).toString("hex");
    const hash = crypto.scryptSync(password, salt, 64).toString("hex");
    return `${salt}:${hash}`;
  };
  
  const verifyPassword = async (password: string, storedHash: string): Promise<boolean> => {
    const crypto = await import("crypto");
    const [salt, hash] = storedHash.split(":");
    if (!salt || !hash) return false;
    const verifyHash = crypto.scryptSync(password, salt, 64).toString("hex");
    return hash === verifyHash;
  };
  
  // Merchant login - validates against database with hashed passwords
  app.post("/api/auth/login", doubleCsrfProtection, authLimiter, async (req, res) => {
    try {
      // Validate request body with zod
      const { loginMerchantSchema } = await import("@shared/schema");
      const parseResult = loginMerchantSchema.safeParse(req.body);
      
      if (!parseResult.success) {
        return res.status(400).json({ 
          message: "Invalid input", 
          errors: parseResult.error.flatten().fieldErrors 
        });
      }
      
      const { email, password } = parseResult.data;
      
      // Look up merchant in database
      const merchant = await storage.getMerchantAccountByEmail(email);
      
      if (!merchant) {
        return res.status(401).json({ success: false, message: "Invalid email or password" });
      }
      
      // Verify password
      const isValid = await verifyPassword(password, merchant.passwordHash);
      if (!isValid) {
        return res.status(401).json({ success: false, message: "Invalid email or password" });
      }
      
      // Check account status
      if (merchant.status !== "active") {
        return res.status(403).json({ success: false, message: "Account is not active" });
      }
      
      // Update last login time
      await storage.updateMerchantAccountLastLogin(merchant.id);
      
      // Set session
      (req.session as any).merchantId = merchant.id;
      (req.session as any).merchantEmail = merchant.email;
      (req.session as any).merchantName = merchant.fullName;
      (req.session as any).businessName = merchant.businessName;
      (req.session as any).merchantTier = merchant.tier;
      (req.session as any).signupPath = merchant.signupPath;
      (req.session as any).isMerchant = true;

      res.json({ success: true, message: "Login successful" });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ message: "Login failed" });
    }
  });

  // Merchant register - creates account with hashed password
  app.post("/api/auth/register", doubleCsrfProtection, authLimiter, async (req, res) => {
    try {
      // Validate request body with zod
      const { registerMerchantSchema } = await import("@shared/schema");
      const parseResult = registerMerchantSchema.safeParse(req.body);
      
      if (!parseResult.success) {
        return res.status(400).json({ 
          message: "Invalid input", 
          errors: parseResult.error.flatten().fieldErrors 
        });
      }
      
      const { email, password, businessName, fullName, signupPath } = parseResult.data;

      // Check if email already exists
      const existingAccount = await storage.getMerchantAccountByEmail(email);
      if (existingAccount) {
        return res.status(400).json({ message: "An account with this email already exists" });
      }

      // Hash password
      const passwordHash = await hashPassword(password);

      // Create merchant account
      const merchant = await storage.createMerchantAccount({
        email,
        passwordHash,
        businessName,
        fullName,
        tier: "FREE",
        status: "active",
        signupPath,
      });

      // Set session (auto-login after registration)
      (req.session as any).merchantId = merchant.id;
      (req.session as any).merchantEmail = merchant.email;
      (req.session as any).merchantName = merchant.fullName;
      (req.session as any).businessName = merchant.businessName;
      (req.session as any).merchantTier = merchant.tier;
      (req.session as any).signupPath = merchant.signupPath;
      (req.session as any).isMerchant = true;
      
      res.json({ success: true, message: "Registration successful" });
    } catch (error) {
      console.error("Registration error:", error);
      res.status(500).json({ message: "Registration failed" });
    }
  });
  
  // Merchant logout
  app.post("/api/auth/logout", doubleCsrfProtection, (req, res) => {
    (req.session as any).isMerchant = false;
    req.session.destroy((err) => {
      if (err) {
        res.status(500).json({ success: false, message: "Logout failed" });
      } else {
        res.json({ success: true, message: "Logged out" });
      }
    });
  });
  
  // Check merchant auth status
  app.get("/api/auth/check", (req, res) => {
    const isMerchant = (req.session as any)?.isMerchant === true;
    const rawTier = (req.session as any)?.merchantTier || null;
    res.json({
      authenticated: isMerchant,
      merchantId: (req.session as any)?.merchantId || null,
      email: (req.session as any)?.merchantEmail || null,
      name: (req.session as any)?.merchantName || null,
      businessName: (req.session as any)?.businessName || null,
      tier: rawTier ? normalizeTier(rawTier) : null,
      signupPath: (req.session as any)?.signupPath || null,
    });
  });

  // ========================================
  // Tier Entitlements Endpoints (Prompt 14)
  // ========================================
  app.get("/api/tier-entitlements", async (_req, res) => {
    try {
      const entitlements = await storage.getAllTierEntitlements();
      res.json(entitlements);
    } catch (error) {
      console.error("Error fetching tier entitlements:", error);
      res.status(500).json({ message: "Failed to fetch tier entitlements" });
    }
  });

  app.get("/api/tier-entitlements/:tierName", async (req, res) => {
    try {
      const tierName = normalizeTier(req.params.tierName);
      const entitlements = await storage.getTierEntitlements(tierName);
      res.json(entitlements);
    } catch (error) {
      console.error("Error fetching tier entitlements:", error);
      res.status(500).json({ message: "Failed to fetch tier entitlements" });
    }
  });

  // Get active addon subscriptions for current merchant
  app.get("/api/merchant/addon-subscriptions", requireMerchant, async (req, res) => {
    try {
      const merchantId = (req.session as any).merchantId;
      const { getAddonSubscriptionSlugs } = await import("./addon-subscriptions");
      const slugs = await getAddonSubscriptionSlugs(merchantId);
      res.json(slugs);
    } catch (error) {
      console.error("Error fetching addon subscriptions:", error);
      res.json([]);
    }
  });

  // ========================================
  // Admin Auth Endpoints
  // ========================================
  const ADMIN_USERNAME = process.env.ADMIN_USERNAME;
  const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

  // Admin login
  app.post("/api/admin/auth/login", doubleCsrfProtection, authLimiter, (req, res) => {
    const { username, password } = req.body;

    if (!ADMIN_USERNAME || !ADMIN_PASSWORD) {
      return res.status(503).json({
        success: false,
        message: "Admin credentials not configured. Set ADMIN_USERNAME and ADMIN_PASSWORD environment variables.",
      });
    }

    if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
      (req.session as any).isAdmin = true;
      res.json({ success: true, message: "Login successful" });
    } else {
      res.status(401).json({ success: false, message: "Invalid credentials" });
    }
  });

  // Admin logout
  app.post("/api/admin/auth/logout", doubleCsrfProtection, (req, res) => {
    (req.session as any).isAdmin = false;
    req.session.destroy((err) => {
      if (err) {
        res.status(500).json({ success: false, message: "Logout failed" });
      } else {
        res.json({ success: true, message: "Logged out" });
      }
    });
  });

  // Check admin auth status
  app.get("/api/admin/auth/check", (req, res) => {
    const isAdmin = (req.session as any)?.isAdmin === true;
    res.json({ authenticated: isAdmin });
  });

  // Middleware to protect admin routes
  function requireAdmin(req: any, res: any, next: any) {
    if ((req.session as any)?.isAdmin === true) {
      next();
    } else {
      res.status(401).json({ error: "Unauthorized", message: "Admin authentication required" });
    }
  }

  // ========================================
  // Admin API Endpoints
  // ========================================
  // These endpoints provide admin functionality for the SwipesBlue admin dashboard

  // Get dashboard metrics
  app.get("/api/admin/metrics", requireAdmin, async (_req, res) => {
    try {
      // Get all transactions
      const allTransactions = await storage.getAllPartnerPaymentTransactions();

      // Calculate total processed
      const totalProcessed = allTransactions.reduce((sum, t) => {
        return sum + parseFloat(t.amount);
      }, 0);

      // Calculate this month's revenue
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const thisMonthTransactions = allTransactions.filter(t =>
        new Date(t.createdAt) >= startOfMonth && t.status === "success"
      );
      const thisMonth = thisMonthTransactions.reduce((sum, t) => {
        return sum + parseFloat(t.amount);
      }, 0);

      // Calculate success rate (last 30 days)
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const recentTransactions = allTransactions.filter(t =>
        new Date(t.createdAt) >= thirtyDaysAgo
      );
      const successfulTransactions = recentTransactions.filter(t => t.status === "success");
      const successRate = recentTransactions.length > 0
        ? ((successfulTransactions.length / recentTransactions.length) * 100).toFixed(1)
        : "0.0";

      // Platform breakdown
      const platformStats = allTransactions
        .filter(t => t.status === "success")
        .reduce((acc, t) => {
          const platform = t.platform;
          if (!acc[platform]) {
            acc[platform] = 0;
          }
          acc[platform] += parseFloat(t.amount);
          return acc;
        }, {} as Record<string, number>);

      const platformBreakdown = Object.entries(platformStats).map(([name, value], index) => ({
        name: name.charAt(0).toUpperCase() + name.slice(1),
        value: Math.round(value),
        color: index === 0 ? "#3b82f6" : "#8b5cf6",
      }));

      // Get merchant stats
      const allMerchants = await storage.getAllMerchants();
      const merchantStats = {
        active: allMerchants.filter(m => m.status === "active").length,
        pending: allMerchants.filter(m => m.status === "pending").length,
        suspended: allMerchants.filter(m => m.status === "suspended").length,
      };

      res.json({
        totalProcessed: `$${totalProcessed.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        thisMonth: `$${thisMonth.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        successRate: `${successRate}%`,
        platformBreakdown,
        merchantStats,
      });
    } catch (error) {
      console.error("Error fetching admin metrics:", error);
      res.status(500).json({ message: "Failed to fetch metrics" });
    }
  });

  // Get recent transactions for dashboard
  app.get("/api/admin/transactions/recent", requireAdmin, async (_req, res) => {
    try {
      const allTransactions = await storage.getAllPartnerPaymentTransactions();

      // Sort by date descending and take first 10
      const recentTransactions = allTransactions
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 10);

      res.json(recentTransactions);
    } catch (error) {
      console.error("Error fetching recent transactions:", error);
      res.status(500).json({ message: "Failed to fetch recent transactions" });
    }
  });

  // Get payment volume data (last 30 days)
  app.get("/api/admin/volume", requireAdmin, async (_req, res) => {
    try {
      const allTransactions = await storage.getAllPartnerPaymentTransactions();

      // Get transactions from last 30 days
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const recentTransactions = allTransactions.filter(t =>
        new Date(t.createdAt) >= thirtyDaysAgo && t.status === "success"
      );

      // Group by date
      const volumeByDate = recentTransactions.reduce((acc, t) => {
        const date = new Date(t.createdAt).toISOString().split('T')[0];
        if (!acc[date]) {
          acc[date] = 0;
        }
        acc[date] += parseFloat(t.amount);
        return acc;
      }, {} as Record<string, number>);

      // Create array with all dates (fill missing dates with 0)
      const volumeData = [];
      for (let i = 29; i >= 0; i--) {
        const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
        const dateStr = date.toISOString().split('T')[0];
        const displayDate = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

        volumeData.push({
          date: displayDate,
          amount: Math.round(volumeByDate[dateStr] || 0),
        });
      }

      res.json(volumeData);
    } catch (error) {
      console.error("Error fetching volume data:", error);
      res.status(500).json({ message: "Failed to fetch volume data" });
    }
  });

  // Get all transactions (admin view - no platform filter)
  app.get("/api/admin/transactions", requireAdmin, async (_req, res) => {
    try {
      const allTransactions = await storage.getAllPartnerPaymentTransactions();

      // Sort by date descending
      const sortedTransactions = allTransactions.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

      res.json(sortedTransactions);
    } catch (error) {
      console.error("Error fetching admin transactions:", error);
      res.status(500).json({ message: "Failed to fetch transactions" });
    }
  });

  // Get all webhooks (admin view - all platforms)
  app.get("/api/admin/webhooks", requireAdmin, async (_req, res) => {
    try {
      const allWebhooks = await storage.getAllWebhookEndpoints();
      res.json(allWebhooks);
    } catch (error) {
      console.error("Error fetching admin webhooks:", error);
      res.status(500).json({ message: "Failed to fetch webhooks" });
    }
  });

  // Register webhook (admin)
  app.post("/api/admin/webhooks/register", requireAdmin, async (req, res) => {
    try {
      const registerSchema = z.object({
        platform: z.string(),
        url: z.string().url(),
        events: z.array(z.string()).min(1),
      });

      const validatedData = registerSchema.parse(req.body);

      // Register webhook
      const { endpoint, secret } = await webhookService.registerWebhook(
        validatedData.platform,
        validatedData.url,
        validatedData.events as any
      );

      res.status(201).json({
        id: endpoint.id,
        platform: endpoint.platform,
        url: endpoint.url,
        events: endpoint.events,
        secret: secret,
        isActive: endpoint.isActive,
        createdAt: endpoint.createdAt,
        message: "Webhook registered successfully. Save the secret - it won't be shown again.",
      });
    } catch (error) {
      console.error("Error registering webhook:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: "Invalid webhook registration",
          message: "Validation failed",
          errors: error.errors,
        });
      }
      if (error instanceof Error && error.message.includes("Invalid")) {
        return res.status(400).json({
          error: "Invalid webhook data",
          message: error.message,
        });
      }
      res.status(500).json({
        error: "Internal server error",
        message: "Failed to register webhook",
      });
    }
  });

  // Test webhook (admin)
  app.post("/api/admin/webhooks/:id/test", requireAdmin, async (req, res) => {
    try {
      const endpoint = await storage.getWebhookEndpoint(req.params.id);

      if (!endpoint) {
        return res.status(404).json({
          error: "Webhook not found",
          message: "The specified webhook endpoint does not exist",
        });
      }

      // Send test webhook
      const result = await webhookService.testWebhook(req.params.id);

      if (result.success) {
        res.json({
          success: true,
          status: result.status,
          message: result.message,
        });
      } else {
        res.status(400).json({
          success: false,
          message: result.message,
        });
      }
    } catch (error) {
      console.error("Error testing webhook:", error);
      res.status(500).json({
        error: "Internal server error",
        message: "Failed to test webhook",
      });
    }
  });

  // Get webhook deliveries (admin)
  app.get("/api/admin/webhooks/:id/deliveries", requireAdmin, async (req, res) => {
    try {
      const deliveries = await storage.getWebhookDeliveriesByEndpoint(req.params.id);

      // Sort by date descending
      const sortedDeliveries = deliveries.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

      res.json(sortedDeliveries);
    } catch (error) {
      console.error("Error fetching webhook deliveries:", error);
      res.status(500).json({ message: "Failed to fetch deliveries" });
    }
  });

  // Delete webhook (admin)
  app.delete("/api/admin/webhooks/:id", requireAdmin, async (req, res) => {
    try {
      const endpoint = await storage.getWebhookEndpoint(req.params.id);

      if (!endpoint) {
        return res.status(404).json({
          error: "Webhook not found",
          message: "The specified webhook endpoint does not exist",
        });
      }

      const deleted = await storage.deleteWebhookEndpoint(req.params.id);

      if (!deleted) {
        return res.status(404).json({
          error: "Webhook not found",
          message: "Failed to delete webhook",
        });
      }

      res.json({
        success: true,
        message: "Webhook deleted successfully",
      });
    } catch (error) {
      console.error("Error deleting webhook:", error);
      res.status(500).json({
        error: "Internal server error",
        message: "Failed to delete webhook",
      });
    }
  });

  // ========================================
  // Rate Management API Endpoints
  // ========================================

  // Get all active rates
  app.get("/api/admin/rates", requireAdmin, async (_req, res) => {
    try {
      const rates = await storage.getAllRatesActive();
      res.json(rates);
    } catch (error) {
      console.error("Error fetching rates:", error);
      res.status(500).json({ error: "Failed to fetch rates" });
    }
  });

  // Get rates by tier type
  app.get("/api/admin/rates/type/:tierType", requireAdmin, async (req, res) => {
    try {
      const rates = await storage.getRatesByType(req.params.tierType);
      res.json(rates);
    } catch (error) {
      console.error("Error fetching rates by type:", error);
      res.status(500).json({ error: "Failed to fetch rates" });
    }
  });

  // Create new rate
  app.post("/api/admin/rates", requireAdmin, async (req, res) => {
    try {
      const rateSchema = z.object({
        tierName: z.string().min(1),
        tierType: z.enum(["ecommerce", "developer"]),
        monthlyFee: z.string().or(z.number()).transform(v => String(v)),
        transactionPercent: z.string().or(z.number()).transform(v => String(v)),
        transactionFlat: z.string().or(z.number()).transform(v => String(v)),
        description: z.string().optional(),
        features: z.array(z.string()).optional(),
        isActive: z.boolean().optional().default(true),
        displayOrder: z.number().optional().default(0),
      });

      const validated = rateSchema.parse(req.body);
      const rate = await storage.createRatesActive(validated);

      // Log the creation
      await storage.createRatesAuditLog({
        action: "create",
        tableName: "rates_active",
        recordId: rate.id,
        newValues: validated,
        changedBy: "admin",
      });

      res.json(rate);
    } catch (error) {
      console.error("Error creating rate:", error);
      res.status(500).json({ error: "Failed to create rate" });
    }
  });

  // Update rate
  app.patch("/api/admin/rates/:id", requireAdmin, async (req, res) => {
    try {
      const existingRate = await storage.getRatesActive(req.params.id);
      if (!existingRate) {
        return res.status(404).json({ error: "Rate not found" });
      }

      const rateSchema = z.object({
        tierName: z.string().min(1).optional(),
        tierType: z.enum(["ecommerce", "developer"]).optional(),
        monthlyFee: z.string().or(z.number()).transform(v => String(v)).optional(),
        transactionPercent: z.string().or(z.number()).transform(v => String(v)).optional(),
        transactionFlat: z.string().or(z.number()).transform(v => String(v)).optional(),
        description: z.string().optional(),
        features: z.array(z.string()).optional(),
        isActive: z.boolean().optional(),
        displayOrder: z.number().optional(),
      });

      const validated = rateSchema.parse(req.body);
      const rate = await storage.updateRatesActive(req.params.id, validated);

      // Log the update
      await storage.createRatesAuditLog({
        action: "update",
        tableName: "rates_active",
        recordId: req.params.id,
        previousValues: existingRate,
        newValues: validated,
        changedBy: "admin",
      });

      res.json(rate);
    } catch (error) {
      console.error("Error updating rate:", error);
      res.status(500).json({ error: "Failed to update rate" });
    }
  });

  // Delete rate
  app.delete("/api/admin/rates/:id", requireAdmin, async (req, res) => {
    try {
      const existingRate = await storage.getRatesActive(req.params.id);
      if (!existingRate) {
        return res.status(404).json({ error: "Rate not found" });
      }

      const deleted = await storage.deleteRatesActive(req.params.id);

      // Log the deletion
      await storage.createRatesAuditLog({
        action: "delete",
        tableName: "rates_active",
        recordId: req.params.id,
        previousValues: existingRate,
        changedBy: "admin",
      });

      res.json({ success: deleted });
    } catch (error) {
      console.error("Error deleting rate:", error);
      res.status(500).json({ error: "Failed to delete rate" });
    }
  });

  // Get costs baseline
  app.get("/api/admin/costs", requireAdmin, async (_req, res) => {
    try {
      const costs = await storage.getAllCostsBaseline();
      res.json(costs);
    } catch (error) {
      console.error("Error fetching costs:", error);
      res.status(500).json({ error: "Failed to fetch costs" });
    }
  });

  // Create/update cost baseline
  app.post("/api/admin/costs", requireAdmin, async (req, res) => {
    try {
      const costSchema = z.object({
        name: z.string().min(1),
        description: z.string().optional(),
        percentCost: z.string().or(z.number()).transform(v => v ? String(v) : null).optional(),
        flatCost: z.string().or(z.number()).transform(v => v ? String(v) : null).optional(),
        targetMarginPercent: z.string().or(z.number()).transform(v => v ? String(v) : null).optional(),
        notes: z.string().optional(),
      });

      const validated = costSchema.parse(req.body);
      const cost = await storage.createCostsBaseline(validated);
      res.json(cost);
    } catch (error) {
      console.error("Error creating cost:", error);
      res.status(500).json({ error: "Failed to create cost" });
    }
  });

  // Update cost baseline
  app.patch("/api/admin/costs/:id", requireAdmin, async (req, res) => {
    try {
      const costSchema = z.object({
        name: z.string().min(1).optional(),
        description: z.string().optional(),
        percentCost: z.string().or(z.number()).transform(v => v ? String(v) : null).optional(),
        flatCost: z.string().or(z.number()).transform(v => v ? String(v) : null).optional(),
        targetMarginPercent: z.string().or(z.number()).transform(v => v ? String(v) : null).optional(),
        notes: z.string().optional(),
      });

      const validated = costSchema.parse(req.body);
      const cost = await storage.updateCostsBaseline(req.params.id, validated);
      res.json(cost);
    } catch (error) {
      console.error("Error updating cost:", error);
      res.status(500).json({ error: "Failed to update cost" });
    }
  });

  // Get audit logs
  app.get("/api/admin/rates/audit", requireAdmin, async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const logs = await storage.getRatesAuditLogs(limit);
      res.json(logs);
    } catch (error) {
      console.error("Error fetching audit logs:", error);
      res.status(500).json({ error: "Failed to fetch audit logs" });
    }
  });

  // ========================================
  // Staged Rates API Endpoints (5-Button Workflow)
  // ========================================

  // Get all staged rates
  app.get("/api/admin/rates/staged", requireAdmin, async (_req, res) => {
    try {
      const stagedRates = await storage.getAllRatesStaged();
      res.json(stagedRates);
    } catch (error) {
      console.error("Error fetching staged rates:", error);
      res.status(500).json({ error: "Failed to fetch staged rates" });
    }
  });

  // Upload rates to staging (Button 3: UPLOAD)
  app.post("/api/admin/rates/staged", requireAdmin, async (req, res) => {
    try {
      const rateSchema = z.object({
        tierName: z.string().min(1),
        tierType: z.string().min(1),
        monthlyFee: z.string().or(z.number()).transform(v => String(v)),
        transactionPercent: z.string().or(z.number()).transform(v => String(v)),
        transactionFlat: z.string().or(z.number()).transform(v => String(v)),
        description: z.string().optional().nullable(),
        features: z.array(z.string()).optional().nullable(),
        isActive: z.boolean().optional().default(true),
        displayOrder: z.number().optional().default(0),
        status: z.string().optional().default("pending"),
        createdBy: z.string().optional().nullable(),
      });

      const validated = rateSchema.parse(req.body);
      const stagedRate = await storage.createRatesStaged(validated);
      
      await storage.createRatesAuditLog({
        action: "stage",
        tableName: "rates_staged",
        recordId: stagedRate.id,
        newValues: stagedRate,
        changedBy: "admin",
        reason: "Rate staged for review",
      });

      res.json(stagedRate);
    } catch (error) {
      console.error("Error staging rate:", error);
      res.status(500).json({ error: "Failed to stage rate" });
    }
  });

  // Bulk upload rates to staging
  app.post("/api/admin/rates/staged/bulk", requireAdmin, async (req, res) => {
    try {
      const { rates } = req.body;
      if (!Array.isArray(rates)) {
        return res.status(400).json({ error: "rates must be an array" });
      }

      await storage.clearRatesStaged();

      const stagedRates = [];
      for (const rate of rates) {
        const stagedRate = await storage.createRatesStaged({
          tierName: rate.tierName,
          tierType: rate.tierType,
          monthlyFee: String(rate.monthlyFee),
          transactionPercent: String(rate.transactionPercent),
          transactionFlat: String(rate.transactionFlat),
          description: rate.description || null,
          features: rate.features || null,
          isActive: rate.isActive ?? true,
          displayOrder: rate.displayOrder ?? 0,
          status: "pending",
          createdBy: "admin",
        });
        stagedRates.push(stagedRate);
      }

      await storage.createRatesAuditLog({
        action: "bulk_stage",
        tableName: "rates_staged",
        recordId: "bulk",
        newValues: { count: stagedRates.length },
        changedBy: "admin",
        reason: "Bulk rates staged for review",
      });

      res.json({ success: true, staged: stagedRates.length, rates: stagedRates });
    } catch (error) {
      console.error("Error bulk staging rates:", error);
      res.status(500).json({ error: "Failed to bulk stage rates" });
    }
  });

  // Activate staged rates (Button 4: ACTIVATE)
  app.post("/api/admin/rates/staged/activate", requireAdmin, async (req, res) => {
    try {
      const stagedRates = await storage.getAllRatesStaged();
      if (stagedRates.length === 0) {
        return res.status(400).json({ error: "No staged rates to activate" });
      }

      const previousActiveRates = await storage.getAllRatesActive();
      const activatedRates = await storage.activateStagedRates();

      await storage.createRatesAuditLog({
        action: "activate",
        tableName: "rates_active",
        recordId: "bulk_activation",
        previousValues: { rates: previousActiveRates },
        newValues: { rates: activatedRates },
        changedBy: "admin",
        reason: "Staged rates activated and made live",
      });

      res.json({ 
        success: true, 
        activated: activatedRates.length,
        rates: activatedRates,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Error activating staged rates:", error);
      res.status(500).json({ error: "Failed to activate staged rates" });
    }
  });

  // Clear staged rates
  app.delete("/api/admin/rates/staged", requireAdmin, async (_req, res) => {
    try {
      await storage.clearRatesStaged();
      res.json({ success: true });
    } catch (error) {
      console.error("Error clearing staged rates:", error);
      res.status(500).json({ error: "Failed to clear staged rates" });
    }
  });

  // Research rates with AI (Button 2: RESEARCH)
  app.post("/api/admin/rates/research", requireAdmin, async (req, res) => {
    try {
      const { draftRates } = req.body;
      if (!Array.isArray(draftRates)) {
        return res.status(400).json({ error: "draftRates must be an array" });
      }

      const costs = await storage.getAllCostsBaseline();
      const interchangeCost = costs.find(c => c.name === 'interchange_plus');
      const perTransactionCost = costs.find(c => c.name === 'per_transaction');
      
      const baseCostPercent = interchangeCost?.percentCost ? parseFloat(interchangeCost.percentCost) : 2.20;
      const baseCostFlat = perTransactionCost?.flatCost ? parseFloat(perTransactionCost.flatCost) : 0.30;
      const targetMargin = interchangeCost?.targetMarginPercent ? parseFloat(interchangeCost.targetMarginPercent) : 0.50;

      const competitors = {
        stripe: { name: "Stripe", percent: 2.90, flat: 0.30 },
        paypal: { name: "PayPal", percent: 2.99, flat: 0.49 },
        square: { name: "Square", percent: 2.90, flat: 0.30 },
      };

      const analysis = draftRates.map(rate => {
        const ratePercent = parseFloat(rate.transactionPercent);
        const rateFlat = parseFloat(rate.transactionFlat);
        const margin = ratePercent - baseCostPercent;
        const meetsTarget = margin >= targetMargin;

        const competitorComparison = Object.entries(competitors).map(([key, comp]) => {
          const testAmount = 100;
          const ourFee = (testAmount * ratePercent / 100) + rateFlat;
          const theirFee = (testAmount * comp.percent / 100) + comp.flat;
          const savings = theirFee - ourFee;
          return {
            provider: comp.name,
            rate: `${comp.percent}% + $${comp.flat.toFixed(2)}`,
            fee: theirFee.toFixed(2),
            savings: savings.toFixed(2),
            isLower: ourFee < theirFee,
          };
        });

        let status: "green" | "yellow" | "red" = "green";
        if (!meetsTarget) {
          status = "red";
        } else if (competitorComparison.some(c => !c.isLower)) {
          status = "yellow";
        }

        return {
          tierName: rate.tierName,
          tierType: rate.tierType,
          yourRate: `${ratePercent.toFixed(2)}% + $${rateFlat.toFixed(2)}`,
          yourCost: `${baseCostPercent.toFixed(2)}% + $${baseCostFlat.toFixed(2)}`,
          margin: `${margin.toFixed(2)}%`,
          targetMargin: `${targetMargin.toFixed(2)}%`,
          meetsTarget,
          status,
          competitors: competitorComparison,
        };
      });

      const allMeetTarget = analysis.every(a => a.meetsTarget);
      const allCompetitive = analysis.every(a => a.status !== "yellow");

      const timestamp = new Date().toISOString();
      const report = {
        timestamp,
        baseCosts: {
          interchangePlus: `${baseCostPercent.toFixed(2)}%`,
          perTransaction: `$${baseCostFlat.toFixed(2)}`,
          targetMargin: `${targetMargin.toFixed(2)}%`,
          minimumRateNeeded: `${(baseCostPercent + targetMargin).toFixed(2)}% + $${baseCostFlat.toFixed(2)}`,
        },
        tierAnalysis: analysis,
        competitorRates: {
          swipesBlue: "2.70% + $0.30",
          stripe: "2.90% + $0.30",
          paypal: "2.99% + $0.49",
          square: "2.90% + $0.30",
        },
        summary: {
          allMeetTarget,
          allCompetitive,
          readyToUpload: allMeetTarget,
          message: allMeetTarget 
            ? (allCompetitive 
              ? "All tiers meet target margin and are competitive. Ready to upload."
              : "All tiers meet target margin but some are higher than competitors. Ready to upload.")
            : "Some tiers do not meet target margin. Please adjust before uploading.",
        },
      };

      res.json(report);
    } catch (error) {
      console.error("Error researching rates:", error);
      res.status(500).json({ error: "Failed to research rates" });
    }
  });

  // Compare rates (Button 5: COMPARE)
  app.get("/api/admin/rates/compare", requireAdmin, async (_req, res) => {
    try {
      const activeRates = await storage.getAllRatesActive();
      const stagedRates = await storage.getAllRatesStaged();
      const costs = await storage.getAllCostsBaseline();

      const competitors = {
        stripe: { percent: 2.90, flat: 0.30 },
        paypal: { percent: 2.99, flat: 0.49 },
        square: { percent: 2.90, flat: 0.30 },
      };

      res.json({
        active: activeRates,
        staged: stagedRates,
        costs,
        competitors,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Error comparing rates:", error);
      res.status(500).json({ error: "Failed to compare rates" });
    }
  });

  // ========================================
  // Add-On Products API Endpoints
  // ========================================

  // Get all add-ons (admin)
  app.get("/api/admin/addons", requireAdmin, async (_req, res) => {
    try {
      const addons = await storage.getAllAddOnProducts();
      res.json(addons);
    } catch (error) {
      console.error("Error fetching add-ons:", error);
      res.status(500).json({ error: "Failed to fetch add-ons" });
    }
  });

  // Create add-on (admin)
  app.post("/api/admin/addons", requireAdmin, async (req, res) => {
    try {
      const addOnSchema = z.object({
        name: z.string().min(1),
        slug: z.string().min(1),
        description: z.string().optional(),
        monthlyPrice: z.string().or(z.number()).transform(v => String(v)),
        yearlyPrice: z.string().or(z.number()).transform(v => v ? String(v) : null).optional(),
        features: z.array(z.string()).optional(),
        requiredTier: z.string().optional(),
        category: z.string().optional().default("general"),
        icon: z.string().optional(),
        isActive: z.boolean().optional().default(true),
        displayOrder: z.number().optional().default(0),
      });

      const validated = addOnSchema.parse(req.body);
      const addOn = await storage.createAddOnProduct(validated);
      res.json(addOn);
    } catch (error) {
      console.error("Error creating add-on:", error);
      res.status(500).json({ error: "Failed to create add-on" });
    }
  });

  // Update add-on (admin)
  app.patch("/api/admin/addons/:id", requireAdmin, async (req, res) => {
    try {
      const addOnSchema = z.object({
        name: z.string().min(1).optional(),
        slug: z.string().min(1).optional(),
        description: z.string().optional(),
        monthlyPrice: z.string().or(z.number()).transform(v => String(v)).optional(),
        yearlyPrice: z.string().or(z.number()).transform(v => v ? String(v) : null).optional(),
        features: z.array(z.string()).optional(),
        requiredTier: z.string().optional(),
        category: z.string().optional(),
        icon: z.string().optional(),
        isActive: z.boolean().optional(),
        displayOrder: z.number().optional(),
      });

      const validated = addOnSchema.parse(req.body);
      const addOn = await storage.updateAddOnProduct(req.params.id, validated);
      res.json(addOn);
    } catch (error) {
      console.error("Error updating add-on:", error);
      res.status(500).json({ error: "Failed to update add-on" });
    }
  });

  // Delete add-on (admin)
  app.delete("/api/admin/addons/:id", requireAdmin, async (req, res) => {
    try {
      const deleted = await storage.deleteAddOnProduct(req.params.id);
      res.json({ success: deleted });
    } catch (error) {
      console.error("Error deleting add-on:", error);
      res.status(500).json({ error: "Failed to delete add-on" });
    }
  });

  // Public API: Get active add-ons
  app.get("/api/addons", async (_req, res) => {
    try {
      const addons = await storage.getActiveAddOnProducts();
      res.json(addons);
    } catch (error) {
      console.error("Error fetching add-ons:", error);
      res.status(500).json({ error: "Failed to fetch add-ons" });
    }
  });

  // Public API: Get rates for pricing page (no auth required)
  app.get("/api/rates", async (_req, res) => {
    try {
      const rates = await storage.getAllRatesActive();
      // Only return active rates with public-facing fields
      const publicRates = rates
        .filter(r => r.isActive)
        .map(r => ({
          tierName: r.tierName,
          tierType: r.tierType,
          monthlyFee: r.monthlyFee,
          transactionPercent: r.transactionPercent,
          transactionFlat: r.transactionFlat,
          description: r.description,
          features: r.features,
        }));
      res.json(publicRates);
    } catch (error) {
      console.error("Error fetching public rates:", error);
      res.status(500).json({ error: "Failed to fetch rates" });
    }
  });

  // ========================================
  // Merchant Profile, Transactions & Balances (Prompt 21)
  // ========================================

  // Middleware to protect merchant routes
  function requireMerchant(req: any, res: any, next: any) {
    if ((req.session as any)?.isMerchant === true && (req.session as any)?.merchantId) {
      next();
    } else {
      res.status(401).json({ error: "Unauthorized", message: "Merchant authentication required" });
    }
  }

  // GET /api/merchant/profile — returns merchant account + profile
  app.get("/api/merchant/profile", requireMerchant, async (req, res) => {
    try {
      const merchantId = (req.session as any).merchantId;
      const account = await storage.getMerchantAccountByEmail((req.session as any).merchantEmail || "");
      let profile = await storage.getMerchantProfile(merchantId);

      // Auto-create a default profile if none exists
      if (!profile) {
        profile = await storage.upsertMerchantProfile(merchantId, {});
      }

      res.json({
        ...profile,
        businessName: account?.businessName || "",
        email: account?.email || "",
        fullName: account?.fullName || "",
        tier: account?.tier || "Free",
      });
    } catch (error) {
      console.error("Get merchant profile error:", error);
      res.status(500).json({ error: "Failed to fetch merchant profile" });
    }
  });

  // PATCH /api/merchant/profile — update merchant profile
  app.patch("/api/merchant/profile", requireMerchant, async (req, res) => {
    try {
      const merchantId = (req.session as any).merchantId;
      const { businessName, ...profileFields } = req.body;

      // Update businessName on merchant_accounts if provided
      if (businessName !== undefined) {
        await storage.updateMerchantAccountBusinessName(merchantId, businessName);
      }

      // Update the profile
      const profile = await storage.upsertMerchantProfile(merchantId, profileFields);

      res.json({ success: true, profile });
    } catch (error) {
      console.error("Update merchant profile error:", error);
      res.status(500).json({ error: "Failed to update merchant profile" });
    }
  });

  // GET /api/merchant/transactions — returns merchant VT transactions
  app.get("/api/merchant/transactions", requireMerchant, async (req, res) => {
    try {
      const merchantId = (req.session as any).merchantId;
      const limit = Math.min(parseInt(String(req.query.limit)) || 50, 100);
      const offset = parseInt(String(req.query.offset)) || 0;
      const transactions = await storage.getMerchantTransactions(merchantId, limit, offset);
      res.json(transactions);
    } catch (error) {
      console.error("Get merchant transactions error:", error);
      res.status(500).json({ error: "Failed to fetch transactions" });
    }
  });

  // GET /api/merchant/balances — placeholder for real payout data
  app.get("/api/merchant/balances", requireMerchant, async (_req, res) => {
    try {
      res.json({
        incoming: 0,
        available: 0,
        totalPaidOut: 0,
        lastPayoutDate: null,
        payouts: [],
        fees: [],
      });
    } catch (error) {
      console.error("Get merchant balances error:", error);
      res.status(500).json({ error: "Failed to fetch balances" });
    }
  });

  // ========================================
  // Merchant Product Catalog API (Prompt 13)
  // ========================================

  // Middleware to require minimum tier (uses shared tier constants)
  function requireTier(minTier: string) {
    return (req: any, res: any, next: any) => {
      const rawTier = (req.session as any)?.merchantTier || "Free";
      if (sharedMeetsMinTier(rawTier, minTier)) {
        next();
      } else {
        const displayTier = normalizeTier(minTier);
        res.status(403).json({
          error: "Upgrade Required",
          message: `This feature requires ${displayTier} tier or higher`,
          requiredTier: displayTier,
          currentTier: normalizeTier(rawTier),
        });
      }
    };
  }

  // GET /api/merchant/products — List merchant products with optional filters
  app.get("/api/merchant/products", requireMerchant, async (req, res) => {
    try {
      const merchantId = (req.session as any).merchantId;
      const allProducts = await storage.getProductsByMerchant(merchantId);

      // Apply optional filters
      const { status, category, search } = req.query;
      let filtered = allProducts;

      if (status && typeof status === "string" && status !== "all") {
        filtered = filtered.filter(p => p.status === status);
      }
      if (category && typeof category === "string" && category !== "all") {
        filtered = filtered.filter(p => p.category === category);
      }
      if (search && typeof search === "string") {
        const q = search.toLowerCase();
        filtered = filtered.filter(p =>
          p.name.toLowerCase().includes(q) ||
          (p.sku && p.sku.toLowerCase().includes(q)) ||
          (p.description && p.description.toLowerCase().includes(q))
        );
      }

      res.json(filtered);
    } catch (error) {
      console.error("Error fetching merchant products:", error);
      res.status(500).json({ message: "Failed to fetch products" });
    }
  });

  // GET /api/merchant/products/count — Product count for limit display
  app.get("/api/merchant/products/count", requireMerchant, async (req, res) => {
    try {
      const merchantId = (req.session as any).merchantId;
      const count = await storage.getProductCountByMerchant(merchantId);
      const rawTier = (req.session as any).merchantTier || "Free";
      const tier = normalizeTier(rawTier);
      const limit = SHARED_TIER_PRODUCT_LIMITS[tier] || 25;
      res.json({ count, limit, tier });
    } catch (error) {
      console.error("Error fetching product count:", error);
      res.status(500).json({ message: "Failed to fetch product count" });
    }
  });

  // GET /api/merchant/products/export — Export products as CSV/JSON/XML
  app.get("/api/merchant/products/export", requireMerchant, requireTier("Growth"), async (req, res) => {
    try {
      const merchantId = (req.session as any).merchantId;
      const { format = "csv", status: filterStatus } = req.query;

      let allProducts = await storage.getProductsByMerchant(merchantId);
      if (filterStatus && typeof filterStatus === "string" && filterStatus !== "all") {
        allProducts = allProducts.filter(p => p.status === filterStatus);
      }

      if (format === "json") {
        const tier = (req.session as any).merchantTier || "Free";
        if (!sharedMeetsMinTier(tier, "Scale")) {
          return res.status(403).json({ error: "JSON export requires Scale tier or higher" });
        }
        res.setHeader("Content-Disposition", "attachment; filename=products.json");
        res.setHeader("Content-Type", "application/json");
        return res.json(allProducts);
      }

      if (format === "xml") {
        const tier = (req.session as any).merchantTier || "Free";
        if (!sharedMeetsMinTier(tier, "Scale")) {
          return res.status(403).json({ error: "XML export requires Scale tier or higher" });
        }
        let xml = '<?xml version="1.0" encoding="UTF-8"?>\n<products>\n';
        for (const p of allProducts) {
          xml += `  <product>\n`;
          xml += `    <name>${escapeXml(p.name)}</name>\n`;
          xml += `    <sku>${escapeXml(p.sku || "")}</sku>\n`;
          xml += `    <price>${p.price}</price>\n`;
          xml += `    <stock>${p.stock}</stock>\n`;
          xml += `    <status>${p.status || "active"}</status>\n`;
          xml += `    <category>${escapeXml(p.category || "")}</category>\n`;
          xml += `    <description>${escapeXml(p.description || "")}</description>\n`;
          xml += `  </product>\n`;
        }
        xml += '</products>';
        res.setHeader("Content-Disposition", "attachment; filename=products.xml");
        res.setHeader("Content-Type", "application/xml");
        return res.send(xml);
      }

      // Default: CSV
      const Papa = (await import("papaparse")).default;
      const csvData = allProducts.map(p => ({
        name: p.name,
        sku: p.sku || "",
        price: p.price,
        compare_at_price: p.compareAtPrice || "",
        category: p.category || "",
        stock: p.stock,
        status: p.status || "active",
        description: p.description || "",
        weight: p.weight || "",
        weight_unit: p.weightUnit || "",
        tax_class: p.taxClass || "",
        seo_title: p.seoTitle || "",
        seo_description: p.seoDescription || "",
        tags: Array.isArray(p.tags) ? (p.tags as string[]).join(", ") : "",
        images: Array.isArray(p.images) ? (p.images as string[]).join(", ") : "",
      }));
      const csv = Papa.unparse(csvData);
      res.setHeader("Content-Disposition", "attachment; filename=products.csv");
      res.setHeader("Content-Type", "text/csv");
      return res.send(csv);
    } catch (error) {
      console.error("Error exporting products:", error);
      res.status(500).json({ message: "Failed to export products" });
    }
  });

  // GET /api/merchant/products/template — Download CSV import template
  app.get("/api/merchant/products/template", requireMerchant, requireTier("Growth"), async (_req, res) => {
    try {
      const Papa = (await import("papaparse")).default;
      const templateCsv = Papa.unparse({
        fields: ["name", "sku", "price", "compare_at_price", "category", "stock", "status", "description", "weight", "weight_unit", "tax_class", "seo_title", "seo_description", "tags", "images"],
        data: [
          ["Example Product", "SKU-001", "29.99", "39.99", "Electronics", "100", "active", "A great product", "1.5", "lb", "standard", "Example Product - Buy Now", "Great product at a great price", "tag1, tag2", "https://example.com/image1.jpg"]
        ],
      });
      res.setHeader("Content-Disposition", "attachment; filename=product_import_template.csv");
      res.setHeader("Content-Type", "text/csv");
      res.send(templateCsv);
    } catch (error) {
      console.error("Error generating template:", error);
      res.status(500).json({ message: "Failed to generate template" });
    }
  });

  // GET /api/merchant/products/import/history — Import history
  app.get("/api/merchant/products/import/history", requireMerchant, requireTier("Growth"), async (req, res) => {
    try {
      const merchantId = (req.session as any).merchantId;
      const imports = await storage.getProductImportsByMerchant(merchantId);
      res.json(imports);
    } catch (error) {
      console.error("Error fetching import history:", error);
      res.status(500).json({ message: "Failed to fetch import history" });
    }
  });

  // GET /api/merchant/products/:id — Single product + variants
  app.get("/api/merchant/products/:id", requireMerchant, async (req, res) => {
    try {
      const merchantId = (req.session as any).merchantId;
      const product = await storage.getProduct(req.params.id);

      if (!product || product.merchantId !== merchantId) {
        return res.status(404).json({ message: "Product not found" });
      }

      const variants = await storage.getVariantsByProduct(product.id);
      res.json({ ...product, variants });
    } catch (error) {
      console.error("Error fetching merchant product:", error);
      res.status(500).json({ message: "Failed to fetch product" });
    }
  });

  // POST /api/merchant/products — Create product (enforce tier limit)
  app.post("/api/merchant/products", requireMerchant, async (req, res) => {
    try {
      const merchantId = (req.session as any).merchantId;
      const rawTier = (req.session as any).merchantTier || "Free";
      const tier = normalizeTier(rawTier);
      const limit = SHARED_TIER_PRODUCT_LIMITS[tier] || 25;

      // Check tier limit
      const currentCount = await storage.getProductCountByMerchant(merchantId);
      if (currentCount >= limit) {
        return res.status(403).json({
          error: "Product limit reached",
          message: `Your ${tier} plan allows up to ${limit === Infinity ? "unlimited" : limit} products. Upgrade to add more.`,
          currentCount,
          limit,
        });
      }

      const productData = {
        ...req.body,
        merchantId,
        status: req.body.status || "active",
      };

      const product = await storage.createProduct(productData);
      res.status(201).json(product);
    } catch (error) {
      console.error("Error creating merchant product:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid product data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create product" });
    }
  });

  // PATCH /api/merchant/products/:id — Update single product (verify ownership)
  app.patch("/api/merchant/products/:id", requireMerchant, async (req, res) => {
    try {
      const merchantId = (req.session as any).merchantId;
      const existing = await storage.getProduct(req.params.id);

      if (!existing || existing.merchantId !== merchantId) {
        return res.status(404).json({ message: "Product not found" });
      }

      const product = await storage.updateProduct(req.params.id, { ...req.body, updatedAt: new Date() });
      res.json(product);
    } catch (error) {
      console.error("Error updating merchant product:", error);
      res.status(500).json({ message: "Failed to update product" });
    }
  });

  // DELETE /api/merchant/products/:id — Soft-delete (verify ownership)
  app.delete("/api/merchant/products/:id", requireMerchant, async (req, res) => {
    try {
      const merchantId = (req.session as any).merchantId;
      const existing = await storage.getProduct(req.params.id);

      if (!existing || existing.merchantId !== merchantId) {
        return res.status(404).json({ message: "Product not found" });
      }

      await storage.updateProduct(req.params.id, { status: "archived" });
      res.json({ message: "Product deleted successfully" });
    } catch (error) {
      console.error("Error deleting merchant product:", error);
      res.status(500).json({ message: "Failed to delete product" });
    }
  });

  // POST /api/merchant/products/bulk-update — Bulk update (Starter+)
  app.post("/api/merchant/products/bulk-update", requireMerchant, requireTier("Growth"), async (req, res) => {
    try {
      const merchantId = (req.session as any).merchantId;
      const { updates } = req.body;

      if (!Array.isArray(updates) || updates.length === 0) {
        return res.status(400).json({ message: "Updates array is required" });
      }

      // Verify ownership of all products
      for (const { id } of updates) {
        const product = await storage.getProduct(id);
        if (!product || product.merchantId !== merchantId) {
          return res.status(403).json({ message: `Product ${id} not found or not owned` });
        }
      }

      const results = await storage.bulkUpdateProducts(updates);
      res.json(results);
    } catch (error) {
      console.error("Error bulk updating products:", error);
      res.status(500).json({ message: "Failed to bulk update products" });
    }
  });

  // POST /api/merchant/products/bulk-delete — Bulk delete (Starter+)
  app.post("/api/merchant/products/bulk-delete", requireMerchant, requireTier("Growth"), async (req, res) => {
    try {
      const merchantId = (req.session as any).merchantId;
      const { ids } = req.body;

      if (!Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ message: "IDs array is required" });
      }

      // Verify ownership
      for (const id of ids) {
        const product = await storage.getProduct(id);
        if (!product || product.merchantId !== merchantId) {
          return res.status(403).json({ message: `Product ${id} not found or not owned` });
        }
      }

      await storage.bulkDeleteProducts(ids);
      res.json({ message: `${ids.length} products deleted` });
    } catch (error) {
      console.error("Error bulk deleting products:", error);
      res.status(500).json({ message: "Failed to bulk delete products" });
    }
  });

  // GET /api/merchant/products/:id/variants — List variants
  app.get("/api/merchant/products/:id/variants", requireMerchant, async (req, res) => {
    try {
      const merchantId = (req.session as any).merchantId;
      const product = await storage.getProduct(req.params.id);

      if (!product || product.merchantId !== merchantId) {
        return res.status(404).json({ message: "Product not found" });
      }

      const variants = await storage.getVariantsByProduct(req.params.id);
      res.json(variants);
    } catch (error) {
      console.error("Error fetching variants:", error);
      res.status(500).json({ message: "Failed to fetch variants" });
    }
  });

  // POST /api/merchant/products/:id/variants — Create variant
  app.post("/api/merchant/products/:id/variants", requireMerchant, async (req, res) => {
    try {
      const merchantId = (req.session as any).merchantId;
      const product = await storage.getProduct(req.params.id);

      if (!product || product.merchantId !== merchantId) {
        return res.status(404).json({ message: "Product not found" });
      }

      const variant = await storage.createVariant({
        ...req.body,
        productId: req.params.id,
      });
      res.status(201).json(variant);
    } catch (error) {
      console.error("Error creating variant:", error);
      res.status(500).json({ message: "Failed to create variant" });
    }
  });

  // PATCH /api/merchant/products/variants/:vid — Update variant
  app.patch("/api/merchant/products/variants/:vid", requireMerchant, async (req, res) => {
    try {
      const variant = await storage.updateVariant(req.params.vid, req.body);
      if (!variant) {
        return res.status(404).json({ message: "Variant not found" });
      }
      res.json(variant);
    } catch (error) {
      console.error("Error updating variant:", error);
      res.status(500).json({ message: "Failed to update variant" });
    }
  });

  // DELETE /api/merchant/products/variants/:vid — Delete variant
  app.delete("/api/merchant/products/variants/:vid", requireMerchant, async (req, res) => {
    try {
      const deleted = await storage.deleteVariant(req.params.vid);
      if (!deleted) {
        return res.status(404).json({ message: "Variant not found" });
      }
      res.json({ message: "Variant deleted" });
    } catch (error) {
      console.error("Error deleting variant:", error);
      res.status(500).json({ message: "Failed to delete variant" });
    }
  });

  // POST /api/merchant/products/import/execute — Execute import from mapped data
  app.post("/api/merchant/products/import/execute", requireMerchant, requireTier("Growth"), async (req, res) => {
    try {
      const merchantId = (req.session as any).merchantId;
      const rawTier = (req.session as any).merchantTier || "Free";
      const tier = normalizeTier(rawTier);
      const limit = SHARED_TIER_PRODUCT_LIMITS[tier] || 25;
      const { products: importProducts, fileName, fileSize, updateExisting } = req.body;

      if (!Array.isArray(importProducts) || importProducts.length === 0) {
        return res.status(400).json({ message: "Products array is required" });
      }

      // Create import record
      const importRecord = await storage.createProductImport({
        merchantId,
        fileName: fileName || "import.csv",
        fileSize: fileSize || 0,
        totalRows: importProducts.length,
        status: "processing",
      });

      let importedCount = 0;
      let updatedCount = 0;
      let skippedCount = 0;
      let errorCount = 0;
      const errors: Array<{ row: number; message: string }> = [];

      const currentCount = await storage.getProductCountByMerchant(merchantId);

      for (let i = 0; i < importProducts.length; i++) {
        try {
          const p = importProducts[i];

          if (!p.name || !p.price) {
            errors.push({ row: i + 1, message: "Name and price are required" });
            errorCount++;
            continue;
          }

          // Check if SKU exists and we should update
          if (p.sku && updateExisting) {
            const existing = await storage.getProductBySkuAndMerchant(p.sku, merchantId);
            if (existing) {
              await storage.updateProduct(existing.id, {
                ...p,
                merchantId,
                updatedAt: new Date(),
              });
              updatedCount++;
              continue;
            }
          }

          // Check limit for new products
          if (currentCount + importedCount >= limit) {
            errors.push({ row: i + 1, message: "Product limit reached" });
            skippedCount++;
            continue;
          }

          await storage.createProduct({
            ...p,
            merchantId,
            stock: p.stock ? parseInt(p.stock) : 0,
            status: p.status || "active",
            tags: p.tags ? (typeof p.tags === "string" ? p.tags.split(",").map((t: string) => t.trim()) : p.tags) : null,
            images: p.images ? (typeof p.images === "string" ? p.images.split(",").map((i: string) => i.trim()) : p.images) : null,
          });
          importedCount++;
        } catch (err: any) {
          errors.push({ row: i + 1, message: err.message || "Unknown error" });
          errorCount++;
        }
      }

      // Update import record
      await storage.updateProductImport(importRecord.id, {
        importedCount,
        updatedCount,
        skippedCount,
        errorCount,
        errors: errors.length > 0 ? errors : null,
        status: "completed",
        completedAt: new Date(),
      });

      res.json({
        importId: importRecord.id,
        importedCount,
        updatedCount,
        skippedCount,
        errorCount,
        errors,
      });
    } catch (error) {
      console.error("Error executing import:", error);
      res.status(500).json({ message: "Failed to execute import" });
    }
  });

  // ══════════════════════════════════════════════════════════════
  // CUSTOMER PORTAL ROUTES (Part 9)
  // ══════════════════════════════════════════════════════════════

  // Customer Accounts
  app.get("/api/merchant/customers", requireMerchant, async (req, res) => {
    try {
      const merchantId = (req.session as any).merchantId;
      const customers = await storage.getCustomerAccountsByMerchant(merchantId);
      res.json(customers);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch customers" });
    }
  });

  app.get("/api/merchant/customers/:id", requireMerchant, async (req, res) => {
    try {
      const customer = await storage.getCustomerAccount(req.params.id);
      if (!customer || customer.merchantId !== (req.session as any).merchantId) {
        return res.status(404).json({ message: "Customer not found" });
      }
      res.json(customer);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch customer" });
    }
  });

  app.post("/api/merchant/customers", requireMerchant, async (req, res) => {
    try {
      const merchantId = (req.session as any).merchantId;
      const parsed = insertCustomerAccountSchema.parse({ ...req.body, merchantId });
      const customer = await storage.createCustomerAccount(parsed);
      res.status(201).json(customer);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create customer" });
    }
  });

  app.patch("/api/merchant/customers/:id", requireMerchant, async (req, res) => {
    try {
      const existing = await storage.getCustomerAccount(req.params.id);
      if (!existing || existing.merchantId !== (req.session as any).merchantId) {
        return res.status(404).json({ message: "Customer not found" });
      }
      const updated = await storage.updateCustomerAccount(req.params.id, req.body);
      res.json(updated);
    } catch (error) {
      res.status(500).json({ message: "Failed to update customer" });
    }
  });

  app.delete("/api/merchant/customers/:id", requireMerchant, async (req, res) => {
    try {
      const existing = await storage.getCustomerAccount(req.params.id);
      if (!existing || existing.merchantId !== (req.session as any).merchantId) {
        return res.status(404).json({ message: "Customer not found" });
      }
      await storage.deleteCustomerAccount(req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete customer" });
    }
  });

  // Customer Payment Methods
  app.get("/api/merchant/customers/:customerId/payment-methods", requireMerchant, async (req, res) => {
    try {
      const customer = await storage.getCustomerAccount(req.params.customerId);
      if (!customer || customer.merchantId !== (req.session as any).merchantId) {
        return res.status(404).json({ message: "Customer not found" });
      }
      const methods = await storage.getCustomerPaymentMethodsByCustomer(req.params.customerId);
      res.json(methods);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch payment methods" });
    }
  });

  app.post("/api/merchant/customers/:customerId/payment-methods", requireMerchant, async (req, res) => {
    try {
      const customer = await storage.getCustomerAccount(req.params.customerId);
      if (!customer || customer.merchantId !== (req.session as any).merchantId) {
        return res.status(404).json({ message: "Customer not found" });
      }
      const parsed = insertCustomerPaymentMethodSchema.parse({ ...req.body, customerId: req.params.customerId });
      const method = await storage.createCustomerPaymentMethod(parsed);
      res.status(201).json(method);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create payment method" });
    }
  });

  app.delete("/api/merchant/customers/:customerId/payment-methods/:id", requireMerchant, async (req, res) => {
    try {
      const customer = await storage.getCustomerAccount(req.params.customerId);
      if (!customer || customer.merchantId !== (req.session as any).merchantId) {
        return res.status(404).json({ message: "Customer not found" });
      }
      await storage.deleteCustomerPaymentMethod(req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete payment method" });
    }
  });

  // Support Tickets
  app.get("/api/merchant/support-tickets", requireMerchant, async (req, res) => {
    try {
      const merchantId = (req.session as any).merchantId;
      const tickets = await storage.getCustomerSupportTicketsByMerchant(merchantId);
      res.json(tickets);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch support tickets" });
    }
  });

  app.get("/api/merchant/support-tickets/:id", requireMerchant, async (req, res) => {
    try {
      const ticket = await storage.getCustomerSupportTicket(req.params.id);
      if (!ticket || ticket.merchantId !== (req.session as any).merchantId) {
        return res.status(404).json({ message: "Ticket not found" });
      }
      res.json(ticket);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch ticket" });
    }
  });

  app.post("/api/merchant/support-tickets", requireMerchant, async (req, res) => {
    try {
      const merchantId = (req.session as any).merchantId;
      const parsed = insertCustomerSupportTicketSchema.parse({ ...req.body, merchantId });
      const ticket = await storage.createCustomerSupportTicket(parsed);
      res.status(201).json(ticket);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create ticket" });
    }
  });

  app.patch("/api/merchant/support-tickets/:id", requireMerchant, async (req, res) => {
    try {
      const ticket = await storage.getCustomerSupportTicket(req.params.id);
      if (!ticket || ticket.merchantId !== (req.session as any).merchantId) {
        return res.status(404).json({ message: "Ticket not found" });
      }
      const updated = await storage.updateCustomerSupportTicket(req.params.id, req.body);
      res.json(updated);
    } catch (error) {
      res.status(500).json({ message: "Failed to update ticket" });
    }
  });

  // ══════════════════════════════════════════════════════════════
  // SECURITY SUITE ROUTES (Part 9)
  // ══════════════════════════════════════════════════════════════

  // Security Settings (one per merchant)
  app.get("/api/merchant/security-settings", requireMerchant, async (req, res) => {
    try {
      const merchantId = (req.session as any).merchantId;
      const settings = await storage.getSecuritySettings(merchantId);
      res.json(settings || {});
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch security settings" });
    }
  });

  app.put("/api/merchant/security-settings", requireMerchant, async (req, res) => {
    try {
      const merchantId = (req.session as any).merchantId;
      const settings = await storage.upsertSecuritySettings(merchantId, req.body);
      res.json(settings);
    } catch (error) {
      res.status(500).json({ message: "Failed to update security settings" });
    }
  });

  // Fraud Scores
  app.get("/api/merchant/fraud-scores", requireMerchant, async (req, res) => {
    try {
      const { transactionId } = req.query;
      if (!transactionId || typeof transactionId !== "string") {
        return res.status(400).json({ message: "transactionId is required" });
      }
      const scores = await storage.getFraudScoresByTransaction(transactionId);
      res.json(scores);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch fraud scores" });
    }
  });

  app.post("/api/merchant/fraud-scores", requireMerchant, async (req, res) => {
    try {
      const parsed = insertFraudScoreSchema.parse(req.body);
      const score = await storage.createFraudScore(parsed);
      res.status(201).json(score);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create fraud score" });
    }
  });

  // Device Fingerprints
  app.get("/api/merchant/device-fingerprints", requireMerchant, async (req, res) => {
    try {
      const merchantId = (req.session as any).merchantId;
      const fingerprints = await storage.getDeviceFingerprintsByMerchant(merchantId);
      res.json(fingerprints);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch device fingerprints" });
    }
  });

  app.post("/api/merchant/device-fingerprints", requireMerchant, async (req, res) => {
    try {
      const merchantId = (req.session as any).merchantId;
      const parsed = insertDeviceFingerprintSchema.parse({ ...req.body, merchantId });
      const fingerprint = await storage.createDeviceFingerprint(parsed);
      res.status(201).json(fingerprint);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create device fingerprint" });
    }
  });

  app.patch("/api/merchant/device-fingerprints/:id", requireMerchant, async (req, res) => {
    try {
      const existing = await storage.getDeviceFingerprint(req.params.id);
      if (!existing || existing.merchantId !== (req.session as any).merchantId) {
        return res.status(404).json({ message: "Fingerprint not found" });
      }
      const updated = await storage.updateDeviceFingerprint(req.params.id, req.body);
      res.json(updated);
    } catch (error) {
      res.status(500).json({ message: "Failed to update device fingerprint" });
    }
  });

  // Chargeback Alerts
  app.get("/api/merchant/chargeback-alerts", requireMerchant, async (req, res) => {
    try {
      const merchantId = (req.session as any).merchantId;
      const alerts = await storage.getChargebackAlertsByMerchant(merchantId);
      res.json(alerts);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch chargeback alerts" });
    }
  });

  app.post("/api/merchant/chargeback-alerts", requireMerchant, async (req, res) => {
    try {
      const merchantId = (req.session as any).merchantId;
      const parsed = insertChargebackAlertSchema.parse({ ...req.body, merchantId });
      const alert = await storage.createChargebackAlert(parsed);
      res.status(201).json(alert);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create chargeback alert" });
    }
  });

  // ══════════════════════════════════════════════════════════════
  // CHECKOUT OPTIMIZER ROUTES (Part 9)
  // ══════════════════════════════════════════════════════════════

  // Checkout Settings (one per merchant)
  app.get("/api/merchant/checkout-settings", requireMerchant, async (req, res) => {
    try {
      const merchantId = (req.session as any).merchantId;
      const settings = await storage.getCheckoutSettings(merchantId);
      res.json(settings || {});
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch checkout settings" });
    }
  });

  app.put("/api/merchant/checkout-settings", requireMerchant, async (req, res) => {
    try {
      const merchantId = (req.session as any).merchantId;
      const settings = await storage.upsertCheckoutSettings(merchantId, req.body);
      res.json(settings);
    } catch (error) {
      res.status(500).json({ message: "Failed to update checkout settings" });
    }
  });

  // A/B Tests
  app.get("/api/merchant/ab-tests", requireMerchant, async (req, res) => {
    try {
      const merchantId = (req.session as any).merchantId;
      const tests = await storage.getAbTestsByMerchant(merchantId);
      res.json(tests);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch A/B tests" });
    }
  });

  app.get("/api/merchant/ab-tests/:id", requireMerchant, async (req, res) => {
    try {
      const test = await storage.getAbTest(req.params.id);
      if (!test || test.merchantId !== (req.session as any).merchantId) {
        return res.status(404).json({ message: "A/B test not found" });
      }
      res.json(test);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch A/B test" });
    }
  });

  app.post("/api/merchant/ab-tests", requireMerchant, async (req, res) => {
    try {
      const merchantId = (req.session as any).merchantId;
      const parsed = insertAbTestSchema.parse({ ...req.body, merchantId });
      const test = await storage.createAbTest(parsed);
      res.status(201).json(test);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create A/B test" });
    }
  });

  app.patch("/api/merchant/ab-tests/:id", requireMerchant, async (req, res) => {
    try {
      const existing = await storage.getAbTest(req.params.id);
      if (!existing || existing.merchantId !== (req.session as any).merchantId) {
        return res.status(404).json({ message: "A/B test not found" });
      }
      const updated = await storage.updateAbTest(req.params.id, req.body);
      res.json(updated);
    } catch (error) {
      res.status(500).json({ message: "Failed to update A/B test" });
    }
  });

  app.delete("/api/merchant/ab-tests/:id", requireMerchant, async (req, res) => {
    try {
      const existing = await storage.getAbTest(req.params.id);
      if (!existing || existing.merchantId !== (req.session as any).merchantId) {
        return res.status(404).json({ message: "A/B test not found" });
      }
      await storage.deleteAbTest(req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete A/B test" });
    }
  });

  // A/B Test Results
  app.get("/api/merchant/ab-tests/:testId/results", requireMerchant, async (req, res) => {
    try {
      const test = await storage.getAbTest(req.params.testId);
      if (!test || test.merchantId !== (req.session as any).merchantId) {
        return res.status(404).json({ message: "A/B test not found" });
      }
      const results = await storage.getAbTestResultsByTest(req.params.testId);
      res.json(results);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch A/B test results" });
    }
  });

  app.post("/api/merchant/ab-tests/:testId/results", requireMerchant, async (req, res) => {
    try {
      const test = await storage.getAbTest(req.params.testId);
      if (!test || test.merchantId !== (req.session as any).merchantId) {
        return res.status(404).json({ message: "A/B test not found" });
      }
      const parsed = insertAbTestResultSchema.parse({ ...req.body, testId: req.params.testId });
      const result = await storage.createAbTestResult(parsed);
      res.status(201).json(result);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create A/B test result" });
    }
  });

  // Checkout Analytics
  app.get("/api/merchant/checkout-analytics", requireMerchant, async (req, res) => {
    try {
      const merchantId = (req.session as any).merchantId;
      const analytics = await storage.getCheckoutAnalyticsByMerchant(merchantId);
      res.json(analytics);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch checkout analytics" });
    }
  });

  app.post("/api/merchant/checkout-analytics", requireMerchant, async (req, res) => {
    try {
      const merchantId = (req.session as any).merchantId;
      const parsed = insertCheckoutAnalyticsSchema.parse({ ...req.body, merchantId });
      const record = await storage.createCheckoutAnalytics(parsed);
      res.status(201).json(record);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create checkout analytics" });
    }
  });

  // ══════════════════════════════════════════════════════════════
  // SHOPPING CART PRO ROUTES (Part 9)
  // ══════════════════════════════════════════════════════════════

  // Saved Carts
  app.get("/api/merchant/saved-carts", requireMerchant, async (req, res) => {
    try {
      const merchantId = (req.session as any).merchantId;
      const carts = await storage.getSavedCartsByMerchant(merchantId);
      res.json(carts);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch saved carts" });
    }
  });

  app.get("/api/merchant/saved-carts/:id", requireMerchant, async (req, res) => {
    try {
      const cart = await storage.getSavedCart(req.params.id);
      if (!cart || cart.merchantId !== (req.session as any).merchantId) {
        return res.status(404).json({ message: "Saved cart not found" });
      }
      res.json(cart);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch saved cart" });
    }
  });

  app.get("/api/shared-cart/:token", async (req, res) => {
    try {
      const cart = await storage.getSavedCartByShareToken(req.params.token);
      if (!cart) {
        return res.status(404).json({ message: "Shared cart not found" });
      }
      res.json(cart);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch shared cart" });
    }
  });

  app.post("/api/merchant/saved-carts", requireMerchant, async (req, res) => {
    try {
      const merchantId = (req.session as any).merchantId;
      const parsed = insertSavedCartSchema.parse({ ...req.body, merchantId });
      const cart = await storage.createSavedCart(parsed);
      res.status(201).json(cart);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create saved cart" });
    }
  });

  app.delete("/api/merchant/saved-carts/:id", requireMerchant, async (req, res) => {
    try {
      const cart = await storage.getSavedCart(req.params.id);
      if (!cart || cart.merchantId !== (req.session as any).merchantId) {
        return res.status(404).json({ message: "Saved cart not found" });
      }
      await storage.deleteSavedCart(req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete saved cart" });
    }
  });

  // Cart Recommendations
  app.get("/api/merchant/cart-recommendations", requireMerchant, async (req, res) => {
    try {
      const merchantId = (req.session as any).merchantId;
      const recs = await storage.getCartRecommendationsByMerchant(merchantId);
      res.json(recs);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch cart recommendations" });
    }
  });

  app.post("/api/merchant/cart-recommendations", requireMerchant, async (req, res) => {
    try {
      const merchantId = (req.session as any).merchantId;
      const parsed = insertCartRecommendationSchema.parse({ ...req.body, merchantId });
      const rec = await storage.createCartRecommendation(parsed);
      res.status(201).json(rec);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create cart recommendation" });
    }
  });

  app.delete("/api/merchant/cart-recommendations/:id", requireMerchant, async (req, res) => {
    try {
      await storage.deleteCartRecommendation(req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete cart recommendation" });
    }
  });

  // Cart Notes
  app.get("/api/merchant/cart-notes/:cartId", requireMerchant, async (req, res) => {
    try {
      const notes = await storage.getCartNotesByCart(req.params.cartId);
      res.json(notes);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch cart notes" });
    }
  });

  app.post("/api/merchant/cart-notes", requireMerchant, async (req, res) => {
    try {
      const parsed = insertCartNoteSchema.parse(req.body);
      const note = await storage.createCartNote(parsed);
      res.status(201).json(note);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create cart note" });
    }
  });

  app.delete("/api/merchant/cart-notes/:id", requireMerchant, async (req, res) => {
    try {
      await storage.deleteCartNote(req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete cart note" });
    }
  });

  // Inventory Reservations
  app.get("/api/merchant/inventory-reservations", requireMerchant, async (req, res) => {
    try {
      const { productId } = req.query;
      if (productId && typeof productId === "string") {
        const reservations = await storage.getInventoryReservationsByProduct(productId);
        return res.json(reservations);
      }
      res.status(400).json({ message: "productId query parameter is required" });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch inventory reservations" });
    }
  });

  app.post("/api/merchant/inventory-reservations", requireMerchant, async (req, res) => {
    try {
      const parsed = insertInventoryReservationSchema.parse(req.body);
      const reservation = await storage.createInventoryReservation(parsed);
      res.status(201).json(reservation);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create inventory reservation" });
    }
  });

  app.patch("/api/merchant/inventory-reservations/:id", requireMerchant, async (req, res) => {
    try {
      const updated = await storage.updateInventoryReservation(req.params.id, req.body);
      if (!updated) {
        return res.status(404).json({ message: "Reservation not found" });
      }
      res.json(updated);
    } catch (error) {
      res.status(500).json({ message: "Failed to update inventory reservation" });
    }
  });

  // ══════════════════════════════════════════════════════════════
  // ANALYTICS ROUTES (Part 9)
  // ══════════════════════════════════════════════════════════════

  // Daily Analytics
  app.get("/api/merchant/analytics/daily", requireMerchant, async (req, res) => {
    try {
      const merchantId = (req.session as any).merchantId;
      const { startDate, endDate } = req.query;
      const start = startDate ? new Date(startDate as string) : undefined;
      const end = endDate ? new Date(endDate as string) : undefined;
      const data = await storage.getAnalyticsDailyByMerchant(merchantId, start, end);
      res.json(data);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch daily analytics" });
    }
  });

  app.post("/api/merchant/analytics/daily", requireMerchant, async (req, res) => {
    try {
      const merchantId = (req.session as any).merchantId;
      const parsed = insertAnalyticsDailySchema.parse({ ...req.body, merchantId });
      const record = await storage.createAnalyticsDaily(parsed);
      res.status(201).json(record);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create daily analytics" });
    }
  });

  // Product Analytics
  app.get("/api/merchant/analytics/products", requireMerchant, async (req, res) => {
    try {
      const merchantId = (req.session as any).merchantId;
      const data = await storage.getAnalyticsProductsByMerchant(merchantId);
      res.json(data);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch product analytics" });
    }
  });

  app.post("/api/merchant/analytics/products", requireMerchant, async (req, res) => {
    try {
      const merchantId = (req.session as any).merchantId;
      const parsed = insertAnalyticsProductsSchema.parse({ ...req.body, merchantId });
      const record = await storage.createAnalyticsProducts(parsed);
      res.status(201).json(record);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create product analytics" });
    }
  });

  // Customer LTV
  app.get("/api/merchant/analytics/ltv", requireMerchant, async (req, res) => {
    try {
      const merchantId = (req.session as any).merchantId;
      const data = await storage.getCustomerLtvByMerchant(merchantId);
      res.json(data);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch customer LTV data" });
    }
  });

  app.post("/api/merchant/analytics/ltv", requireMerchant, async (req, res) => {
    try {
      const merchantId = (req.session as any).merchantId;
      const parsed = insertCustomerLtvSchema.parse({ ...req.body, merchantId });
      const record = await storage.createCustomerLtv(parsed);
      res.status(201).json(record);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create customer LTV record" });
    }
  });

  // Scheduled Reports
  app.get("/api/merchant/scheduled-reports", requireMerchant, async (req, res) => {
    try {
      const merchantId = (req.session as any).merchantId;
      const reports = await storage.getScheduledReportsByMerchant(merchantId);
      res.json(reports);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch scheduled reports" });
    }
  });

  app.post("/api/merchant/scheduled-reports", requireMerchant, async (req, res) => {
    try {
      const merchantId = (req.session as any).merchantId;
      const parsed = insertScheduledReportSchema.parse({ ...req.body, merchantId });
      const report = await storage.createScheduledReport(parsed);
      res.status(201).json(report);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create scheduled report" });
    }
  });

  app.patch("/api/merchant/scheduled-reports/:id", requireMerchant, async (req, res) => {
    try {
      const existing = await storage.getScheduledReport(req.params.id);
      if (!existing || existing.merchantId !== (req.session as any).merchantId) {
        return res.status(404).json({ message: "Report not found" });
      }
      const updated = await storage.updateScheduledReport(req.params.id, req.body);
      res.json(updated);
    } catch (error) {
      res.status(500).json({ message: "Failed to update scheduled report" });
    }
  });

  app.delete("/api/merchant/scheduled-reports/:id", requireMerchant, async (req, res) => {
    try {
      const existing = await storage.getScheduledReport(req.params.id);
      if (!existing || existing.merchantId !== (req.session as any).merchantId) {
        return res.status(404).json({ message: "Report not found" });
      }
      await storage.deleteScheduledReport(req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete scheduled report" });
    }
  });

  // ══════════════════════════════════════════════════════════════
  // BRANDING ROUTES (Part 9)
  // ══════════════════════════════════════════════════════════════

  // Brand Settings (one per merchant)
  app.get("/api/merchant/brand-settings", requireMerchant, async (req, res) => {
    try {
      const merchantId = (req.session as any).merchantId;
      const settings = await storage.getBrandSettings(merchantId);
      res.json(settings || {});
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch brand settings" });
    }
  });

  app.put("/api/merchant/brand-settings", requireMerchant, async (req, res) => {
    try {
      const merchantId = (req.session as any).merchantId;
      const settings = await storage.upsertBrandSettings(merchantId, req.body);
      res.json(settings);
    } catch (error) {
      res.status(500).json({ message: "Failed to update brand settings" });
    }
  });

  // Email Templates
  app.get("/api/merchant/email-templates", requireMerchant, async (req, res) => {
    try {
      const merchantId = (req.session as any).merchantId;
      const templates = await storage.getEmailTemplatesByMerchant(merchantId);
      res.json(templates);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch email templates" });
    }
  });

  app.get("/api/merchant/email-templates/:id", requireMerchant, async (req, res) => {
    try {
      const template = await storage.getEmailTemplate(req.params.id);
      if (!template || template.merchantId !== (req.session as any).merchantId) {
        return res.status(404).json({ message: "Template not found" });
      }
      res.json(template);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch email template" });
    }
  });

  app.post("/api/merchant/email-templates", requireMerchant, async (req, res) => {
    try {
      const merchantId = (req.session as any).merchantId;
      const parsed = insertEmailTemplateSchema.parse({ ...req.body, merchantId });
      const template = await storage.createEmailTemplate(parsed);
      res.status(201).json(template);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create email template" });
    }
  });

  app.patch("/api/merchant/email-templates/:id", requireMerchant, async (req, res) => {
    try {
      const existing = await storage.getEmailTemplate(req.params.id);
      if (!existing || existing.merchantId !== (req.session as any).merchantId) {
        return res.status(404).json({ message: "Template not found" });
      }
      const updated = await storage.updateEmailTemplate(req.params.id, req.body);
      res.json(updated);
    } catch (error) {
      res.status(500).json({ message: "Failed to update email template" });
    }
  });

  app.delete("/api/merchant/email-templates/:id", requireMerchant, async (req, res) => {
    try {
      const existing = await storage.getEmailTemplate(req.params.id);
      if (!existing || existing.merchantId !== (req.session as any).merchantId) {
        return res.status(404).json({ message: "Template not found" });
      }
      await storage.deleteEmailTemplate(req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete email template" });
    }
  });

  // Receipt Settings (one per merchant)
  app.get("/api/merchant/receipt-settings", requireMerchant, async (req, res) => {
    try {
      const merchantId = (req.session as any).merchantId;
      const settings = await storage.getReceiptSettings(merchantId);
      res.json(settings || {});
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch receipt settings" });
    }
  });

  app.put("/api/merchant/receipt-settings", requireMerchant, async (req, res) => {
    try {
      const merchantId = (req.session as any).merchantId;
      const settings = await storage.upsertReceiptSettings(merchantId, req.body);
      res.json(settings);
    } catch (error) {
      res.status(500).json({ message: "Failed to update receipt settings" });
    }
  });

  // ══════════════════════════════════════════════════════════════
  // SUBSCRIPTION ROUTES (Part 9)
  // ══════════════════════════════════════════════════════════════

  // Merchant Subscriptions
  app.get("/api/merchant/subscriptions", requireMerchant, async (req, res) => {
    try {
      const merchantId = (req.session as any).merchantId;
      const subs = await storage.getMerchantSubscriptionsByMerchant(merchantId);
      res.json(subs);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch subscriptions" });
    }
  });

  app.post("/api/merchant/subscriptions", requireMerchant, async (req, res) => {
    try {
      const merchantId = (req.session as any).merchantId;
      const parsed = insertMerchantSubscriptionSchema.parse({ ...req.body, merchantId });
      const sub = await storage.createMerchantSubscription(parsed);
      res.status(201).json(sub);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create subscription" });
    }
  });

  app.patch("/api/merchant/subscriptions/:id", requireMerchant, async (req, res) => {
    try {
      const existing = await storage.getMerchantSubscription(req.params.id);
      if (!existing || existing.merchantId !== (req.session as any).merchantId) {
        return res.status(404).json({ message: "Subscription not found" });
      }
      const updated = await storage.updateMerchantSubscription(req.params.id, req.body);
      res.json(updated);
    } catch (error) {
      res.status(500).json({ message: "Failed to update subscription" });
    }
  });

  // Addon Subscriptions
  app.get("/api/merchant/addon-subscriptions", requireMerchant, async (req, res) => {
    try {
      const merchantId = (req.session as any).merchantId;
      const subs = await storage.getAddonSubscriptionsByMerchant(merchantId);
      res.json(subs);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch addon subscriptions" });
    }
  });

  app.post("/api/merchant/addon-subscriptions", requireMerchant, async (req, res) => {
    try {
      const merchantId = (req.session as any).merchantId;
      const parsed = insertAddonSubscriptionSchema.parse({ ...req.body, merchantId });
      const sub = await storage.createAddonSubscription(parsed);
      res.status(201).json(sub);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create addon subscription" });
    }
  });

  app.patch("/api/merchant/addon-subscriptions/:id", requireMerchant, async (req, res) => {
    try {
      const existing = await storage.getAddonSubscription(req.params.id);
      if (!existing || existing.merchantId !== (req.session as any).merchantId) {
        return res.status(404).json({ message: "Addon subscription not found" });
      }
      const updated = await storage.updateAddonSubscription(req.params.id, req.body);
      res.json(updated);
    } catch (error) {
      res.status(500).json({ message: "Failed to update addon subscription" });
    }
  });

  // ══════════════════════════════════════════════════════════════
  // API LOGS ROUTES (Part 9)
  // ══════════════════════════════════════════════════════════════

  app.get("/api/merchant/api-logs", requireMerchant, async (req, res) => {
    try {
      const merchantId = (req.session as any).merchantId;
      const logs = await storage.getApiLogsByMerchant(merchantId);
      res.json(logs);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch API logs" });
    }
  });

  // ══════════════════════════════════════════════════════════════
  // CUSTOMER VAULT ROUTES (Prompt 10)
  // ══════════════════════════════════════════════════════════════

  app.get("/api/merchant/vault", requireMerchant, async (req, res) => {
    try {
      const merchantId = (req.session as any).merchantId;
      const customers = await storage.getCustomerVaultByMerchant(merchantId);
      res.json(customers);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch vault customers" });
    }
  });

  app.get("/api/merchant/vault/:id", requireMerchant, async (req, res) => {
    try {
      const customer = await storage.getCustomerVaultRecord(req.params.id);
      if (!customer || customer.merchantId !== (req.session as any).merchantId) {
        return res.status(404).json({ message: "Vault customer not found" });
      }
      res.json(customer);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch vault customer" });
    }
  });

  app.post("/api/merchant/vault", requireMerchant, async (req, res) => {
    try {
      const merchantId = (req.session as any).merchantId;
      const parsed = insertCustomerVaultSchema.parse({ ...req.body, merchantId });
      const customer = await storage.createCustomerVaultRecord(parsed);
      res.status(201).json(customer);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create vault customer" });
    }
  });

  app.patch("/api/merchant/vault/:id", requireMerchant, async (req, res) => {
    try {
      const existing = await storage.getCustomerVaultRecord(req.params.id);
      if (!existing || existing.merchantId !== (req.session as any).merchantId) {
        return res.status(404).json({ message: "Vault customer not found" });
      }
      const updated = await storage.updateCustomerVaultRecord(req.params.id, req.body);
      res.json(updated);
    } catch (error) {
      res.status(500).json({ message: "Failed to update vault customer" });
    }
  });

  app.delete("/api/merchant/vault/:id", requireMerchant, async (req, res) => {
    try {
      const existing = await storage.getCustomerVaultRecord(req.params.id);
      if (!existing || existing.merchantId !== (req.session as any).merchantId) {
        return res.status(404).json({ message: "Vault customer not found" });
      }
      await storage.deleteCustomerVaultRecord(req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete vault customer" });
    }
  });

  // Vault Payment Methods
  app.get("/api/merchant/vault/:customerId/payment-methods", requireMerchant, async (req, res) => {
    try {
      const customer = await storage.getCustomerVaultRecord(req.params.customerId);
      if (!customer || customer.merchantId !== (req.session as any).merchantId) {
        return res.status(404).json({ message: "Vault customer not found" });
      }
      const methods = await storage.getVaultPaymentMethodsByCustomer(req.params.customerId);
      res.json(methods);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch vault payment methods" });
    }
  });

  app.post("/api/merchant/vault/:customerId/payment-methods", requireMerchant, async (req, res) => {
    try {
      const customer = await storage.getCustomerVaultRecord(req.params.customerId);
      if (!customer || customer.merchantId !== (req.session as any).merchantId) {
        return res.status(404).json({ message: "Vault customer not found" });
      }
      const parsed = insertVaultPaymentMethodSchema.parse({ ...req.body, customerId: req.params.customerId });
      const method = await storage.createVaultPaymentMethod(parsed);
      res.status(201).json(method);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create vault payment method" });
    }
  });

  app.delete("/api/merchant/vault/:customerId/payment-methods/:id", requireMerchant, async (req, res) => {
    try {
      const customer = await storage.getCustomerVaultRecord(req.params.customerId);
      if (!customer || customer.merchantId !== (req.session as any).merchantId) {
        return res.status(404).json({ message: "Vault customer not found" });
      }
      await storage.deleteVaultPaymentMethod(req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete vault payment method" });
    }
  });

  // Helper function for XML escaping
  function escapeXml(str: string): string {
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&apos;");
  }

  const httpServer = createServer(app);

  return httpServer;
}
