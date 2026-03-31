import { sql } from "drizzle-orm";
import {
  pgTable,
  text,
  varchar,
  decimal,
  integer,
  timestamp,
  boolean,
  json,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session table for express-session
export const session = pgTable("session", {
  sid: varchar("sid").primaryKey(),
  sess: json("sess").notNull(),
  expire: timestamp("expire").notNull(),
});

// Users table
export const users = pgTable("users", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// Merchant Accounts table - for merchant/business authentication
export const merchantAccounts = pgTable("merchant_accounts", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  businessName: text("business_name").notNull(),
  fullName: text("full_name").notNull(),
  tier: text("tier").notNull().default("Free"), // 'Free' | 'Growth' | 'Scale' | 'Enterprise'
  status: text("status").notNull().default("active"), // 'active' | 'suspended' | 'pending'
  signupPath: text("signup_path").default("ecommerce"), // 'ecommerce' | 'developer' | 'gateway'
  createdAt: timestamp("created_at").notNull().defaultNow(),
  lastLoginAt: timestamp("last_login_at"),
});

export const insertMerchantAccountSchema = createInsertSchema(merchantAccounts).omit({
  id: true,
  createdAt: true,
  lastLoginAt: true,
});

export const registerMerchantSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  businessName: z.string().min(1, "Business name is required"),
  fullName: z.string().min(1, "Full name is required"),
  signupPath: z.enum(["ecommerce", "developer", "gateway"]).default("ecommerce"),
});

export const loginMerchantSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export type InsertMerchantAccount = z.infer<typeof insertMerchantAccountSchema>;
export type MerchantAccount = typeof merchantAccounts.$inferSelect;
export type RegisterMerchantInput = z.infer<typeof registerMerchantSchema>;
export type LoginMerchantInput = z.infer<typeof loginMerchantSchema>;

// Products table
export const products = pgTable("products", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  image: text("image"),
  category: text("category"),
  stock: integer("stock").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  // Prompt 13: Merchant catalog columns
  merchantId: varchar("merchant_id"),
  sku: text("sku"),
  compareAtPrice: decimal("compare_at_price", { precision: 10, scale: 2 }),
  tags: json("tags").$type<string[]>(),
  images: json("images").$type<string[]>(),
  weight: decimal("weight", { precision: 10, scale: 2 }),
  weightUnit: text("weight_unit").default("lb"),
  taxClass: text("tax_class"),
  seoTitle: text("seo_title"),
  seoDescription: text("seo_description"),
  status: text("status").default("active"), // 'active' | 'draft' | 'archived'
  lowStockThreshold: integer("low_stock_threshold").default(5),
  trackInventory: boolean("track_inventory").default(true),
  metadata: json("metadata"),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertProductSchema = createInsertSchema(products).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertProduct = z.infer<typeof insertProductSchema>;
export type Product = typeof products.$inferSelect;

// Product Variants table (Prompt 13)
export const productVariants = pgTable("product_variants", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  productId: varchar("product_id")
    .notNull()
    .references(() => products.id, { onDelete: "cascade" }),
  variantType: text("variant_type").notNull(), // e.g., 'size', 'color'
  variantValue: text("variant_value").notNull(), // e.g., 'Large', 'Red'
  price: decimal("price", { precision: 10, scale: 2 }),
  sku: text("sku"),
  stockQuantity: integer("stock_quantity").default(0),
  weight: decimal("weight", { precision: 10, scale: 2 }),
  status: text("status").default("active"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertProductVariantSchema = createInsertSchema(productVariants).omit({
  id: true,
  createdAt: true,
});

export type InsertProductVariant = z.infer<typeof insertProductVariantSchema>;
export type ProductVariant = typeof productVariants.$inferSelect;

// Product Imports table (Prompt 13)
export const productImports = pgTable("product_imports", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  merchantId: varchar("merchant_id").notNull(),
  fileName: text("file_name").notNull(),
  fileSize: integer("file_size"),
  totalRows: integer("total_rows").default(0),
  importedCount: integer("imported_count").default(0),
  updatedCount: integer("updated_count").default(0),
  skippedCount: integer("skipped_count").default(0),
  errorCount: integer("error_count").default(0),
  errors: json("errors").$type<Array<{ row: number; message: string }>>(),
  status: text("status").notNull().default("pending"), // 'pending' | 'processing' | 'completed' | 'failed'
  createdAt: timestamp("created_at").notNull().defaultNow(),
  completedAt: timestamp("completed_at"),
});

export const insertProductImportSchema = createInsertSchema(productImports).omit({
  id: true,
  createdAt: true,
});

export type InsertProductImport = z.infer<typeof insertProductImportSchema>;
export type ProductImport = typeof productImports.$inferSelect;

// Cart items table
export const cartItems = pgTable("cart_items", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  sessionId: text("session_id").notNull(),
  productId: varchar("product_id")
    .notNull()
    .references(() => products.id, { onDelete: "cascade" }),
  quantity: integer("quantity").notNull().default(1),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertCartItemSchema = createInsertSchema(cartItems).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertCartItem = z.infer<typeof insertCartItemSchema>;
export type CartItem = typeof cartItems.$inferSelect;

// Orders table
export const orders = pgTable("orders", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  orderNumber: text("order_number").notNull().unique(),
  sessionId: text("session_id").notNull(),
  customerEmail: text("customer_email").notNull(),
  customerName: text("customer_name").notNull(),
  shippingAddress: text("shipping_address").notNull(),
  shippingCity: text("shipping_city").notNull(),
  shippingState: text("shipping_state").notNull(),
  shippingZip: text("shipping_zip").notNull(),
  subtotal: decimal("subtotal", { precision: 10, scale: 2 }).notNull(),
  tax: decimal("tax", { precision: 10, scale: 2 }).notNull(),
  shipping: decimal("shipping", { precision: 10, scale: 2 }).notNull(),
  discount: decimal("discount", { precision: 10, scale: 2 })
    .notNull()
    .default("0"),
  total: decimal("total", { precision: 10, scale: 2 }).notNull(),
  status: text("status").notNull().default("pending"),
  paymentStatus: text("payment_status").notNull().default("pending"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertOrderSchema = createInsertSchema(orders).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertOrder = z.infer<typeof insertOrderSchema>;
export type Order = typeof orders.$inferSelect;

// Order items table
export const orderItems = pgTable("order_items", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  orderId: varchar("order_id")
    .notNull()
    .references(() => orders.id, { onDelete: "cascade" }),
  productId: varchar("product_id")
    .notNull()
    .references(() => products.id),
  productName: text("product_name").notNull(),
  productPrice: decimal("product_price", { precision: 10, scale: 2 }).notNull(),
  quantity: integer("quantity").notNull(),
  subtotal: decimal("subtotal", { precision: 10, scale: 2 }).notNull(),
});

export const insertOrderItemSchema = createInsertSchema(orderItems).omit({
  id: true,
});

export type InsertOrderItem = z.infer<typeof insertOrderItemSchema>;
export type OrderItem = typeof orderItems.$inferSelect;

// Payment gateways configuration table
export const paymentGateways = pgTable("payment_gateways", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  type: text("type").notNull(),
  isActive: boolean("is_active").notNull().default(false),
  isDefault: boolean("is_default").notNull().default(false),
  config: json("config"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertPaymentGatewaySchema = createInsertSchema(
  paymentGateways,
).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertPaymentGateway = z.infer<typeof insertPaymentGatewaySchema>;
export type PaymentGateway = typeof paymentGateways.$inferSelect;

// Payment transactions table (internal orders)
export const paymentTransactions = pgTable("payment_transactions", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  orderId: varchar("order_id")
    .notNull()
    .references(() => orders.id),
  gatewayId: varchar("gateway_id")
    .notNull()
    .references(() => paymentGateways.id),
  gatewayTransactionId: text("gateway_transaction_id"),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  status: text("status").notNull(),
  paymentMethod: text("payment_method"),
  errorMessage: text("error_message"),
  gatewayResponse: json("gateway_response"),
  merchantId: varchar("merchant_id").references(() => merchants.id), // Link to merchant if applicable
  platform: text("platform"), // Which platform initiated this transaction
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertPaymentTransactionSchema = createInsertSchema(
  paymentTransactions,
).omit({
  id: true,
  createdAt: true,
});

export type InsertPaymentTransaction = z.infer<
  typeof insertPaymentTransactionSchema
>;
export type PaymentTransaction = typeof paymentTransactions.$inferSelect;

// Merchants table - NMI sub-merchant accounts for partner platforms
export const merchants = pgTable("merchants", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  platform: text("platform").notNull(), // 'businessblueprint' | 'hostsblue' | 'swipesblue'
  platformClientId: text("platform_client_id").notNull(), // BB/HB client ID
  nmiMerchantId: text("nmi_merchant_id"), // NMI sub-merchant ID (null until approved)
  partnerId: text("partner_id").notNull(), // Our NMI Partner ID
  businessName: text("business_name").notNull(),
  businessEmail: text("business_email").notNull(),
  businessPhone: text("business_phone"),
  businessAddress: text("business_address"),
  businessCity: text("business_city"),
  businessState: text("business_state"),
  businessZip: text("business_zip"),
  businessCountry: text("business_country").notNull().default("US"),
  status: text("status").notNull().default("pending"), // 'pending' | 'active' | 'suspended' | 'rejected'
  nmiApplicationStatus: text("nmi_application_status"), // Status from NMI boarding process
  nmiApplicationData: json("nmi_application_data"), // Full NMI boarding response
  metadata: json("metadata"), // Additional platform-specific data
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertMerchantSchema = createInsertSchema(merchants).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertMerchant = z.infer<typeof insertMerchantSchema>;
export type Merchant = typeof merchants.$inferSelect;

// API Keys table - for partner platform authentication
export const apiKeys = pgTable("api_keys", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  platform: text("platform").notNull(), // 'businessblueprint' | 'hostsblue' | 'swipesblue' | 'scansblue' | 'internal'
  name: text("name").notNull(), // Friendly name for the key
  apiKey: text("api_key").notNull().unique(), // The actual API key (hashed in production)
  apiSecret: text("api_secret"), // Optional secret for HMAC signing
  isActive: boolean("is_active").notNull().default(true),
  permissions: json("permissions"), // Array of permitted operations
  metadata: json("metadata"), // Additional platform-specific data
  lastUsedAt: timestamp("last_used_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertApiKeySchema = createInsertSchema(apiKeys).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertApiKey = z.infer<typeof insertApiKeySchema>;
export type ApiKey = typeof apiKeys.$inferSelect;

// Partner Payment Transactions table - for external partner payments
export const partnerPaymentTransactions = pgTable(
  "partner_payment_transactions",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    merchantId: varchar("merchant_id")
      .notNull()
      .references(() => merchants.id),
    platform: text("platform").notNull(), // Which platform initiated this payment
    platformOrderId: text("platform_order_id"), // Order ID from the partner platform (BB/HB)
    gatewayTransactionId: text("gateway_transaction_id"), // NMI transaction ID
    amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
    currency: text("currency").notNull().default("USD"),
    status: text("status").notNull(), // 'success' | 'failed' | 'pending' | 'refunded'
    paymentMethod: text("payment_method"), // 'credit_card' | 'debit_card' | etc.
    cardBrand: text("card_brand"), // 'visa' | 'mastercard' | 'amex' | etc.
    cardLastFour: text("card_last_four"), // Last 4 digits of card
    customerEmail: text("customer_email"),
    customerName: text("customer_name"),
    billingAddress: json("billing_address"), // Billing address details
    errorMessage: text("error_message"),
    gatewayResponse: json("gateway_response"), // Full NMI response
    metadata: json("metadata"), // Additional transaction data from partner
    refundedAmount: decimal("refunded_amount", {
      precision: 10,
      scale: 2,
    }).default("0"),
    refundedAt: timestamp("refunded_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
);

export const insertPartnerPaymentTransactionSchema = createInsertSchema(
  partnerPaymentTransactions,
).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertPartnerPaymentTransaction = z.infer<
  typeof insertPartnerPaymentTransactionSchema
>;
export type PartnerPaymentTransaction =
  typeof partnerPaymentTransactions.$inferSelect;

// Webhook Endpoints table - for storing webhook subscription configurations
export const webhookEndpoints = pgTable("webhook_endpoints", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  platform: text("platform").notNull(), // 'businessblueprint' | 'hostsblue' | 'swipesblue'
  url: text("url").notNull(), // Webhook endpoint URL
  events: json("events").notNull(), // Array of subscribed event types
  secret: text("secret").notNull(), // HMAC secret for signature verification
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertWebhookEndpointSchema = createInsertSchema(
  webhookEndpoints,
).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertWebhookEndpoint = z.infer<typeof insertWebhookEndpointSchema>;
export type WebhookEndpoint = typeof webhookEndpoints.$inferSelect;

// Webhook Deliveries table - for tracking webhook delivery attempts and status
export const webhookDeliveries = pgTable("webhook_deliveries", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  endpointId: varchar("endpoint_id")
    .notNull()
    .references(() => webhookEndpoints.id, { onDelete: "cascade" }),
  event: text("event").notNull(), // Event type (e.g., 'payment.success')
  payload: json("payload").notNull(), // The event payload sent to webhook
  status: text("status").notNull().default("pending"), // 'pending' | 'success' | 'failed'
  attempts: integer("attempts").notNull().default(0), // Number of delivery attempts
  nextRetry: timestamp("next_retry"), // When to retry next (null if not retrying)
  responseStatus: integer("response_status"), // HTTP status code from webhook endpoint
  responseBody: text("response_body"), // Response from webhook endpoint
  errorMessage: text("error_message"), // Error message if failed
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertWebhookDeliverySchema = createInsertSchema(
  webhookDeliveries,
).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertWebhookDelivery = z.infer<typeof insertWebhookDeliverySchema>;
export type WebhookDelivery = typeof webhookDeliveries.$inferSelect;

// Rates Active table - current live transaction rates for each tier
export const ratesActive = pgTable("rates_active", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  tierName: text("tier_name").notNull(), // 'Free' | 'Growth' | 'Scale' | 'Enterprise' | 'API' | 'API Pro'
  tierType: text("tier_type").notNull(), // 'ecommerce' | 'developer'
  monthlyFee: decimal("monthly_fee", { precision: 10, scale: 2 })
    .notNull()
    .default("0"),
  transactionPercent: decimal("transaction_percent", {
    precision: 5,
    scale: 3,
  }).notNull(), // e.g., 2.900 for 2.9%
  transactionFlat: decimal("transaction_flat", {
    precision: 10,
    scale: 2,
  }).notNull(), // e.g., 0.30 for 30¢
  description: text("description"),
  features: json("features"), // Array of feature strings
  isActive: boolean("is_active").notNull().default(true),
  displayOrder: integer("display_order").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertRatesActiveSchema = createInsertSchema(ratesActive).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertRatesActive = z.infer<typeof insertRatesActiveSchema>;
export type RatesActive = typeof ratesActive.$inferSelect;

// Rates Staged table - pending rate changes waiting for approval
export const ratesStaged = pgTable("rates_staged", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  tierName: text("tier_name").notNull(),
  tierType: text("tier_type").notNull(),
  monthlyFee: decimal("monthly_fee", { precision: 10, scale: 2 })
    .notNull()
    .default("0"),
  transactionPercent: decimal("transaction_percent", {
    precision: 5,
    scale: 3,
  }).notNull(),
  transactionFlat: decimal("transaction_flat", {
    precision: 10,
    scale: 2,
  }).notNull(),
  description: text("description"),
  features: json("features"),
  isActive: boolean("is_active").notNull().default(true),
  displayOrder: integer("display_order").notNull().default(0),
  status: text("status").notNull().default("pending"), // 'pending' | 'approved' | 'rejected'
  createdBy: text("created_by"),
  approvedBy: text("approved_by"),
  effectiveDate: timestamp("effective_date"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertRatesStagedSchema = createInsertSchema(ratesStaged).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertRatesStaged = z.infer<typeof insertRatesStagedSchema>;
export type RatesStaged = typeof ratesStaged.$inferSelect;

// Costs Baseline table - base costs from payment processor (NMI)
export const costsBaseline = pgTable("costs_baseline", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  name: text("name").notNull(), // 'interchange_plus' | 'per_transaction' | 'monthly_gateway'
  description: text("description"),
  percentCost: decimal("percent_cost", { precision: 5, scale: 3 }), // e.g., 1.800 for 1.8%
  flatCost: decimal("flat_cost", { precision: 10, scale: 2 }), // e.g., 0.10 for 10¢
  targetMarginPercent: decimal("target_margin_percent", {
    precision: 5,
    scale: 2,
  }), // Target profit margin
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertCostsBaselineSchema = createInsertSchema(costsBaseline).omit(
  {
    id: true,
    createdAt: true,
    updatedAt: true,
  },
);

export type InsertCostsBaseline = z.infer<typeof insertCostsBaselineSchema>;
export type CostsBaseline = typeof costsBaseline.$inferSelect;

// Rates Audit Log table - tracks all rate changes
export const ratesAuditLog = pgTable("rates_audit_log", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  action: text("action").notNull(), // 'create' | 'update' | 'delete' | 'approve' | 'reject'
  tableName: text("table_name").notNull(), // Which table was modified
  recordId: text("record_id").notNull(), // ID of the modified record
  previousValues: json("previous_values"), // Values before change
  newValues: json("new_values"), // Values after change
  changedBy: text("changed_by"),
  reason: text("reason"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertRatesAuditLogSchema = createInsertSchema(ratesAuditLog).omit(
  {
    id: true,
    createdAt: true,
  },
);

export type InsertRatesAuditLog = z.infer<typeof insertRatesAuditLogSchema>;
export type RatesAuditLog = typeof ratesAuditLog.$inferSelect;

// Add-On Products table - optional add-ons for e-commerce tiers
export const addOnProducts = pgTable("add_on_products", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  description: text("description"),
  monthlyPrice: decimal("monthly_price", { precision: 10, scale: 2 }), // Deprecated - keeping for backward compatibility
  yearlyPrice: decimal("yearly_price", { precision: 10, scale: 2 }), // Legacy field - use annualPrice
  annualPrice: decimal("annual_price", { precision: 10, scale: 2 }), // Primary price (annual subscription)
  features: json("features"), // Array of feature strings
  requiredTier: text("required_tier"), // Minimum tier required (null = any tier)
  category: text("category").notNull().default("general"), // 'marketing' | 'analytics' | 'security' | 'integration' | 'general'
  icon: text("icon"), // Lucide icon name
  isActive: boolean("is_active").notNull().default(true),
  displayOrder: integer("display_order").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertAddOnProductSchema = createInsertSchema(addOnProducts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertAddOnProduct = z.infer<typeof insertAddOnProductSchema>;
export type AddOnProduct = typeof addOnProducts.$inferSelect;

// Conversations table for AI chat
export const conversations = pgTable("conversations", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertConversationSchema = createInsertSchema(conversations).omit({
  id: true,
  createdAt: true,
});

export type InsertConversation = z.infer<typeof insertConversationSchema>;
export type Conversation = typeof conversations.$inferSelect;

// Messages table for AI chat
export const messages = pgTable("messages", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  conversationId: varchar("conversation_id")
    .notNull()
    .references(() => conversations.id, { onDelete: "cascade" }),
  role: text("role").notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertMessageSchema = createInsertSchema(messages).omit({
  id: true,
  createdAt: true,
});

export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type Message = typeof messages.$inferSelect;

// ========================================
// Part 9: Customer Portal Tables
// ========================================

export const customerAccounts = pgTable("customer_accounts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  merchantId: varchar("merchant_id").notNull(),
  email: text("email").notNull(),
  passwordHash: text("password_hash").notNull(),
  name: text("name"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  lastLogin: timestamp("last_login"),
});

export const insertCustomerAccountSchema = createInsertSchema(customerAccounts).omit({
  id: true,
  createdAt: true,
});
export type InsertCustomerAccount = z.infer<typeof insertCustomerAccountSchema>;
export type CustomerAccount = typeof customerAccounts.$inferSelect;

export const customerPaymentMethods = pgTable("customer_payment_methods", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  customerId: varchar("customer_id").notNull(),
  cardLastFour: text("card_last_four"),
  cardBrand: text("card_brand"),
  token: text("token"),
  isDefault: boolean("is_default").default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertCustomerPaymentMethodSchema = createInsertSchema(customerPaymentMethods).omit({
  id: true,
  createdAt: true,
});
export type InsertCustomerPaymentMethod = z.infer<typeof insertCustomerPaymentMethodSchema>;
export type CustomerPaymentMethod = typeof customerPaymentMethods.$inferSelect;

export const customerSupportTickets = pgTable("customer_support_tickets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  customerId: varchar("customer_id").notNull(),
  merchantId: varchar("merchant_id").notNull(),
  subject: text("subject").notNull(),
  message: text("message").notNull(),
  status: text("status").notNull().default("open"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertCustomerSupportTicketSchema = createInsertSchema(customerSupportTickets).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertCustomerSupportTicket = z.infer<typeof insertCustomerSupportTicketSchema>;
export type CustomerSupportTicket = typeof customerSupportTickets.$inferSelect;

// ========================================
// Part 9: Security Suite Tables
// ========================================

export const securitySettings = pgTable("security_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  merchantId: varchar("merchant_id").notNull().unique(),
  velocityEnabled: boolean("velocity_enabled").default(false),
  velocityCardLimit: integer("velocity_card_limit"),
  velocityIpLimit: integer("velocity_ip_limit"),
  velocityWindowMinutes: integer("velocity_window_minutes"),
  geoBlockingEnabled: boolean("geo_blocking_enabled").default(false),
  blockedCountries: json("blocked_countries"),
  deviceFingerprintEnabled: boolean("device_fingerprint_enabled").default(false),
  threedsEnabled: boolean("threeds_enabled").default(false),
  threedsThresholdAmount: decimal("threeds_threshold_amount", { precision: 10, scale: 2 }),
  fraudScoreEnabled: boolean("fraud_score_enabled").default(false),
  fraudScoreDeclineThreshold: integer("fraud_score_decline_threshold"),
  fraudScoreReviewThreshold: integer("fraud_score_review_threshold"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertSecuritySettingsSchema = createInsertSchema(securitySettings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertSecuritySettings = z.infer<typeof insertSecuritySettingsSchema>;
export type SecuritySettings = typeof securitySettings.$inferSelect;

export const fraudScores = pgTable("fraud_scores", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  transactionId: varchar("transaction_id").notNull(),
  score: integer("score").notNull(),
  riskFactors: json("risk_factors"),
  decision: text("decision").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertFraudScoreSchema = createInsertSchema(fraudScores).omit({
  id: true,
  createdAt: true,
});
export type InsertFraudScore = z.infer<typeof insertFraudScoreSchema>;
export type FraudScore = typeof fraudScores.$inferSelect;

export const deviceFingerprints = pgTable("device_fingerprints", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  fingerprintHash: text("fingerprint_hash").notNull(),
  merchantId: varchar("merchant_id").notNull(),
  isBlocked: boolean("is_blocked").default(false),
  transactionCount: integer("transaction_count").default(0),
  firstSeen: timestamp("first_seen").notNull().defaultNow(),
  lastSeen: timestamp("last_seen").notNull().defaultNow(),
});

export const insertDeviceFingerprintSchema = createInsertSchema(deviceFingerprints).omit({
  id: true,
  firstSeen: true,
  lastSeen: true,
});
export type InsertDeviceFingerprint = z.infer<typeof insertDeviceFingerprintSchema>;
export type DeviceFingerprint = typeof deviceFingerprints.$inferSelect;

export const chargebackAlerts = pgTable("chargeback_alerts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  merchantId: varchar("merchant_id").notNull(),
  transactionId: varchar("transaction_id").notNull(),
  alertType: text("alert_type").notNull(),
  alertSource: text("alert_source"),
  amount: decimal("amount", { precision: 10, scale: 2 }),
  actionTaken: text("action_taken"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertChargebackAlertSchema = createInsertSchema(chargebackAlerts).omit({
  id: true,
  createdAt: true,
});
export type InsertChargebackAlert = z.infer<typeof insertChargebackAlertSchema>;
export type ChargebackAlert = typeof chargebackAlerts.$inferSelect;

// ========================================
// Part 9: Checkout Optimizer Tables
// ========================================

export const checkoutSettings = pgTable("checkout_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  merchantId: varchar("merchant_id").notNull().unique(),
  oneClickEnabled: boolean("one_click_enabled").default(false),
  expressCheckoutEnabled: boolean("express_checkout_enabled").default(false),
  applePayEnabled: boolean("apple_pay_enabled").default(false),
  googlePayEnabled: boolean("google_pay_enabled").default(false),
  addressAutocompleteEnabled: boolean("address_autocomplete_enabled").default(false),
  smartValidationEnabled: boolean("smart_validation_enabled").default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertCheckoutSettingsSchema = createInsertSchema(checkoutSettings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertCheckoutSettings = z.infer<typeof insertCheckoutSettingsSchema>;
export type CheckoutSettings = typeof checkoutSettings.$inferSelect;

export const abTests = pgTable("ab_tests", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  merchantId: varchar("merchant_id").notNull(),
  testName: text("test_name").notNull(),
  variantAConfig: json("variant_a_config"),
  variantBConfig: json("variant_b_config"),
  startDate: timestamp("start_date"),
  endDate: timestamp("end_date"),
  status: text("status").notNull().default("draft"),
  winner: text("winner"),
});

export const insertAbTestSchema = createInsertSchema(abTests).omit({
  id: true,
});
export type InsertAbTest = z.infer<typeof insertAbTestSchema>;
export type AbTest = typeof abTests.$inferSelect;

export const abTestResults = pgTable("ab_test_results", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  testId: varchar("test_id").notNull(),
  variant: text("variant").notNull(),
  sessions: integer("sessions").default(0),
  conversions: integer("conversions").default(0),
  conversionRate: decimal("conversion_rate", { precision: 5, scale: 4 }),
  revenue: decimal("revenue", { precision: 10, scale: 2 }),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertAbTestResultSchema = createInsertSchema(abTestResults).omit({
  id: true,
  updatedAt: true,
});
export type InsertAbTestResult = z.infer<typeof insertAbTestResultSchema>;
export type AbTestResult = typeof abTestResults.$inferSelect;

export const checkoutAnalytics = pgTable("checkout_analytics", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  merchantId: varchar("merchant_id").notNull(),
  date: timestamp("date").notNull(),
  cartViews: integer("cart_views").default(0),
  checkoutStarts: integer("checkout_starts").default(0),
  paymentAttempts: integer("payment_attempts").default(0),
  completions: integer("completions").default(0),
  avgTimeToCheckout: integer("avg_time_to_checkout"),
  deviceType: text("device_type"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertCheckoutAnalyticsSchema = createInsertSchema(checkoutAnalytics).omit({
  id: true,
  createdAt: true,
});
export type InsertCheckoutAnalytics = z.infer<typeof insertCheckoutAnalyticsSchema>;
export type CheckoutAnalytics = typeof checkoutAnalytics.$inferSelect;

// ========================================
// Part 9: Shopping Cart Pro Tables
// ========================================

export const savedCarts = pgTable("saved_carts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  customerId: varchar("customer_id"),
  merchantId: varchar("merchant_id").notNull(),
  cartData: json("cart_data").notNull(),
  shareToken: text("share_token").unique(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  expiresAt: timestamp("expires_at"),
});

export const insertSavedCartSchema = createInsertSchema(savedCarts).omit({
  id: true,
  createdAt: true,
});
export type InsertSavedCart = z.infer<typeof insertSavedCartSchema>;
export type SavedCart = typeof savedCarts.$inferSelect;

export const cartRecommendations = pgTable("cart_recommendations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  merchantId: varchar("merchant_id").notNull(),
  productId: varchar("product_id").notNull(),
  recommendedProductId: varchar("recommended_product_id").notNull(),
  recommendationType: text("recommendation_type").notNull(),
  priority: integer("priority").default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertCartRecommendationSchema = createInsertSchema(cartRecommendations).omit({
  id: true,
  createdAt: true,
});
export type InsertCartRecommendation = z.infer<typeof insertCartRecommendationSchema>;
export type CartRecommendation = typeof cartRecommendations.$inferSelect;

export const cartNotes = pgTable("cart_notes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  cartId: varchar("cart_id").notNull(),
  noteText: text("note_text"),
  isGiftMessage: boolean("is_gift_message").default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertCartNoteSchema = createInsertSchema(cartNotes).omit({
  id: true,
  createdAt: true,
});
export type InsertCartNote = z.infer<typeof insertCartNoteSchema>;
export type CartNote = typeof cartNotes.$inferSelect;

export const inventoryReservations = pgTable("inventory_reservations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  productId: varchar("product_id").notNull(),
  cartId: varchar("cart_id").notNull(),
  quantity: integer("quantity").notNull(),
  reservedAt: timestamp("reserved_at").notNull().defaultNow(),
  expiresAt: timestamp("expires_at").notNull(),
  status: text("status").notNull().default("active"),
});

export const insertInventoryReservationSchema = createInsertSchema(inventoryReservations).omit({
  id: true,
  reservedAt: true,
});
export type InsertInventoryReservation = z.infer<typeof insertInventoryReservationSchema>;
export type InventoryReservation = typeof inventoryReservations.$inferSelect;

// ========================================
// Part 9: Analytics Tables
// ========================================

export const analyticsDaily = pgTable("analytics_daily", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  merchantId: varchar("merchant_id").notNull(),
  date: timestamp("date").notNull(),
  revenue: decimal("revenue", { precision: 10, scale: 2 }),
  transactionCount: integer("transaction_count").default(0),
  successCount: integer("success_count").default(0),
  failedCount: integer("failed_count").default(0),
  avgOrderValue: decimal("avg_order_value", { precision: 10, scale: 2 }),
  newCustomers: integer("new_customers").default(0),
  returningCustomers: integer("returning_customers").default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertAnalyticsDailySchema = createInsertSchema(analyticsDaily).omit({
  id: true,
  createdAt: true,
});
export type InsertAnalyticsDaily = z.infer<typeof insertAnalyticsDailySchema>;
export type AnalyticsDaily = typeof analyticsDaily.$inferSelect;

export const analyticsProducts = pgTable("analytics_products", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  merchantId: varchar("merchant_id").notNull(),
  productId: varchar("product_id").notNull(),
  date: timestamp("date").notNull(),
  unitsSold: integer("units_sold").default(0),
  revenue: decimal("revenue", { precision: 10, scale: 2 }),
  views: integer("views").default(0),
  addToCartCount: integer("add_to_cart_count").default(0),
});

export const insertAnalyticsProductsSchema = createInsertSchema(analyticsProducts).omit({
  id: true,
});
export type InsertAnalyticsProducts = z.infer<typeof insertAnalyticsProductsSchema>;
export type AnalyticsProducts = typeof analyticsProducts.$inferSelect;

export const customerLtv = pgTable("customer_ltv", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  customerId: varchar("customer_id").notNull(),
  merchantId: varchar("merchant_id").notNull(),
  totalSpent: decimal("total_spent", { precision: 10, scale: 2 }),
  orderCount: integer("order_count").default(0),
  firstOrderDate: timestamp("first_order_date"),
  lastOrderDate: timestamp("last_order_date"),
  avgOrderValue: decimal("avg_order_value", { precision: 10, scale: 2 }),
  calculatedAt: timestamp("calculated_at").notNull().defaultNow(),
});

export const insertCustomerLtvSchema = createInsertSchema(customerLtv).omit({
  id: true,
  calculatedAt: true,
});
export type InsertCustomerLtv = z.infer<typeof insertCustomerLtvSchema>;
export type CustomerLtv = typeof customerLtv.$inferSelect;

export const scheduledReports = pgTable("scheduled_reports", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  merchantId: varchar("merchant_id").notNull(),
  reportType: text("report_type").notNull(),
  recipients: json("recipients"),
  frequency: text("frequency").notNull(),
  lastSent: timestamp("last_sent"),
  nextSend: timestamp("next_send"),
  config: json("config"),
  isActive: boolean("is_active").default(true),
});

export const insertScheduledReportSchema = createInsertSchema(scheduledReports).omit({
  id: true,
});
export type InsertScheduledReport = z.infer<typeof insertScheduledReportSchema>;
export type ScheduledReport = typeof scheduledReports.$inferSelect;

// ========================================
// Part 9: Branding Tables
// ========================================

export const brandSettings = pgTable("brand_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  merchantId: varchar("merchant_id").notNull().unique(),
  logoUrl: text("logo_url"),
  faviconUrl: text("favicon_url"),
  primaryColor: text("primary_color"),
  secondaryColor: text("secondary_color"),
  backgroundColor: text("background_color"),
  textColor: text("text_color"),
  fontFamily: text("font_family"),
  customFontUrl: text("custom_font_url"),
  removeSwipesblueBranding: boolean("remove_swipesblue_branding").default(false),
  customDomain: text("custom_domain"),
  customDomainVerified: boolean("custom_domain_verified").default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertBrandSettingsSchema = createInsertSchema(brandSettings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertBrandSettings = z.infer<typeof insertBrandSettingsSchema>;
export type BrandSettings = typeof brandSettings.$inferSelect;

export const emailTemplates = pgTable("email_templates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  merchantId: varchar("merchant_id").notNull(),
  templateType: text("template_type").notNull(),
  subject: text("subject"),
  bodyHtml: text("body_html"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertEmailTemplateSchema = createInsertSchema(emailTemplates).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertEmailTemplate = z.infer<typeof insertEmailTemplateSchema>;
export type EmailTemplate = typeof emailTemplates.$inferSelect;

export const receiptSettings = pgTable("receipt_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  merchantId: varchar("merchant_id").notNull().unique(),
  showLogo: boolean("show_logo").default(true),
  headerText: text("header_text"),
  footerText: text("footer_text"),
  termsText: text("terms_text"),
  customFields: json("custom_fields"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertReceiptSettingsSchema = createInsertSchema(receiptSettings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertReceiptSettings = z.infer<typeof insertReceiptSettingsSchema>;
export type ReceiptSettings = typeof receiptSettings.$inferSelect;

// ========================================
// Part 9: Subscription Tables
// ========================================

export const merchantSubscriptions = pgTable("merchant_subscriptions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  merchantId: varchar("merchant_id").notNull(),
  tier: text("tier").notNull(),
  status: text("status").notNull().default("active"),
  startedAt: timestamp("started_at").notNull().defaultNow(),
  expiresAt: timestamp("expires_at"),
});

export const insertMerchantSubscriptionSchema = createInsertSchema(merchantSubscriptions).omit({
  id: true,
  startedAt: true,
});
export type InsertMerchantSubscription = z.infer<typeof insertMerchantSubscriptionSchema>;
export type MerchantSubscription = typeof merchantSubscriptions.$inferSelect;

export const addonSubscriptions = pgTable("addon_subscriptions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  merchantId: varchar("merchant_id").notNull(),
  addonId: varchar("addon_id").notNull(),
  status: text("status").notNull().default("active"),
  startedAt: timestamp("started_at").notNull().defaultNow(),
  expiresAt: timestamp("expires_at"),
});

export const insertAddonSubscriptionSchema = createInsertSchema(addonSubscriptions).omit({
  id: true,
  startedAt: true,
});
export type InsertAddonSubscription = z.infer<typeof insertAddonSubscriptionSchema>;
export type AddonSubscription = typeof addonSubscriptions.$inferSelect;

// ========================================
// Part 9: API Logs Table
// ========================================

export const apiLogs = pgTable("api_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  merchantId: varchar("merchant_id"),
  apiKeyId: varchar("api_key_id"),
  endpoint: text("endpoint"),
  method: text("method"),
  requestBody: json("request_body"),
  responseCode: integer("response_code"),
  responseTimeMs: integer("response_time_ms"),
  ipAddress: text("ip_address"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertApiLogSchema = createInsertSchema(apiLogs).omit({
  id: true,
  createdAt: true,
});
export type InsertApiLog = z.infer<typeof insertApiLogSchema>;
export type ApiLog = typeof apiLogs.$inferSelect;

// ========================================
// Customer Vault Tables (triadblue-aligned)
// ========================================

export const customerVault = pgTable("customer_vault", {
  // === SYSTEM IDENTIFIERS ===
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  triadblueId: varchar("triadblue_id").default(sql`gen_random_uuid()`).unique(),
  sourcePlatform: text("source_platform").notNull().default("swipesblue"),
  merchantId: varchar("merchant_id"),

  // === SHARED CONTACT FIELDS (identical to businessblueprint /relationships) ===
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  company: text("company"),
  jobTitle: text("job_title"),
  website: text("website"),

  // === SHARED ADDRESS FIELDS ===
  billingAddress: text("billing_address"),
  billingCity: text("billing_city"),
  billingState: text("billing_state"),
  billingZip: text("billing_zip"),
  billingCountry: text("billing_country").default("US"),
  shippingAddress: text("shipping_address"),
  shippingCity: text("shipping_city"),
  shippingState: text("shipping_state"),
  shippingZip: text("shipping_zip"),
  shippingCountry: text("shipping_country").default("US"),

  // === SHARED METADATA ===
  tags: json("tags").$type<string[]>().default([]),
  notes: text("notes"),
  metadata: json("metadata"),

  // === SWIPESBLUE-SPECIFIC FIELDS ===
  customerId: text("customer_id").unique(),
  lifetimeValue: integer("lifetime_value").default(0),
  transactionCount: integer("transaction_count").default(0),
  lastTransactionAt: timestamp("last_transaction_at"),
  riskScore: text("risk_score"),
  status: text("status").notNull().default("active"),

  // === TIMESTAMPS ===
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertCustomerVaultSchema = createInsertSchema(customerVault).omit({
  id: true,
  triadblueId: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertCustomerVault = z.infer<typeof insertCustomerVaultSchema>;
export type CustomerVaultRecord = typeof customerVault.$inferSelect;

export const vaultPaymentMethods = pgTable("vault_payment_methods", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  customerId: varchar("customer_id").notNull().references(() => customerVault.id, { onDelete: "cascade" }),
  type: text("type").notNull(),
  cardBrand: text("card_brand"),
  cardLastFour: text("card_last_four"),
  cardExpMonth: text("card_exp_month"),
  cardExpYear: text("card_exp_year"),
  nmiToken: text("nmi_token"),
  isDefault: boolean("is_default").default(false),
  nickname: text("nickname"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertVaultPaymentMethodSchema = createInsertSchema(vaultPaymentMethods).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertVaultPaymentMethod = z.infer<typeof insertVaultPaymentMethodSchema>;
export type VaultPaymentMethod = typeof vaultPaymentMethods.$inferSelect;

// ========================================
// Tier Entitlements Table (Prompt 14)
// ========================================

export const tierEntitlements = pgTable("tier_entitlements", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tierName: text("tier_name").notNull(), // 'Free' | 'Growth' | 'Scale' | 'Enterprise'
  featureKey: text("feature_key").notNull(),
  featureValue: json("feature_value"), // JSON value for complex features
  limit: integer("limit"), // null = unlimited
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertTierEntitlementSchema = createInsertSchema(tierEntitlements).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertTierEntitlement = z.infer<typeof insertTierEntitlementSchema>;
export type TierEntitlement = typeof tierEntitlements.$inferSelect;

// ========================================
// Merchant Profiles Table (Prompt 21)
// ========================================

export const merchantProfiles = pgTable("merchant_profiles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  merchantId: varchar("merchant_id").notNull().unique(),
  dbaName: text("dba_name"),
  businessType: text("business_type"),
  industry: text("industry"),
  phone: text("phone"),
  address: text("address"),
  city: text("city"),
  state: text("state"),
  zip: text("zip"),
  country: text("country").default("US"),
  website: text("website"),
  taxId: text("tax_id"),
  supportEmail: text("support_email"),
  supportPhone: text("support_phone"),
  brandColor: text("brand_color"),
  checkoutLogoUrl: text("checkout_logo_url"),
  businessLogoUrl: text("business_logo_url"),
  notificationPrefs: json("notification_prefs"),
  paymentSettings: json("payment_settings"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertMerchantProfileSchema = createInsertSchema(merchantProfiles).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertMerchantProfile = z.infer<typeof insertMerchantProfileSchema>;
export type MerchantProfile = typeof merchantProfiles.$inferSelect;

// ========================================
// Merchant Transactions Table (Prompt 21)
// ========================================

export const merchantTransactions = pgTable("merchant_transactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  merchantId: varchar("merchant_id").notNull(),
  transactionId: text("transaction_id"),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  currency: text("currency").notNull().default("USD"),
  status: text("status").notNull(), // 'approved' | 'declined' | 'pending'
  type: text("type").notNull().default("sale"), // 'sale' | 'auth'
  customerName: text("customer_name"),
  cardBrand: text("card_brand"),
  cardLastFour: text("card_last_four"),
  authCode: text("auth_code"),
  email: text("email"),
  description: text("description"),
  orderId: text("order_id"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertMerchantTransactionSchema = createInsertSchema(merchantTransactions).omit({
  id: true,
  createdAt: true,
});
export type InsertMerchantTransaction = z.infer<typeof insertMerchantTransactionSchema>;
export type MerchantTransaction = typeof merchantTransactions.$inferSelect;
