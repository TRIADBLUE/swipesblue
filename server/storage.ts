import { db } from "./db";
import {
  type User,
  type InsertUser,
  type Product,
  type InsertProduct,
  type CartItem,
  type InsertCartItem,
  type Order,
  type InsertOrder,
  type OrderItem,
  type InsertOrderItem,
  type PaymentGateway,
  type InsertPaymentGateway,
  type PaymentTransaction,
  type InsertPaymentTransaction,
  type Merchant,
  type InsertMerchant,
  type ApiKey,
  type InsertApiKey,
  type PartnerPaymentTransaction,
  type InsertPartnerPaymentTransaction,
  type WebhookEndpoint,
  type InsertWebhookEndpoint,
  type WebhookDelivery,
  type InsertWebhookDelivery,
  type RatesActive,
  type InsertRatesActive,
  type RatesStaged,
  type InsertRatesStaged,
  type CostsBaseline,
  type InsertCostsBaseline,
  type RatesAuditLog,
  type InsertRatesAuditLog,
  type AddOnProduct,
  type InsertAddOnProduct,
  type MerchantAccount,
  type InsertMerchantAccount,
  type ProductVariant,
  type InsertProductVariant,
  type ProductImport,
  type InsertProductImport,
  type TierEntitlement,
  type InsertTierEntitlement,
  type CustomerAccount,
  type InsertCustomerAccount,
  type CustomerPaymentMethod,
  type InsertCustomerPaymentMethod,
  type CustomerSupportTicket,
  type InsertCustomerSupportTicket,
  type SecuritySettings,
  type InsertSecuritySettings,
  type FraudScore,
  type InsertFraudScore,
  type DeviceFingerprint,
  type InsertDeviceFingerprint,
  type ChargebackAlert,
  type InsertChargebackAlert,
  type CheckoutSettings,
  type InsertCheckoutSettings,
  type AbTest,
  type InsertAbTest,
  type AbTestResult,
  type InsertAbTestResult,
  type CheckoutAnalytics,
  type InsertCheckoutAnalytics,
  type SavedCart,
  type InsertSavedCart,
  type CartRecommendation,
  type InsertCartRecommendation,
  type CartNote,
  type InsertCartNote,
  type InventoryReservation,
  type InsertInventoryReservation,
  type AnalyticsDaily,
  type InsertAnalyticsDaily,
  type AnalyticsProducts,
  type InsertAnalyticsProducts,
  type CustomerLtv,
  type InsertCustomerLtv,
  type ScheduledReport,
  type InsertScheduledReport,
  type BrandSettings,
  type InsertBrandSettings,
  type EmailTemplate,
  type InsertEmailTemplate,
  type ReceiptSettings,
  type InsertReceiptSettings,
  type MerchantSubscription,
  type InsertMerchantSubscription,
  type AddonSubscription,
  type InsertAddonSubscription,
  type ApiLog,
  type InsertApiLog,
  type CustomerVaultRecord,
  type InsertCustomerVault,
  type VaultPaymentMethod,
  type InsertVaultPaymentMethod,
  type CheckoutSession,
  type InsertCheckoutSession,
  type MerchantProfile,
  type InsertMerchantProfile,
  type MerchantTransaction,
  type InsertMerchantTransaction,
  type Conversation,
  type InsertConversation,
  type Message,
  type InsertMessage,
  users,
  products,
  cartItems,
  orders,
  orderItems,
  paymentGateways,
  paymentTransactions,
  merchants,
  apiKeys,
  partnerPaymentTransactions,
  webhookEndpoints,
  webhookDeliveries,
  ratesActive,
  ratesStaged,
  costsBaseline,
  ratesAuditLog,
  addOnProducts,
  merchantAccounts,
  productVariants,
  productImports,
  tierEntitlements,
  customerAccounts,
  customerPaymentMethods,
  customerSupportTickets,
  securitySettings,
  fraudScores,
  deviceFingerprints,
  chargebackAlerts,
  checkoutSettings,
  abTests,
  abTestResults,
  checkoutAnalytics,
  savedCarts,
  cartRecommendations,
  cartNotes,
  inventoryReservations,
  analyticsDaily,
  analyticsProducts,
  customerLtv,
  scheduledReports,
  brandSettings,
  emailTemplates,
  receiptSettings,
  merchantSubscriptions,
  addonSubscriptions,
  apiLogs,
  customerVault,
  vaultPaymentMethods,
  merchantProfiles,
  merchantTransactions,
  conversations,
  messages,
  checkoutSessions,
} from "@shared/schema";
import { eq, and, desc, like, or, lte, sql, count, inArray, gte } from "drizzle-orm";
import { randomUUID } from "crypto";

export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Merchant Account operations
  getMerchantAccountByEmail(email: string): Promise<MerchantAccount | undefined>;
  createMerchantAccount(account: InsertMerchantAccount): Promise<MerchantAccount>;
  updateMerchantAccountLastLogin(id: string): Promise<MerchantAccount | undefined>;

  // Product operations
  getProduct(id: string): Promise<Product | undefined>;
  getAllProducts(): Promise<Product[]>;
  searchProducts(query: string): Promise<Product[]>;
  getProductsByCategory(category: string): Promise<Product[]>;
  createProduct(product: InsertProduct): Promise<Product>;
  updateProduct(id: string, product: Partial<InsertProduct>): Promise<Product | undefined>;
  deleteProduct(id: string): Promise<boolean>;

  // Cart operations
  getCartItems(sessionId: string): Promise<CartItem[]>;
  getCartItemsWithProducts(sessionId: string): Promise<(CartItem & { product: Product })[]>;
  addToCart(item: InsertCartItem): Promise<CartItem>;
  updateCartItemQuantity(id: string, quantity: number): Promise<CartItem | undefined>;
  removeFromCart(id: string): Promise<boolean>;
  clearCart(sessionId: string): Promise<boolean>;

  // Order operations
  getOrder(id: string): Promise<Order | undefined>;
  getOrderByNumber(orderNumber: string): Promise<Order | undefined>;
  getOrdersBySession(sessionId: string): Promise<Order[]>;
  getOrderItems(orderId: string): Promise<OrderItem[]>;
  createOrder(order: InsertOrder, items: Omit<InsertOrderItem, 'orderId'>[]): Promise<Order>;
  updateOrderStatus(id: string, status: string): Promise<Order | undefined>;
  updateOrderPaymentStatus(id: string, paymentStatus: string): Promise<Order | undefined>;
  getAllOrders(): Promise<Order[]>;

  // Payment gateway operations
  getPaymentGateway(id: string): Promise<PaymentGateway | undefined>;
  getDefaultPaymentGateway(): Promise<PaymentGateway | undefined>;
  getAllPaymentGateways(): Promise<PaymentGateway[]>;
  createPaymentGateway(gateway: InsertPaymentGateway): Promise<PaymentGateway>;
  updatePaymentGateway(id: string, gateway: Partial<InsertPaymentGateway>): Promise<PaymentGateway | undefined>;
  setDefaultGateway(id: string): Promise<PaymentGateway | undefined>;

  // Payment transaction operations
  getPaymentTransaction(id: string): Promise<PaymentTransaction | undefined>;
  getTransactionsByOrder(orderId: string): Promise<PaymentTransaction[]>;
  createPaymentTransaction(transaction: InsertPaymentTransaction): Promise<PaymentTransaction>;
  updatePaymentTransaction(id: string, transaction: Partial<InsertPaymentTransaction>): Promise<PaymentTransaction | undefined>;
  getAllTransactions(): Promise<PaymentTransaction[]>;

  // Merchant operations
  getMerchant(id: string): Promise<Merchant | undefined>;
  getMerchantByPlatformClientId(platform: string, platformClientId: string): Promise<Merchant | undefined>;
  getMerchantByNmiMerchantId(nmiMerchantId: string): Promise<Merchant | undefined>;
  getMerchantsByPlatform(platform: string): Promise<Merchant[]>;
  getAllMerchants(): Promise<Merchant[]>;
  createMerchant(merchant: InsertMerchant): Promise<Merchant>;
  updateMerchant(id: string, merchant: Partial<InsertMerchant>): Promise<Merchant | undefined>;
  updateMerchantStatus(id: string, status: string): Promise<Merchant | undefined>;

  // API Key operations
  getApiKey(id: string): Promise<ApiKey | undefined>;
  getApiKeyByKey(apiKey: string): Promise<ApiKey | undefined>;
  getApiKeysByPlatform(platform: string): Promise<ApiKey[]>;
  getAllApiKeys(): Promise<ApiKey[]>;
  createApiKey(apiKey: InsertApiKey): Promise<ApiKey>;
  updateApiKey(id: string, apiKey: Partial<InsertApiKey>): Promise<ApiKey | undefined>;
  deactivateApiKey(id: string): Promise<ApiKey | undefined>;
  updateApiKeyLastUsed(id: string): Promise<void>;

  // Partner Payment Transaction operations
  getPartnerPaymentTransaction(id: string): Promise<PartnerPaymentTransaction | undefined>;
  getPartnerPaymentTransactionByGatewayId(gatewayTransactionId: string): Promise<PartnerPaymentTransaction | undefined>;
  getPartnerPaymentTransactionsByMerchant(merchantId: string): Promise<PartnerPaymentTransaction[]>;
  getPartnerPaymentTransactionsByPlatform(platform: string): Promise<PartnerPaymentTransaction[]>;
  getAllPartnerPaymentTransactions(): Promise<PartnerPaymentTransaction[]>;
  createPartnerPaymentTransaction(transaction: InsertPartnerPaymentTransaction): Promise<PartnerPaymentTransaction>;
  updatePartnerPaymentTransaction(id: string, transaction: Partial<InsertPartnerPaymentTransaction>): Promise<PartnerPaymentTransaction | undefined>;

  // Checkout Session operations
  getCheckoutSession(id: string): Promise<CheckoutSession | undefined>;
  getCheckoutSessionByGatewayId(gatewaySessionId: string): Promise<CheckoutSession | undefined>;
  createCheckoutSession(session: InsertCheckoutSession): Promise<CheckoutSession>;
  updateCheckoutSession(id: string, session: Partial<InsertCheckoutSession>): Promise<CheckoutSession | undefined>;

  // Webhook Endpoint operations
  getWebhookEndpoint(id: string): Promise<WebhookEndpoint | undefined>;
  getWebhookEndpointsByPlatform(platform: string): Promise<WebhookEndpoint[]>;
  getAllWebhookEndpoints(): Promise<WebhookEndpoint[]>;
  createWebhookEndpoint(endpoint: InsertWebhookEndpoint): Promise<WebhookEndpoint>;
  updateWebhookEndpoint(id: string, endpoint: Partial<InsertWebhookEndpoint>): Promise<WebhookEndpoint | undefined>;
  deleteWebhookEndpoint(id: string): Promise<boolean>;

  // Webhook Delivery operations
  getWebhookDelivery(id: string): Promise<WebhookDelivery | undefined>;
  getWebhookDeliveriesByEndpoint(endpointId: string): Promise<WebhookDelivery[]>;
  getPendingWebhookDeliveries(before: Date): Promise<WebhookDelivery[]>;
  createWebhookDelivery(delivery: InsertWebhookDelivery): Promise<WebhookDelivery>;
  updateWebhookDelivery(id: string, delivery: Partial<InsertWebhookDelivery>): Promise<WebhookDelivery | undefined>;

  // Rates Active operations
  getRatesActive(id: string): Promise<RatesActive | undefined>;
  getRatesByTierName(tierName: string): Promise<RatesActive | undefined>;
  getRatesByType(tierType: string): Promise<RatesActive[]>;
  getAllRatesActive(): Promise<RatesActive[]>;
  createRatesActive(rate: InsertRatesActive): Promise<RatesActive>;
  updateRatesActive(id: string, rate: Partial<InsertRatesActive>): Promise<RatesActive | undefined>;
  deleteRatesActive(id: string): Promise<boolean>;

  // Rates Staged operations
  getRatesStaged(id: string): Promise<RatesStaged | undefined>;
  getAllRatesStaged(): Promise<RatesStaged[]>;
  createRatesStaged(rate: InsertRatesStaged): Promise<RatesStaged>;
  updateRatesStaged(id: string, rate: Partial<InsertRatesStaged>): Promise<RatesStaged | undefined>;
  deleteRatesStaged(id: string): Promise<boolean>;
  clearRatesStaged(): Promise<boolean>;
  activateStagedRates(): Promise<RatesActive[]>;

  // Costs Baseline operations
  getCostsBaseline(id: string): Promise<CostsBaseline | undefined>;
  getAllCostsBaseline(): Promise<CostsBaseline[]>;
  createCostsBaseline(cost: InsertCostsBaseline): Promise<CostsBaseline>;
  updateCostsBaseline(id: string, cost: Partial<InsertCostsBaseline>): Promise<CostsBaseline | undefined>;

  // Rates Audit Log operations
  createRatesAuditLog(log: InsertRatesAuditLog): Promise<RatesAuditLog>;
  getRatesAuditLogs(limit?: number): Promise<RatesAuditLog[]>;

  // Add-On Products operations
  getAddOnProduct(id: string): Promise<AddOnProduct | undefined>;
  getAddOnProductBySlug(slug: string): Promise<AddOnProduct | undefined>;
  getAllAddOnProducts(): Promise<AddOnProduct[]>;
  getActiveAddOnProducts(): Promise<AddOnProduct[]>;
  createAddOnProduct(addOn: InsertAddOnProduct): Promise<AddOnProduct>;
  updateAddOnProduct(id: string, addOn: Partial<InsertAddOnProduct>): Promise<AddOnProduct | undefined>;
  deleteAddOnProduct(id: string): Promise<boolean>;

  // Merchant Product Catalog operations (Prompt 13)
  getProductsByMerchant(merchantId: string): Promise<Product[]>;
  getProductCountByMerchant(merchantId: string): Promise<number>;
  getProductBySkuAndMerchant(sku: string, merchantId: string): Promise<Product | undefined>;
  bulkUpdateProducts(updates: Array<{ id: string; data: Partial<InsertProduct> }>): Promise<Product[]>;
  bulkDeleteProducts(ids: string[]): Promise<boolean>;
  bulkCreateProducts(products: InsertProduct[]): Promise<Product[]>;

  // Product Variant operations (Prompt 13)
  getVariantsByProduct(productId: string): Promise<ProductVariant[]>;
  createVariant(variant: InsertProductVariant): Promise<ProductVariant>;
  updateVariant(id: string, data: Partial<InsertProductVariant>): Promise<ProductVariant | undefined>;
  deleteVariant(id: string): Promise<boolean>;

  // Product Import operations (Prompt 13)
  createProductImport(record: InsertProductImport): Promise<ProductImport>;
  updateProductImport(id: string, data: Partial<InsertProductImport>): Promise<ProductImport | undefined>;
  getProductImportsByMerchant(merchantId: string): Promise<ProductImport[]>;

  // Tier Entitlement operations (Prompt 14)
  getTierEntitlements(tierName: string): Promise<TierEntitlement[]>;
  getAllTierEntitlements(): Promise<TierEntitlement[]>;
  getTierEntitlement(tierName: string, featureKey: string): Promise<TierEntitlement | undefined>;
  createTierEntitlement(entitlement: InsertTierEntitlement): Promise<TierEntitlement>;
  updateTierEntitlement(id: string, data: Partial<InsertTierEntitlement>): Promise<TierEntitlement | undefined>;

  // Customer Account operations (Part 9)
  getCustomerAccount(id: string): Promise<CustomerAccount | undefined>;
  getCustomerAccountsByMerchant(merchantId: string): Promise<CustomerAccount[]>;
  createCustomerAccount(account: InsertCustomerAccount): Promise<CustomerAccount>;
  updateCustomerAccount(id: string, data: Partial<InsertCustomerAccount>): Promise<CustomerAccount | undefined>;
  deleteCustomerAccount(id: string): Promise<boolean>;

  // Customer Payment Method operations (Part 9)
  getCustomerPaymentMethod(id: string): Promise<CustomerPaymentMethod | undefined>;
  getCustomerPaymentMethodsByCustomer(customerId: string): Promise<CustomerPaymentMethod[]>;
  createCustomerPaymentMethod(method: InsertCustomerPaymentMethod): Promise<CustomerPaymentMethod>;
  updateCustomerPaymentMethod(id: string, data: Partial<InsertCustomerPaymentMethod>): Promise<CustomerPaymentMethod | undefined>;
  deleteCustomerPaymentMethod(id: string): Promise<boolean>;

  // Customer Support Ticket operations (Part 9)
  getCustomerSupportTicket(id: string): Promise<CustomerSupportTicket | undefined>;
  getCustomerSupportTicketsByMerchant(merchantId: string): Promise<CustomerSupportTicket[]>;
  createCustomerSupportTicket(ticket: InsertCustomerSupportTicket): Promise<CustomerSupportTicket>;
  updateCustomerSupportTicket(id: string, data: Partial<InsertCustomerSupportTicket>): Promise<CustomerSupportTicket | undefined>;
  deleteCustomerSupportTicket(id: string): Promise<boolean>;

  // Security Settings operations (Part 9)
  getSecuritySettings(merchantId: string): Promise<SecuritySettings | undefined>;
  upsertSecuritySettings(merchantId: string, data: Partial<InsertSecuritySettings>): Promise<SecuritySettings>;

  // Fraud Score operations (Part 9)
  getFraudScore(id: string): Promise<FraudScore | undefined>;
  getFraudScoresByTransaction(transactionId: string): Promise<FraudScore[]>;
  createFraudScore(score: InsertFraudScore): Promise<FraudScore>;

  // Device Fingerprint operations (Part 9)
  getDeviceFingerprint(id: string): Promise<DeviceFingerprint | undefined>;
  getDeviceFingerprintsByMerchant(merchantId: string): Promise<DeviceFingerprint[]>;
  createDeviceFingerprint(fingerprint: InsertDeviceFingerprint): Promise<DeviceFingerprint>;
  updateDeviceFingerprint(id: string, data: Partial<InsertDeviceFingerprint>): Promise<DeviceFingerprint | undefined>;
  deleteDeviceFingerprint(id: string): Promise<boolean>;

  // Chargeback Alert operations (Part 9)
  getChargebackAlert(id: string): Promise<ChargebackAlert | undefined>;
  getChargebackAlertsByMerchant(merchantId: string): Promise<ChargebackAlert[]>;
  createChargebackAlert(alert: InsertChargebackAlert): Promise<ChargebackAlert>;

  // Checkout Settings operations (Part 9)
  getCheckoutSettings(merchantId: string): Promise<CheckoutSettings | undefined>;
  upsertCheckoutSettings(merchantId: string, data: Partial<InsertCheckoutSettings>): Promise<CheckoutSettings>;

  // A/B Test operations (Part 9)
  getAbTest(id: string): Promise<AbTest | undefined>;
  getAbTestsByMerchant(merchantId: string): Promise<AbTest[]>;
  createAbTest(test: InsertAbTest): Promise<AbTest>;
  updateAbTest(id: string, data: Partial<InsertAbTest>): Promise<AbTest | undefined>;
  deleteAbTest(id: string): Promise<boolean>;

  // A/B Test Result operations (Part 9)
  getAbTestResult(id: string): Promise<AbTestResult | undefined>;
  getAbTestResultsByTest(testId: string): Promise<AbTestResult[]>;
  createAbTestResult(result: InsertAbTestResult): Promise<AbTestResult>;
  updateAbTestResult(id: string, data: Partial<InsertAbTestResult>): Promise<AbTestResult | undefined>;
  deleteAbTestResult(id: string): Promise<boolean>;

  // Checkout Analytics operations (Part 9)
  getCheckoutAnalytics(id: string): Promise<CheckoutAnalytics | undefined>;
  getCheckoutAnalyticsByMerchant(merchantId: string): Promise<CheckoutAnalytics[]>;
  createCheckoutAnalytics(analytics: InsertCheckoutAnalytics): Promise<CheckoutAnalytics>;

  // Saved Cart operations (Part 9)
  getSavedCart(id: string): Promise<SavedCart | undefined>;
  getSavedCartByShareToken(shareToken: string): Promise<SavedCart | undefined>;
  getSavedCartsByMerchant(merchantId: string): Promise<SavedCart[]>;
  createSavedCart(cart: InsertSavedCart): Promise<SavedCart>;
  updateSavedCart(id: string, data: Partial<InsertSavedCart>): Promise<SavedCart | undefined>;
  deleteSavedCart(id: string): Promise<boolean>;

  // Cart Recommendation operations (Part 9)
  getCartRecommendation(id: string): Promise<CartRecommendation | undefined>;
  getCartRecommendationsByMerchant(merchantId: string): Promise<CartRecommendation[]>;
  createCartRecommendation(rec: InsertCartRecommendation): Promise<CartRecommendation>;
  updateCartRecommendation(id: string, data: Partial<InsertCartRecommendation>): Promise<CartRecommendation | undefined>;
  deleteCartRecommendation(id: string): Promise<boolean>;

  // Cart Note operations (Part 9)
  getCartNote(id: string): Promise<CartNote | undefined>;
  getCartNotesByCart(cartId: string): Promise<CartNote[]>;
  createCartNote(note: InsertCartNote): Promise<CartNote>;
  updateCartNote(id: string, data: Partial<InsertCartNote>): Promise<CartNote | undefined>;
  deleteCartNote(id: string): Promise<boolean>;

  // Inventory Reservation operations (Part 9)
  getInventoryReservation(id: string): Promise<InventoryReservation | undefined>;
  getInventoryReservationsByProduct(productId: string): Promise<InventoryReservation[]>;
  getInventoryReservationsByCart(cartId: string): Promise<InventoryReservation[]>;
  createInventoryReservation(reservation: InsertInventoryReservation): Promise<InventoryReservation>;
  updateInventoryReservation(id: string, data: Partial<InsertInventoryReservation>): Promise<InventoryReservation | undefined>;
  deleteInventoryReservation(id: string): Promise<boolean>;

  // Analytics Daily operations (Part 9)
  getAnalyticsDaily(id: string): Promise<AnalyticsDaily | undefined>;
  getAnalyticsDailyByMerchant(merchantId: string, startDate?: Date, endDate?: Date): Promise<AnalyticsDaily[]>;
  createAnalyticsDaily(analytics: InsertAnalyticsDaily): Promise<AnalyticsDaily>;

  // Analytics Products operations (Part 9)
  getAnalyticsProducts(id: string): Promise<AnalyticsProducts | undefined>;
  getAnalyticsProductsByMerchant(merchantId: string): Promise<AnalyticsProducts[]>;
  createAnalyticsProducts(analytics: InsertAnalyticsProducts): Promise<AnalyticsProducts>;

  // Customer LTV operations (Part 9)
  getCustomerLtv(id: string): Promise<CustomerLtv | undefined>;
  getCustomerLtvByMerchant(merchantId: string): Promise<CustomerLtv[]>;
  createCustomerLtv(ltv: InsertCustomerLtv): Promise<CustomerLtv>;
  updateCustomerLtv(id: string, data: Partial<InsertCustomerLtv>): Promise<CustomerLtv | undefined>;

  // Scheduled Report operations (Part 9)
  getScheduledReport(id: string): Promise<ScheduledReport | undefined>;
  getScheduledReportsByMerchant(merchantId: string): Promise<ScheduledReport[]>;
  createScheduledReport(report: InsertScheduledReport): Promise<ScheduledReport>;
  updateScheduledReport(id: string, data: Partial<InsertScheduledReport>): Promise<ScheduledReport | undefined>;
  deleteScheduledReport(id: string): Promise<boolean>;

  // Brand Settings operations (Part 9)
  getBrandSettings(merchantId: string): Promise<BrandSettings | undefined>;
  upsertBrandSettings(merchantId: string, data: Partial<InsertBrandSettings>): Promise<BrandSettings>;

  // Email Template operations (Part 9)
  getEmailTemplate(id: string): Promise<EmailTemplate | undefined>;
  getEmailTemplatesByMerchant(merchantId: string): Promise<EmailTemplate[]>;
  createEmailTemplate(template: InsertEmailTemplate): Promise<EmailTemplate>;
  updateEmailTemplate(id: string, data: Partial<InsertEmailTemplate>): Promise<EmailTemplate | undefined>;
  deleteEmailTemplate(id: string): Promise<boolean>;

  // Receipt Settings operations (Part 9)
  getReceiptSettings(merchantId: string): Promise<ReceiptSettings | undefined>;
  upsertReceiptSettings(merchantId: string, data: Partial<InsertReceiptSettings>): Promise<ReceiptSettings>;

  // Merchant Subscription operations (Part 9)
  getMerchantSubscription(id: string): Promise<MerchantSubscription | undefined>;
  getMerchantSubscriptionsByMerchant(merchantId: string): Promise<MerchantSubscription[]>;
  createMerchantSubscription(subscription: InsertMerchantSubscription): Promise<MerchantSubscription>;
  updateMerchantSubscription(id: string, data: Partial<InsertMerchantSubscription>): Promise<MerchantSubscription | undefined>;
  deleteMerchantSubscription(id: string): Promise<boolean>;

  // Addon Subscription operations (Part 9)
  getAddonSubscription(id: string): Promise<AddonSubscription | undefined>;
  getAddonSubscriptionsByMerchant(merchantId: string): Promise<AddonSubscription[]>;
  createAddonSubscription(subscription: InsertAddonSubscription): Promise<AddonSubscription>;
  updateAddonSubscription(id: string, data: Partial<InsertAddonSubscription>): Promise<AddonSubscription | undefined>;
  deleteAddonSubscription(id: string): Promise<boolean>;

  // API Log operations (Part 9)
  getApiLog(id: string): Promise<ApiLog | undefined>;
  getApiLogsByMerchant(merchantId: string): Promise<ApiLog[]>;
  createApiLog(log: InsertApiLog): Promise<ApiLog>;

  // Customer Vault operations (Prompt 10)
  getCustomerVaultRecord(id: string): Promise<CustomerVaultRecord | undefined>;
  getCustomerVaultByMerchant(merchantId: string): Promise<CustomerVaultRecord[]>;
  createCustomerVaultRecord(record: InsertCustomerVault): Promise<CustomerVaultRecord>;
  updateCustomerVaultRecord(id: string, data: Partial<InsertCustomerVault>): Promise<CustomerVaultRecord | undefined>;
  deleteCustomerVaultRecord(id: string): Promise<boolean>;

  // Vault Payment Method operations (Prompt 10)
  getVaultPaymentMethod(id: string): Promise<VaultPaymentMethod | undefined>;
  getVaultPaymentMethodsByCustomer(customerId: string): Promise<VaultPaymentMethod[]>;
  createVaultPaymentMethod(method: InsertVaultPaymentMethod): Promise<VaultPaymentMethod>;
  updateVaultPaymentMethod(id: string, data: Partial<InsertVaultPaymentMethod>): Promise<VaultPaymentMethod | undefined>;
  deleteVaultPaymentMethod(id: string): Promise<boolean>;

  // Merchant Profile operations (Prompt 21)
  getMerchantProfile(merchantId: string): Promise<MerchantProfile | undefined>;
  upsertMerchantProfile(merchantId: string, data: Partial<InsertMerchantProfile>): Promise<MerchantProfile>;
  updateMerchantAccountBusinessName(id: string, businessName: string): Promise<MerchantAccount | undefined>;

  // Merchant Transaction operations (Prompt 21)
  getMerchantTransactions(merchantId: string, limit?: number, offset?: number): Promise<MerchantTransaction[]>;
  createMerchantTransaction(transaction: InsertMerchantTransaction): Promise<MerchantTransaction>;

  // Conversation operations (AI Chat)
  getConversation(id: string): Promise<Conversation | undefined>;
  getAllConversations(): Promise<Conversation[]>;
  createConversation(conversation: InsertConversation): Promise<Conversation>;
  updateConversation(id: string, data: Partial<InsertConversation>): Promise<Conversation | undefined>;
  deleteConversation(id: string): Promise<boolean>;

  // Message operations (AI Chat)
  getMessage(id: string): Promise<Message | undefined>;
  getMessagesByConversation(conversationId: string): Promise<Message[]>;
  createMessage(message: InsertMessage): Promise<Message>;
  updateMessage(id: string, data: Partial<InsertMessage>): Promise<Message | undefined>;
  deleteMessage(id: string): Promise<boolean>;
}

export class DbStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.id, id));
    return result[0];
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.username, username));
    return result[0];
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const result = await db.insert(users).values(insertUser).returning();
    return result[0];
  }

  // Merchant Account operations
  async getMerchantAccountByEmail(email: string): Promise<MerchantAccount | undefined> {
    const result = await db.select().from(merchantAccounts).where(eq(merchantAccounts.email, email));
    return result[0];
  }

  async createMerchantAccount(account: InsertMerchantAccount): Promise<MerchantAccount> {
    const result = await db.insert(merchantAccounts).values(account).returning();
    return result[0];
  }

  async updateMerchantAccountLastLogin(id: string): Promise<MerchantAccount | undefined> {
    const result = await db
      .update(merchantAccounts)
      .set({ lastLoginAt: new Date() })
      .where(eq(merchantAccounts.id, id))
      .returning();
    return result[0];
  }

  // Product operations
  async getProduct(id: string): Promise<Product | undefined> {
    const result = await db.select().from(products).where(eq(products.id, id));
    return result[0];
  }

  async getAllProducts(): Promise<Product[]> {
    return await db.select().from(products).where(eq(products.isActive, true)).orderBy(desc(products.createdAt));
  }

  async searchProducts(query: string): Promise<Product[]> {
    return await db
      .select()
      .from(products)
      .where(
        and(
          eq(products.isActive, true),
          or(
            like(products.name, `%${query}%`),
            like(products.description, `%${query}%`)
          )
        )
      );
  }

  async getProductsByCategory(category: string): Promise<Product[]> {
    return await db
      .select()
      .from(products)
      .where(and(eq(products.isActive, true), eq(products.category, category)));
  }

  async createProduct(product: InsertProduct): Promise<Product> {
    const result = await db.insert(products).values(product).returning();
    return result[0];
  }

  async updateProduct(id: string, product: Partial<InsertProduct>): Promise<Product | undefined> {
    const result = await db.update(products).set(product).where(eq(products.id, id)).returning();
    return result[0];
  }

  async deleteProduct(id: string): Promise<boolean> {
    const result = await db.update(products).set({ isActive: false }).where(eq(products.id, id)).returning();
    return result.length > 0;
  }

  // Cart operations
  async getCartItems(sessionId: string): Promise<CartItem[]> {
    return await db.select().from(cartItems).where(eq(cartItems.sessionId, sessionId));
  }

  async getCartItemsWithProducts(sessionId: string): Promise<(CartItem & { product: Product })[]> {
    const items = await db
      .select()
      .from(cartItems)
      .leftJoin(products, eq(cartItems.productId, products.id))
      .where(eq(cartItems.sessionId, sessionId));

    return items.map(item => ({
      ...item.cart_items,
      product: item.products!,
    }));
  }

  async addToCart(item: InsertCartItem): Promise<CartItem> {
    const existing = await db
      .select()
      .from(cartItems)
      .where(
        and(
          eq(cartItems.sessionId, item.sessionId),
          eq(cartItems.productId, item.productId)
        )
      );

    if (existing.length > 0) {
      const updated = await db
        .update(cartItems)
        .set({
          quantity: (existing[0].quantity || 0) + (item.quantity || 1),
          updatedAt: new Date(),
        })
        .where(eq(cartItems.id, existing[0].id))
        .returning();
      return updated[0];
    }

    const result = await db.insert(cartItems).values(item).returning();
    return result[0];
  }

  async updateCartItemQuantity(id: string, quantity: number): Promise<CartItem | undefined> {
    const result = await db
      .update(cartItems)
      .set({ quantity, updatedAt: new Date() })
      .where(eq(cartItems.id, id))
      .returning();
    return result[0];
  }

  async removeFromCart(id: string): Promise<boolean> {
    const result = await db.delete(cartItems).where(eq(cartItems.id, id)).returning();
    return result.length > 0;
  }

  async clearCart(sessionId: string): Promise<boolean> {
    const result = await db.delete(cartItems).where(eq(cartItems.sessionId, sessionId)).returning();
    return result.length > 0;
  }

  // Order operations
  async getOrder(id: string): Promise<Order | undefined> {
    const result = await db.select().from(orders).where(eq(orders.id, id));
    return result[0];
  }

  async getOrderByNumber(orderNumber: string): Promise<Order | undefined> {
    const result = await db.select().from(orders).where(eq(orders.orderNumber, orderNumber));
    return result[0];
  }

  async getOrdersBySession(sessionId: string): Promise<Order[]> {
    return await db.select().from(orders).where(eq(orders.sessionId, sessionId)).orderBy(desc(orders.createdAt));
  }

  async getOrderItems(orderId: string): Promise<OrderItem[]> {
    return await db.select().from(orderItems).where(eq(orderItems.orderId, orderId));
  }

  async createOrder(order: InsertOrder, items: Omit<InsertOrderItem, 'orderId'>[]): Promise<Order> {
    return await db.transaction(async (tx) => {
      const result = await tx.insert(orders).values(order).returning();
      const createdOrder = result[0];

      const itemsWithOrderId = items.map(item => ({
        ...item,
        orderId: createdOrder.id,
      }));

      await tx.insert(orderItems).values(itemsWithOrderId);

      return createdOrder;
    });
  }

  async updateOrderStatus(id: string, status: string): Promise<Order | undefined> {
    const result = await db
      .update(orders)
      .set({ status, updatedAt: new Date() })
      .where(eq(orders.id, id))
      .returning();
    return result[0];
  }

  async updateOrderPaymentStatus(id: string, paymentStatus: string): Promise<Order | undefined> {
    const result = await db
      .update(orders)
      .set({ paymentStatus, updatedAt: new Date() })
      .where(eq(orders.id, id))
      .returning();
    return result[0];
  }

  async getAllOrders(): Promise<Order[]> {
    return await db.select().from(orders).orderBy(desc(orders.createdAt));
  }

  // Payment gateway operations
  async getPaymentGateway(id: string): Promise<PaymentGateway | undefined> {
    const result = await db.select().from(paymentGateways).where(eq(paymentGateways.id, id));
    return result[0];
  }

  async getDefaultPaymentGateway(): Promise<PaymentGateway | undefined> {
    const result = await db.select().from(paymentGateways).where(eq(paymentGateways.isDefault, true));
    return result[0];
  }

  async getAllPaymentGateways(): Promise<PaymentGateway[]> {
    return await db.select().from(paymentGateways).orderBy(desc(paymentGateways.createdAt));
  }

  async createPaymentGateway(gateway: InsertPaymentGateway): Promise<PaymentGateway> {
    const result = await db.insert(paymentGateways).values(gateway).returning();
    return result[0];
  }

  async updatePaymentGateway(id: string, gateway: Partial<InsertPaymentGateway>): Promise<PaymentGateway | undefined> {
    const result = await db
      .update(paymentGateways)
      .set({ ...gateway, updatedAt: new Date() })
      .where(eq(paymentGateways.id, id))
      .returning();
    return result[0];
  }

  async setDefaultGateway(id: string): Promise<PaymentGateway | undefined> {
    await db.update(paymentGateways).set({ isDefault: false });
    const result = await db
      .update(paymentGateways)
      .set({ isDefault: true, updatedAt: new Date() })
      .where(eq(paymentGateways.id, id))
      .returning();
    return result[0];
  }

  // Payment transaction operations
  async getPaymentTransaction(id: string): Promise<PaymentTransaction | undefined> {
    const result = await db.select().from(paymentTransactions).where(eq(paymentTransactions.id, id));
    return result[0];
  }

  async getTransactionsByOrder(orderId: string): Promise<PaymentTransaction[]> {
    return await db.select().from(paymentTransactions).where(eq(paymentTransactions.orderId, orderId)).orderBy(desc(paymentTransactions.createdAt));
  }

  async createPaymentTransaction(transaction: InsertPaymentTransaction): Promise<PaymentTransaction> {
    const result = await db.insert(paymentTransactions).values(transaction).returning();
    return result[0];
  }

  async updatePaymentTransaction(id: string, transaction: Partial<InsertPaymentTransaction>): Promise<PaymentTransaction | undefined> {
    const result = await db
      .update(paymentTransactions)
      .set(transaction)
      .where(eq(paymentTransactions.id, id))
      .returning();
    return result[0];
  }

  async getAllTransactions(): Promise<PaymentTransaction[]> {
    return await db.select().from(paymentTransactions).orderBy(desc(paymentTransactions.createdAt));
  }

  // Merchant operations
  async getMerchant(id: string): Promise<Merchant | undefined> {
    const result = await db.select().from(merchants).where(eq(merchants.id, id));
    return result[0];
  }

  async getMerchantByPlatformClientId(platform: string, platformClientId: string): Promise<Merchant | undefined> {
    const result = await db
      .select()
      .from(merchants)
      .where(
        and(
          eq(merchants.platform, platform),
          eq(merchants.platformClientId, platformClientId)
        )
      );
    return result[0];
  }

  async getMerchantByNmiMerchantId(nmiMerchantId: string): Promise<Merchant | undefined> {
    const result = await db.select().from(merchants).where(eq(merchants.nmiMerchantId, nmiMerchantId));
    return result[0];
  }

  async getMerchantsByPlatform(platform: string): Promise<Merchant[]> {
    return await db
      .select()
      .from(merchants)
      .where(eq(merchants.platform, platform))
      .orderBy(desc(merchants.createdAt));
  }

  async getAllMerchants(): Promise<Merchant[]> {
    return await db.select().from(merchants).orderBy(desc(merchants.createdAt));
  }

  async createMerchant(merchant: InsertMerchant): Promise<Merchant> {
    const result = await db.insert(merchants).values(merchant).returning();
    return result[0];
  }

  async updateMerchant(id: string, merchant: Partial<InsertMerchant>): Promise<Merchant | undefined> {
    const result = await db
      .update(merchants)
      .set({ ...merchant, updatedAt: new Date() })
      .where(eq(merchants.id, id))
      .returning();
    return result[0];
  }

  async updateMerchantStatus(id: string, status: string): Promise<Merchant | undefined> {
    const result = await db
      .update(merchants)
      .set({ status, updatedAt: new Date() })
      .where(eq(merchants.id, id))
      .returning();
    return result[0];
  }

  // API Key operations
  async getApiKey(id: string): Promise<ApiKey | undefined> {
    const result = await db.select().from(apiKeys).where(eq(apiKeys.id, id));
    return result[0];
  }

  async getApiKeyByKey(apiKey: string): Promise<ApiKey | undefined> {
    const result = await db.select().from(apiKeys).where(eq(apiKeys.apiKey, apiKey));
    return result[0];
  }

  async getApiKeysByPlatform(platform: string): Promise<ApiKey[]> {
    return await db
      .select()
      .from(apiKeys)
      .where(eq(apiKeys.platform, platform))
      .orderBy(desc(apiKeys.createdAt));
  }

  async getAllApiKeys(): Promise<ApiKey[]> {
    return await db.select().from(apiKeys).orderBy(desc(apiKeys.createdAt));
  }

  async createApiKey(apiKey: InsertApiKey): Promise<ApiKey> {
    const result = await db.insert(apiKeys).values(apiKey).returning();
    return result[0];
  }

  async updateApiKey(id: string, apiKey: Partial<InsertApiKey>): Promise<ApiKey | undefined> {
    const result = await db
      .update(apiKeys)
      .set({ ...apiKey, updatedAt: new Date() })
      .where(eq(apiKeys.id, id))
      .returning();
    return result[0];
  }

  async deactivateApiKey(id: string): Promise<ApiKey | undefined> {
    const result = await db
      .update(apiKeys)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(apiKeys.id, id))
      .returning();
    return result[0];
  }

  async updateApiKeyLastUsed(id: string): Promise<void> {
    await db
      .update(apiKeys)
      .set({ lastUsedAt: new Date() })
      .where(eq(apiKeys.id, id));
  }

  // Partner Payment Transaction operations
  async getPartnerPaymentTransaction(id: string): Promise<PartnerPaymentTransaction | undefined> {
    const result = await db.select().from(partnerPaymentTransactions).where(eq(partnerPaymentTransactions.id, id));
    return result[0];
  }

  async getPartnerPaymentTransactionByGatewayId(gatewayTransactionId: string): Promise<PartnerPaymentTransaction | undefined> {
    const result = await db
      .select()
      .from(partnerPaymentTransactions)
      .where(eq(partnerPaymentTransactions.gatewayTransactionId, gatewayTransactionId));
    return result[0];
  }

  async getPartnerPaymentTransactionsByMerchant(merchantId: string): Promise<PartnerPaymentTransaction[]> {
    return await db
      .select()
      .from(partnerPaymentTransactions)
      .where(eq(partnerPaymentTransactions.merchantId, merchantId))
      .orderBy(desc(partnerPaymentTransactions.createdAt));
  }

  async getPartnerPaymentTransactionsByPlatform(platform: string): Promise<PartnerPaymentTransaction[]> {
    return await db
      .select()
      .from(partnerPaymentTransactions)
      .where(eq(partnerPaymentTransactions.platform, platform))
      .orderBy(desc(partnerPaymentTransactions.createdAt));
  }

  async getAllPartnerPaymentTransactions(): Promise<PartnerPaymentTransaction[]> {
    return await db.select().from(partnerPaymentTransactions).orderBy(desc(partnerPaymentTransactions.createdAt));
  }

  async createPartnerPaymentTransaction(transaction: InsertPartnerPaymentTransaction): Promise<PartnerPaymentTransaction> {
    const result = await db.insert(partnerPaymentTransactions).values(transaction).returning();
    return result[0];
  }

  async updatePartnerPaymentTransaction(id: string, transaction: Partial<InsertPartnerPaymentTransaction>): Promise<PartnerPaymentTransaction | undefined> {
    const result = await db
      .update(partnerPaymentTransactions)
      .set({ ...transaction, updatedAt: new Date() })
      .where(eq(partnerPaymentTransactions.id, id))
      .returning();
    return result[0];
  }

  // Checkout Session operations
  async getCheckoutSession(id: string): Promise<CheckoutSession | undefined> {
    const result = await db.select().from(checkoutSessions).where(eq(checkoutSessions.id, id));
    return result[0];
  }

  async getCheckoutSessionByGatewayId(gatewaySessionId: string): Promise<CheckoutSession | undefined> {
    const result = await db.select().from(checkoutSessions).where(eq(checkoutSessions.gatewaySessionId, gatewaySessionId));
    return result[0];
  }

  async createCheckoutSession(session: InsertCheckoutSession): Promise<CheckoutSession> {
    const result = await db.insert(checkoutSessions).values(session).returning();
    return result[0];
  }

  async updateCheckoutSession(id: string, session: Partial<InsertCheckoutSession>): Promise<CheckoutSession | undefined> {
    const result = await db
      .update(checkoutSessions)
      .set({ ...session, updatedAt: new Date() })
      .where(eq(checkoutSessions.id, id))
      .returning();
    return result[0];
  }

  // Webhook Endpoint operations
  async getWebhookEndpoint(id: string): Promise<WebhookEndpoint | undefined> {
    const result = await db.select().from(webhookEndpoints).where(eq(webhookEndpoints.id, id));
    return result[0];
  }

  async getWebhookEndpointsByPlatform(platform: string): Promise<WebhookEndpoint[]> {
    return await db
      .select()
      .from(webhookEndpoints)
      .where(eq(webhookEndpoints.platform, platform))
      .orderBy(desc(webhookEndpoints.createdAt));
  }

  async getAllWebhookEndpoints(): Promise<WebhookEndpoint[]> {
    return await db.select().from(webhookEndpoints).orderBy(desc(webhookEndpoints.createdAt));
  }

  async createWebhookEndpoint(endpoint: InsertWebhookEndpoint): Promise<WebhookEndpoint> {
    const result = await db.insert(webhookEndpoints).values(endpoint).returning();
    return result[0];
  }

  async updateWebhookEndpoint(id: string, endpoint: Partial<InsertWebhookEndpoint>): Promise<WebhookEndpoint | undefined> {
    const result = await db
      .update(webhookEndpoints)
      .set({ ...endpoint, updatedAt: new Date() })
      .where(eq(webhookEndpoints.id, id))
      .returning();
    return result[0];
  }

  async deleteWebhookEndpoint(id: string): Promise<boolean> {
    const result = await db.delete(webhookEndpoints).where(eq(webhookEndpoints.id, id)).returning();
    return result.length > 0;
  }

  // Webhook Delivery operations
  async getWebhookDelivery(id: string): Promise<WebhookDelivery | undefined> {
    const result = await db.select().from(webhookDeliveries).where(eq(webhookDeliveries.id, id));
    return result[0];
  }

  async getWebhookDeliveriesByEndpoint(endpointId: string): Promise<WebhookDelivery[]> {
    return await db
      .select()
      .from(webhookDeliveries)
      .where(eq(webhookDeliveries.endpointId, endpointId))
      .orderBy(desc(webhookDeliveries.createdAt));
  }

  async getPendingWebhookDeliveries(before: Date): Promise<WebhookDelivery[]> {
    return await db
      .select()
      .from(webhookDeliveries)
      .where(
        and(
          eq(webhookDeliveries.status, "pending"),
          lte(webhookDeliveries.nextRetry, before)
        )
      )
      .orderBy(webhookDeliveries.nextRetry);
  }

  async createWebhookDelivery(delivery: InsertWebhookDelivery): Promise<WebhookDelivery> {
    const result = await db.insert(webhookDeliveries).values(delivery).returning();
    return result[0];
  }

  async updateWebhookDelivery(id: string, delivery: Partial<InsertWebhookDelivery>): Promise<WebhookDelivery | undefined> {
    const result = await db
      .update(webhookDeliveries)
      .set({ ...delivery, updatedAt: new Date() })
      .where(eq(webhookDeliveries.id, id))
      .returning();
    return result[0];
  }

  // Rates Active operations
  async getRatesActive(id: string): Promise<RatesActive | undefined> {
    const result = await db.select().from(ratesActive).where(eq(ratesActive.id, id));
    return result[0];
  }

  async getRatesByTierName(tierName: string): Promise<RatesActive | undefined> {
    const result = await db.select().from(ratesActive).where(eq(ratesActive.tierName, tierName));
    return result[0];
  }

  async getRatesByType(tierType: string): Promise<RatesActive[]> {
    return await db
      .select()
      .from(ratesActive)
      .where(eq(ratesActive.tierType, tierType))
      .orderBy(ratesActive.displayOrder);
  }

  async getAllRatesActive(): Promise<RatesActive[]> {
    return await db.select().from(ratesActive).orderBy(ratesActive.displayOrder);
  }

  async createRatesActive(rate: InsertRatesActive): Promise<RatesActive> {
    const result = await db.insert(ratesActive).values(rate).returning();
    return result[0];
  }

  async updateRatesActive(id: string, rate: Partial<InsertRatesActive>): Promise<RatesActive | undefined> {
    const result = await db
      .update(ratesActive)
      .set({ ...rate, updatedAt: new Date() })
      .where(eq(ratesActive.id, id))
      .returning();
    return result[0];
  }

  async deleteRatesActive(id: string): Promise<boolean> {
    const result = await db.delete(ratesActive).where(eq(ratesActive.id, id)).returning();
    return result.length > 0;
  }

  // Rates Staged operations
  async getRatesStaged(id: string): Promise<RatesStaged | undefined> {
    const result = await db.select().from(ratesStaged).where(eq(ratesStaged.id, id));
    return result[0];
  }

  async getAllRatesStaged(): Promise<RatesStaged[]> {
    return await db.select().from(ratesStaged).orderBy(ratesStaged.displayOrder);
  }

  async createRatesStaged(rate: InsertRatesStaged): Promise<RatesStaged> {
    const result = await db.insert(ratesStaged).values(rate).returning();
    return result[0];
  }

  async updateRatesStaged(id: string, rate: Partial<InsertRatesStaged>): Promise<RatesStaged | undefined> {
    const result = await db
      .update(ratesStaged)
      .set({ ...rate, updatedAt: new Date() })
      .where(eq(ratesStaged.id, id))
      .returning();
    return result[0];
  }

  async deleteRatesStaged(id: string): Promise<boolean> {
    const result = await db.delete(ratesStaged).where(eq(ratesStaged.id, id)).returning();
    return result.length > 0;
  }

  async clearRatesStaged(): Promise<boolean> {
    await db.delete(ratesStaged);
    return true;
  }

  async activateStagedRates(): Promise<RatesActive[]> {
    const stagedRates = await this.getAllRatesStaged();
    const activatedRates: RatesActive[] = [];

    for (const staged of stagedRates) {
      const existingRate = await this.getRatesByTierName(staged.tierName);

      if (existingRate) {
        const updated = await this.updateRatesActive(existingRate.id, {
          monthlyFee: staged.monthlyFee,
          transactionPercent: staged.transactionPercent,
          transactionFlat: staged.transactionFlat,
          description: staged.description,
          features: staged.features as string[] | null,
          isActive: staged.isActive,
          displayOrder: staged.displayOrder,
        });
        if (updated) activatedRates.push(updated);
      } else {
        const created = await this.createRatesActive({
          tierName: staged.tierName,
          tierType: staged.tierType,
          monthlyFee: staged.monthlyFee,
          transactionPercent: staged.transactionPercent,
          transactionFlat: staged.transactionFlat,
          description: staged.description,
          features: staged.features as string[] | null,
          isActive: staged.isActive,
          displayOrder: staged.displayOrder,
        });
        activatedRates.push(created);
      }
    }

    await this.clearRatesStaged();
    return activatedRates;
  }

  // Costs Baseline operations
  async getCostsBaseline(id: string): Promise<CostsBaseline | undefined> {
    const result = await db.select().from(costsBaseline).where(eq(costsBaseline.id, id));
    return result[0];
  }

  async getAllCostsBaseline(): Promise<CostsBaseline[]> {
    return await db.select().from(costsBaseline);
  }

  async createCostsBaseline(cost: InsertCostsBaseline): Promise<CostsBaseline> {
    const result = await db.insert(costsBaseline).values(cost).returning();
    return result[0];
  }

  async updateCostsBaseline(id: string, cost: Partial<InsertCostsBaseline>): Promise<CostsBaseline | undefined> {
    const result = await db
      .update(costsBaseline)
      .set({ ...cost, updatedAt: new Date() })
      .where(eq(costsBaseline.id, id))
      .returning();
    return result[0];
  }

  // Rates Audit Log operations
  async createRatesAuditLog(log: InsertRatesAuditLog): Promise<RatesAuditLog> {
    const result = await db.insert(ratesAuditLog).values(log).returning();
    return result[0];
  }

  async getRatesAuditLogs(limit: number = 50): Promise<RatesAuditLog[]> {
    return await db
      .select()
      .from(ratesAuditLog)
      .orderBy(desc(ratesAuditLog.createdAt))
      .limit(limit);
  }

  // Add-On Products operations
  async getAddOnProduct(id: string): Promise<AddOnProduct | undefined> {
    const result = await db.select().from(addOnProducts).where(eq(addOnProducts.id, id));
    return result[0];
  }

  async getAddOnProductBySlug(slug: string): Promise<AddOnProduct | undefined> {
    const result = await db.select().from(addOnProducts).where(eq(addOnProducts.slug, slug));
    return result[0];
  }

  async getAllAddOnProducts(): Promise<AddOnProduct[]> {
    return await db.select().from(addOnProducts).orderBy(addOnProducts.displayOrder);
  }

  async getActiveAddOnProducts(): Promise<AddOnProduct[]> {
    return await db
      .select()
      .from(addOnProducts)
      .where(eq(addOnProducts.isActive, true))
      .orderBy(addOnProducts.displayOrder);
  }

  async createAddOnProduct(addOn: InsertAddOnProduct): Promise<AddOnProduct> {
    const result = await db.insert(addOnProducts).values(addOn).returning();
    return result[0];
  }

  async updateAddOnProduct(id: string, addOn: Partial<InsertAddOnProduct>): Promise<AddOnProduct | undefined> {
    const result = await db
      .update(addOnProducts)
      .set({ ...addOn, updatedAt: new Date() })
      .where(eq(addOnProducts.id, id))
      .returning();
    return result[0];
  }

  async deleteAddOnProduct(id: string): Promise<boolean> {
    const result = await db.delete(addOnProducts).where(eq(addOnProducts.id, id)).returning();
    return result.length > 0;
  }

  // Merchant Product Catalog operations (Prompt 13)
  async getProductsByMerchant(merchantId: string): Promise<Product[]> {
    return await db
      .select()
      .from(products)
      .where(eq(products.merchantId, merchantId))
      .orderBy(desc(products.createdAt));
  }

  async getProductCountByMerchant(merchantId: string): Promise<number> {
    const result = await db
      .select({ count: count() })
      .from(products)
      .where(and(
        eq(products.merchantId, merchantId),
        or(eq(products.status, "active"), eq(products.status, "draft"))
      ));
    return result[0]?.count ?? 0;
  }

  async getProductBySkuAndMerchant(sku: string, merchantId: string): Promise<Product | undefined> {
    const result = await db
      .select()
      .from(products)
      .where(and(eq(products.sku, sku), eq(products.merchantId, merchantId)));
    return result[0];
  }

  async bulkUpdateProducts(updates: Array<{ id: string; data: Partial<InsertProduct> }>): Promise<Product[]> {
    return await db.transaction(async (tx) => {
      const results: Product[] = [];
      for (const { id, data } of updates) {
        const result = await tx
          .update(products)
          .set({ ...data, updatedAt: new Date() })
          .where(eq(products.id, id))
          .returning();
        if (result[0]) results.push(result[0]);
      }
      return results;
    });
  }

  async bulkDeleteProducts(ids: string[]): Promise<boolean> {
    if (ids.length === 0) return true;
    const result = await db
      .update(products)
      .set({ status: "archived", updatedAt: new Date() })
      .where(inArray(products.id, ids))
      .returning();
    return result.length > 0;
  }

  async bulkCreateProducts(productList: InsertProduct[]): Promise<Product[]> {
    if (productList.length === 0) return [];
    return await db.insert(products).values(productList).returning();
  }

  // Product Variant operations (Prompt 13)
  async getVariantsByProduct(productId: string): Promise<ProductVariant[]> {
    return await db
      .select()
      .from(productVariants)
      .where(eq(productVariants.productId, productId))
      .orderBy(productVariants.createdAt);
  }

  async createVariant(variant: InsertProductVariant): Promise<ProductVariant> {
    const result = await db.insert(productVariants).values(variant).returning();
    return result[0];
  }

  async updateVariant(id: string, data: Partial<InsertProductVariant>): Promise<ProductVariant | undefined> {
    const result = await db
      .update(productVariants)
      .set(data)
      .where(eq(productVariants.id, id))
      .returning();
    return result[0];
  }

  async deleteVariant(id: string): Promise<boolean> {
    const result = await db.delete(productVariants).where(eq(productVariants.id, id)).returning();
    return result.length > 0;
  }

  // Product Import operations (Prompt 13)
  async createProductImport(record: InsertProductImport): Promise<ProductImport> {
    const result = await db.insert(productImports).values(record).returning();
    return result[0];
  }

  async updateProductImport(id: string, data: Partial<InsertProductImport>): Promise<ProductImport | undefined> {
    const result = await db
      .update(productImports)
      .set(data)
      .where(eq(productImports.id, id))
      .returning();
    return result[0];
  }

  async getProductImportsByMerchant(merchantId: string): Promise<ProductImport[]> {
    return await db
      .select()
      .from(productImports)
      .where(eq(productImports.merchantId, merchantId))
      .orderBy(desc(productImports.createdAt));
  }

  // Tier Entitlement operations (Prompt 14)
  async getTierEntitlements(tierName: string): Promise<TierEntitlement[]> {
    return await db
      .select()
      .from(tierEntitlements)
      .where(and(eq(tierEntitlements.tierName, tierName), eq(tierEntitlements.isActive, true)));
  }

  async getAllTierEntitlements(): Promise<TierEntitlement[]> {
    return await db
      .select()
      .from(tierEntitlements)
      .where(eq(tierEntitlements.isActive, true))
      .orderBy(tierEntitlements.tierName, tierEntitlements.featureKey);
  }

  async getTierEntitlement(tierName: string, featureKey: string): Promise<TierEntitlement | undefined> {
    const result = await db
      .select()
      .from(tierEntitlements)
      .where(and(eq(tierEntitlements.tierName, tierName), eq(tierEntitlements.featureKey, featureKey)));
    return result[0];
  }

  async createTierEntitlement(entitlement: InsertTierEntitlement): Promise<TierEntitlement> {
    const result = await db.insert(tierEntitlements).values(entitlement).returning();
    return result[0];
  }

  async updateTierEntitlement(id: string, data: Partial<InsertTierEntitlement>): Promise<TierEntitlement | undefined> {
    const result = await db
      .update(tierEntitlements)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(tierEntitlements.id, id))
      .returning();
    return result[0];
  }

  // ========================================
  // Customer Account operations (Part 9)
  // ========================================

  async getCustomerAccount(id: string): Promise<CustomerAccount | undefined> {
    const result = await db.select().from(customerAccounts).where(eq(customerAccounts.id, id));
    return result[0];
  }

  async getCustomerAccountsByMerchant(merchantId: string): Promise<CustomerAccount[]> {
    return await db
      .select()
      .from(customerAccounts)
      .where(eq(customerAccounts.merchantId, merchantId))
      .orderBy(desc(customerAccounts.createdAt));
  }

  async createCustomerAccount(account: InsertCustomerAccount): Promise<CustomerAccount> {
    const result = await db.insert(customerAccounts).values(account).returning();
    return result[0];
  }

  async updateCustomerAccount(id: string, data: Partial<InsertCustomerAccount>): Promise<CustomerAccount | undefined> {
    const result = await db
      .update(customerAccounts)
      .set(data)
      .where(eq(customerAccounts.id, id))
      .returning();
    return result[0];
  }

  async deleteCustomerAccount(id: string): Promise<boolean> {
    const result = await db.delete(customerAccounts).where(eq(customerAccounts.id, id)).returning();
    return result.length > 0;
  }

  // ========================================
  // Customer Payment Method operations (Part 9)
  // ========================================

  async getCustomerPaymentMethod(id: string): Promise<CustomerPaymentMethod | undefined> {
    const result = await db.select().from(customerPaymentMethods).where(eq(customerPaymentMethods.id, id));
    return result[0];
  }

  async getCustomerPaymentMethodsByCustomer(customerId: string): Promise<CustomerPaymentMethod[]> {
    return await db
      .select()
      .from(customerPaymentMethods)
      .where(eq(customerPaymentMethods.customerId, customerId))
      .orderBy(desc(customerPaymentMethods.createdAt));
  }

  async createCustomerPaymentMethod(method: InsertCustomerPaymentMethod): Promise<CustomerPaymentMethod> {
    const result = await db.insert(customerPaymentMethods).values(method).returning();
    return result[0];
  }

  async updateCustomerPaymentMethod(id: string, data: Partial<InsertCustomerPaymentMethod>): Promise<CustomerPaymentMethod | undefined> {
    const result = await db
      .update(customerPaymentMethods)
      .set(data)
      .where(eq(customerPaymentMethods.id, id))
      .returning();
    return result[0];
  }

  async deleteCustomerPaymentMethod(id: string): Promise<boolean> {
    const result = await db.delete(customerPaymentMethods).where(eq(customerPaymentMethods.id, id)).returning();
    return result.length > 0;
  }

  // ========================================
  // Customer Support Ticket operations (Part 9)
  // ========================================

  async getCustomerSupportTicket(id: string): Promise<CustomerSupportTicket | undefined> {
    const result = await db.select().from(customerSupportTickets).where(eq(customerSupportTickets.id, id));
    return result[0];
  }

  async getCustomerSupportTicketsByMerchant(merchantId: string): Promise<CustomerSupportTicket[]> {
    return await db
      .select()
      .from(customerSupportTickets)
      .where(eq(customerSupportTickets.merchantId, merchantId))
      .orderBy(desc(customerSupportTickets.createdAt));
  }

  async createCustomerSupportTicket(ticket: InsertCustomerSupportTicket): Promise<CustomerSupportTicket> {
    const result = await db.insert(customerSupportTickets).values(ticket).returning();
    return result[0];
  }

  async updateCustomerSupportTicket(id: string, data: Partial<InsertCustomerSupportTicket>): Promise<CustomerSupportTicket | undefined> {
    const result = await db
      .update(customerSupportTickets)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(customerSupportTickets.id, id))
      .returning();
    return result[0];
  }

  async deleteCustomerSupportTicket(id: string): Promise<boolean> {
    const result = await db.delete(customerSupportTickets).where(eq(customerSupportTickets.id, id)).returning();
    return result.length > 0;
  }

  // ========================================
  // Security Settings operations (Part 9)
  // ========================================

  async getSecuritySettings(merchantId: string): Promise<SecuritySettings | undefined> {
    const result = await db.select().from(securitySettings).where(eq(securitySettings.merchantId, merchantId));
    return result[0];
  }

  async upsertSecuritySettings(merchantId: string, data: Partial<InsertSecuritySettings>): Promise<SecuritySettings> {
    const existing = await this.getSecuritySettings(merchantId);
    if (existing) {
      const result = await db
        .update(securitySettings)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(securitySettings.id, existing.id))
        .returning();
      return result[0];
    }
    const result = await db
      .insert(securitySettings)
      .values({ ...data, merchantId } as InsertSecuritySettings)
      .returning();
    return result[0];
  }

  // ========================================
  // Fraud Score operations (Part 9)
  // ========================================

  async getFraudScore(id: string): Promise<FraudScore | undefined> {
    const result = await db.select().from(fraudScores).where(eq(fraudScores.id, id));
    return result[0];
  }

  async getFraudScoresByTransaction(transactionId: string): Promise<FraudScore[]> {
    return await db
      .select()
      .from(fraudScores)
      .where(eq(fraudScores.transactionId, transactionId))
      .orderBy(desc(fraudScores.createdAt));
  }

  async createFraudScore(score: InsertFraudScore): Promise<FraudScore> {
    const result = await db.insert(fraudScores).values(score).returning();
    return result[0];
  }

  // ========================================
  // Device Fingerprint operations (Part 9)
  // ========================================

  async getDeviceFingerprint(id: string): Promise<DeviceFingerprint | undefined> {
    const result = await db.select().from(deviceFingerprints).where(eq(deviceFingerprints.id, id));
    return result[0];
  }

  async getDeviceFingerprintsByMerchant(merchantId: string): Promise<DeviceFingerprint[]> {
    return await db
      .select()
      .from(deviceFingerprints)
      .where(eq(deviceFingerprints.merchantId, merchantId))
      .orderBy(desc(deviceFingerprints.lastSeen));
  }

  async createDeviceFingerprint(fingerprint: InsertDeviceFingerprint): Promise<DeviceFingerprint> {
    const result = await db.insert(deviceFingerprints).values(fingerprint).returning();
    return result[0];
  }

  async updateDeviceFingerprint(id: string, data: Partial<InsertDeviceFingerprint>): Promise<DeviceFingerprint | undefined> {
    const result = await db
      .update(deviceFingerprints)
      .set({ ...data, lastSeen: new Date() })
      .where(eq(deviceFingerprints.id, id))
      .returning();
    return result[0];
  }

  async deleteDeviceFingerprint(id: string): Promise<boolean> {
    const result = await db.delete(deviceFingerprints).where(eq(deviceFingerprints.id, id)).returning();
    return result.length > 0;
  }

  // ========================================
  // Chargeback Alert operations (Part 9)
  // ========================================

  async getChargebackAlert(id: string): Promise<ChargebackAlert | undefined> {
    const result = await db.select().from(chargebackAlerts).where(eq(chargebackAlerts.id, id));
    return result[0];
  }

  async getChargebackAlertsByMerchant(merchantId: string): Promise<ChargebackAlert[]> {
    return await db
      .select()
      .from(chargebackAlerts)
      .where(eq(chargebackAlerts.merchantId, merchantId))
      .orderBy(desc(chargebackAlerts.createdAt));
  }

  async createChargebackAlert(alert: InsertChargebackAlert): Promise<ChargebackAlert> {
    const result = await db.insert(chargebackAlerts).values(alert).returning();
    return result[0];
  }

  // ========================================
  // Checkout Settings operations (Part 9)
  // ========================================

  async getCheckoutSettings(merchantId: string): Promise<CheckoutSettings | undefined> {
    const result = await db.select().from(checkoutSettings).where(eq(checkoutSettings.merchantId, merchantId));
    return result[0];
  }

  async upsertCheckoutSettings(merchantId: string, data: Partial<InsertCheckoutSettings>): Promise<CheckoutSettings> {
    const existing = await this.getCheckoutSettings(merchantId);
    if (existing) {
      const result = await db
        .update(checkoutSettings)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(checkoutSettings.id, existing.id))
        .returning();
      return result[0];
    }
    const result = await db
      .insert(checkoutSettings)
      .values({ ...data, merchantId } as InsertCheckoutSettings)
      .returning();
    return result[0];
  }

  // ========================================
  // A/B Test operations (Part 9)
  // ========================================

  async getAbTest(id: string): Promise<AbTest | undefined> {
    const result = await db.select().from(abTests).where(eq(abTests.id, id));
    return result[0];
  }

  async getAbTestsByMerchant(merchantId: string): Promise<AbTest[]> {
    return await db
      .select()
      .from(abTests)
      .where(eq(abTests.merchantId, merchantId));
  }

  async createAbTest(test: InsertAbTest): Promise<AbTest> {
    const result = await db.insert(abTests).values(test).returning();
    return result[0];
  }

  async updateAbTest(id: string, data: Partial<InsertAbTest>): Promise<AbTest | undefined> {
    const result = await db
      .update(abTests)
      .set(data)
      .where(eq(abTests.id, id))
      .returning();
    return result[0];
  }

  async deleteAbTest(id: string): Promise<boolean> {
    const result = await db.delete(abTests).where(eq(abTests.id, id)).returning();
    return result.length > 0;
  }

  // ========================================
  // A/B Test Result operations (Part 9)
  // ========================================

  async getAbTestResult(id: string): Promise<AbTestResult | undefined> {
    const result = await db.select().from(abTestResults).where(eq(abTestResults.id, id));
    return result[0];
  }

  async getAbTestResultsByTest(testId: string): Promise<AbTestResult[]> {
    return await db
      .select()
      .from(abTestResults)
      .where(eq(abTestResults.testId, testId))
      .orderBy(desc(abTestResults.updatedAt));
  }

  async createAbTestResult(testResult: InsertAbTestResult): Promise<AbTestResult> {
    const result = await db.insert(abTestResults).values(testResult).returning();
    return result[0];
  }

  async updateAbTestResult(id: string, data: Partial<InsertAbTestResult>): Promise<AbTestResult | undefined> {
    const result = await db
      .update(abTestResults)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(abTestResults.id, id))
      .returning();
    return result[0];
  }

  async deleteAbTestResult(id: string): Promise<boolean> {
    const result = await db.delete(abTestResults).where(eq(abTestResults.id, id)).returning();
    return result.length > 0;
  }

  // ========================================
  // Checkout Analytics operations (Part 9)
  // ========================================

  async getCheckoutAnalytics(id: string): Promise<CheckoutAnalytics | undefined> {
    const result = await db.select().from(checkoutAnalytics).where(eq(checkoutAnalytics.id, id));
    return result[0];
  }

  async getCheckoutAnalyticsByMerchant(merchantId: string): Promise<CheckoutAnalytics[]> {
    return await db
      .select()
      .from(checkoutAnalytics)
      .where(eq(checkoutAnalytics.merchantId, merchantId))
      .orderBy(desc(checkoutAnalytics.createdAt));
  }

  async createCheckoutAnalytics(analytics: InsertCheckoutAnalytics): Promise<CheckoutAnalytics> {
    const result = await db.insert(checkoutAnalytics).values(analytics).returning();
    return result[0];
  }

  // ========================================
  // Saved Cart operations (Part 9)
  // ========================================

  async getSavedCart(id: string): Promise<SavedCart | undefined> {
    const result = await db.select().from(savedCarts).where(eq(savedCarts.id, id));
    return result[0];
  }

  async getSavedCartByShareToken(shareToken: string): Promise<SavedCart | undefined> {
    const result = await db.select().from(savedCarts).where(eq(savedCarts.shareToken, shareToken));
    return result[0];
  }

  async getSavedCartsByMerchant(merchantId: string): Promise<SavedCart[]> {
    return await db
      .select()
      .from(savedCarts)
      .where(eq(savedCarts.merchantId, merchantId))
      .orderBy(desc(savedCarts.createdAt));
  }

  async createSavedCart(cart: InsertSavedCart): Promise<SavedCart> {
    const result = await db.insert(savedCarts).values(cart).returning();
    return result[0];
  }

  async updateSavedCart(id: string, data: Partial<InsertSavedCart>): Promise<SavedCart | undefined> {
    const result = await db
      .update(savedCarts)
      .set(data)
      .where(eq(savedCarts.id, id))
      .returning();
    return result[0];
  }

  async deleteSavedCart(id: string): Promise<boolean> {
    const result = await db.delete(savedCarts).where(eq(savedCarts.id, id)).returning();
    return result.length > 0;
  }

  // ========================================
  // Cart Recommendation operations (Part 9)
  // ========================================

  async getCartRecommendation(id: string): Promise<CartRecommendation | undefined> {
    const result = await db.select().from(cartRecommendations).where(eq(cartRecommendations.id, id));
    return result[0];
  }

  async getCartRecommendationsByMerchant(merchantId: string): Promise<CartRecommendation[]> {
    return await db
      .select()
      .from(cartRecommendations)
      .where(eq(cartRecommendations.merchantId, merchantId))
      .orderBy(desc(cartRecommendations.createdAt));
  }

  async createCartRecommendation(rec: InsertCartRecommendation): Promise<CartRecommendation> {
    const result = await db.insert(cartRecommendations).values(rec).returning();
    return result[0];
  }

  async updateCartRecommendation(id: string, data: Partial<InsertCartRecommendation>): Promise<CartRecommendation | undefined> {
    const result = await db
      .update(cartRecommendations)
      .set(data)
      .where(eq(cartRecommendations.id, id))
      .returning();
    return result[0];
  }

  async deleteCartRecommendation(id: string): Promise<boolean> {
    const result = await db.delete(cartRecommendations).where(eq(cartRecommendations.id, id)).returning();
    return result.length > 0;
  }

  // ========================================
  // Cart Note operations (Part 9)
  // ========================================

  async getCartNote(id: string): Promise<CartNote | undefined> {
    const result = await db.select().from(cartNotes).where(eq(cartNotes.id, id));
    return result[0];
  }

  async getCartNotesByCart(cartId: string): Promise<CartNote[]> {
    return await db
      .select()
      .from(cartNotes)
      .where(eq(cartNotes.cartId, cartId))
      .orderBy(desc(cartNotes.createdAt));
  }

  async createCartNote(note: InsertCartNote): Promise<CartNote> {
    const result = await db.insert(cartNotes).values(note).returning();
    return result[0];
  }

  async updateCartNote(id: string, data: Partial<InsertCartNote>): Promise<CartNote | undefined> {
    const result = await db
      .update(cartNotes)
      .set(data)
      .where(eq(cartNotes.id, id))
      .returning();
    return result[0];
  }

  async deleteCartNote(id: string): Promise<boolean> {
    const result = await db.delete(cartNotes).where(eq(cartNotes.id, id)).returning();
    return result.length > 0;
  }

  // ========================================
  // Inventory Reservation operations (Part 9)
  // ========================================

  async getInventoryReservation(id: string): Promise<InventoryReservation | undefined> {
    const result = await db.select().from(inventoryReservations).where(eq(inventoryReservations.id, id));
    return result[0];
  }

  async getInventoryReservationsByProduct(productId: string): Promise<InventoryReservation[]> {
    return await db
      .select()
      .from(inventoryReservations)
      .where(eq(inventoryReservations.productId, productId))
      .orderBy(desc(inventoryReservations.reservedAt));
  }

  async getInventoryReservationsByCart(cartId: string): Promise<InventoryReservation[]> {
    return await db
      .select()
      .from(inventoryReservations)
      .where(eq(inventoryReservations.cartId, cartId))
      .orderBy(desc(inventoryReservations.reservedAt));
  }

  async createInventoryReservation(reservation: InsertInventoryReservation): Promise<InventoryReservation> {
    const result = await db.insert(inventoryReservations).values(reservation).returning();
    return result[0];
  }

  async updateInventoryReservation(id: string, data: Partial<InsertInventoryReservation>): Promise<InventoryReservation | undefined> {
    const result = await db
      .update(inventoryReservations)
      .set(data)
      .where(eq(inventoryReservations.id, id))
      .returning();
    return result[0];
  }

  async deleteInventoryReservation(id: string): Promise<boolean> {
    const result = await db.delete(inventoryReservations).where(eq(inventoryReservations.id, id)).returning();
    return result.length > 0;
  }

  // ========================================
  // Analytics Daily operations (Part 9)
  // ========================================

  async getAnalyticsDaily(id: string): Promise<AnalyticsDaily | undefined> {
    const result = await db.select().from(analyticsDaily).where(eq(analyticsDaily.id, id));
    return result[0];
  }

  async getAnalyticsDailyByMerchant(merchantId: string, startDate?: Date, endDate?: Date): Promise<AnalyticsDaily[]> {
    const conditions = [eq(analyticsDaily.merchantId, merchantId)];
    if (startDate) {
      conditions.push(gte(analyticsDaily.date, startDate));
    }
    if (endDate) {
      conditions.push(lte(analyticsDaily.date, endDate));
    }
    return await db
      .select()
      .from(analyticsDaily)
      .where(and(...conditions))
      .orderBy(desc(analyticsDaily.date));
  }

  async createAnalyticsDaily(analytics: InsertAnalyticsDaily): Promise<AnalyticsDaily> {
    const result = await db.insert(analyticsDaily).values(analytics).returning();
    return result[0];
  }

  // ========================================
  // Analytics Products operations (Part 9)
  // ========================================

  async getAnalyticsProducts(id: string): Promise<AnalyticsProducts | undefined> {
    const result = await db.select().from(analyticsProducts).where(eq(analyticsProducts.id, id));
    return result[0];
  }

  async getAnalyticsProductsByMerchant(merchantId: string): Promise<AnalyticsProducts[]> {
    return await db
      .select()
      .from(analyticsProducts)
      .where(eq(analyticsProducts.merchantId, merchantId))
      .orderBy(desc(analyticsProducts.date));
  }

  async createAnalyticsProducts(analytics: InsertAnalyticsProducts): Promise<AnalyticsProducts> {
    const result = await db.insert(analyticsProducts).values(analytics).returning();
    return result[0];
  }

  // ========================================
  // Customer LTV operations (Part 9)
  // ========================================

  async getCustomerLtv(id: string): Promise<CustomerLtv | undefined> {
    const result = await db.select().from(customerLtv).where(eq(customerLtv.id, id));
    return result[0];
  }

  async getCustomerLtvByMerchant(merchantId: string): Promise<CustomerLtv[]> {
    return await db
      .select()
      .from(customerLtv)
      .where(eq(customerLtv.merchantId, merchantId))
      .orderBy(desc(customerLtv.calculatedAt));
  }

  async createCustomerLtv(ltv: InsertCustomerLtv): Promise<CustomerLtv> {
    const result = await db.insert(customerLtv).values(ltv).returning();
    return result[0];
  }

  async updateCustomerLtv(id: string, data: Partial<InsertCustomerLtv>): Promise<CustomerLtv | undefined> {
    const result = await db
      .update(customerLtv)
      .set({ ...data, calculatedAt: new Date() })
      .where(eq(customerLtv.id, id))
      .returning();
    return result[0];
  }

  // ========================================
  // Scheduled Report operations (Part 9)
  // ========================================

  async getScheduledReport(id: string): Promise<ScheduledReport | undefined> {
    const result = await db.select().from(scheduledReports).where(eq(scheduledReports.id, id));
    return result[0];
  }

  async getScheduledReportsByMerchant(merchantId: string): Promise<ScheduledReport[]> {
    return await db
      .select()
      .from(scheduledReports)
      .where(eq(scheduledReports.merchantId, merchantId));
  }

  async createScheduledReport(report: InsertScheduledReport): Promise<ScheduledReport> {
    const result = await db.insert(scheduledReports).values(report).returning();
    return result[0];
  }

  async updateScheduledReport(id: string, data: Partial<InsertScheduledReport>): Promise<ScheduledReport | undefined> {
    const result = await db
      .update(scheduledReports)
      .set(data)
      .where(eq(scheduledReports.id, id))
      .returning();
    return result[0];
  }

  async deleteScheduledReport(id: string): Promise<boolean> {
    const result = await db.delete(scheduledReports).where(eq(scheduledReports.id, id)).returning();
    return result.length > 0;
  }

  // ========================================
  // Brand Settings operations (Part 9)
  // ========================================

  async getBrandSettings(merchantId: string): Promise<BrandSettings | undefined> {
    const result = await db.select().from(brandSettings).where(eq(brandSettings.merchantId, merchantId));
    return result[0];
  }

  async upsertBrandSettings(merchantId: string, data: Partial<InsertBrandSettings>): Promise<BrandSettings> {
    const existing = await this.getBrandSettings(merchantId);
    if (existing) {
      const result = await db
        .update(brandSettings)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(brandSettings.id, existing.id))
        .returning();
      return result[0];
    }
    const result = await db
      .insert(brandSettings)
      .values({ ...data, merchantId } as InsertBrandSettings)
      .returning();
    return result[0];
  }

  // ========================================
  // Email Template operations (Part 9)
  // ========================================

  async getEmailTemplate(id: string): Promise<EmailTemplate | undefined> {
    const result = await db.select().from(emailTemplates).where(eq(emailTemplates.id, id));
    return result[0];
  }

  async getEmailTemplatesByMerchant(merchantId: string): Promise<EmailTemplate[]> {
    return await db
      .select()
      .from(emailTemplates)
      .where(eq(emailTemplates.merchantId, merchantId))
      .orderBy(desc(emailTemplates.createdAt));
  }

  async createEmailTemplate(template: InsertEmailTemplate): Promise<EmailTemplate> {
    const result = await db.insert(emailTemplates).values(template).returning();
    return result[0];
  }

  async updateEmailTemplate(id: string, data: Partial<InsertEmailTemplate>): Promise<EmailTemplate | undefined> {
    const result = await db
      .update(emailTemplates)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(emailTemplates.id, id))
      .returning();
    return result[0];
  }

  async deleteEmailTemplate(id: string): Promise<boolean> {
    const result = await db.delete(emailTemplates).where(eq(emailTemplates.id, id)).returning();
    return result.length > 0;
  }

  // ========================================
  // Receipt Settings operations (Part 9)
  // ========================================

  async getReceiptSettings(merchantId: string): Promise<ReceiptSettings | undefined> {
    const result = await db.select().from(receiptSettings).where(eq(receiptSettings.merchantId, merchantId));
    return result[0];
  }

  async upsertReceiptSettings(merchantId: string, data: Partial<InsertReceiptSettings>): Promise<ReceiptSettings> {
    const existing = await this.getReceiptSettings(merchantId);
    if (existing) {
      const result = await db
        .update(receiptSettings)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(receiptSettings.id, existing.id))
        .returning();
      return result[0];
    }
    const result = await db
      .insert(receiptSettings)
      .values({ ...data, merchantId } as InsertReceiptSettings)
      .returning();
    return result[0];
  }

  // ========================================
  // Merchant Subscription operations (Part 9)
  // ========================================

  async getMerchantSubscription(id: string): Promise<MerchantSubscription | undefined> {
    const result = await db.select().from(merchantSubscriptions).where(eq(merchantSubscriptions.id, id));
    return result[0];
  }

  async getMerchantSubscriptionsByMerchant(merchantId: string): Promise<MerchantSubscription[]> {
    return await db
      .select()
      .from(merchantSubscriptions)
      .where(eq(merchantSubscriptions.merchantId, merchantId))
      .orderBy(desc(merchantSubscriptions.startedAt));
  }

  async createMerchantSubscription(subscription: InsertMerchantSubscription): Promise<MerchantSubscription> {
    const result = await db.insert(merchantSubscriptions).values(subscription).returning();
    return result[0];
  }

  async updateMerchantSubscription(id: string, data: Partial<InsertMerchantSubscription>): Promise<MerchantSubscription | undefined> {
    const result = await db
      .update(merchantSubscriptions)
      .set(data)
      .where(eq(merchantSubscriptions.id, id))
      .returning();
    return result[0];
  }

  async deleteMerchantSubscription(id: string): Promise<boolean> {
    const result = await db.delete(merchantSubscriptions).where(eq(merchantSubscriptions.id, id)).returning();
    return result.length > 0;
  }

  // ========================================
  // Addon Subscription operations (Part 9)
  // ========================================

  async getAddonSubscription(id: string): Promise<AddonSubscription | undefined> {
    const result = await db.select().from(addonSubscriptions).where(eq(addonSubscriptions.id, id));
    return result[0];
  }

  async getAddonSubscriptionsByMerchant(merchantId: string): Promise<AddonSubscription[]> {
    return await db
      .select()
      .from(addonSubscriptions)
      .where(eq(addonSubscriptions.merchantId, merchantId))
      .orderBy(desc(addonSubscriptions.startedAt));
  }

  async createAddonSubscription(subscription: InsertAddonSubscription): Promise<AddonSubscription> {
    const result = await db.insert(addonSubscriptions).values(subscription).returning();
    return result[0];
  }

  async updateAddonSubscription(id: string, data: Partial<InsertAddonSubscription>): Promise<AddonSubscription | undefined> {
    const result = await db
      .update(addonSubscriptions)
      .set(data)
      .where(eq(addonSubscriptions.id, id))
      .returning();
    return result[0];
  }

  async deleteAddonSubscription(id: string): Promise<boolean> {
    const result = await db.delete(addonSubscriptions).where(eq(addonSubscriptions.id, id)).returning();
    return result.length > 0;
  }

  // ========================================
  // API Log operations (Part 9)
  // ========================================

  async getApiLog(id: string): Promise<ApiLog | undefined> {
    const result = await db.select().from(apiLogs).where(eq(apiLogs.id, id));
    return result[0];
  }

  async getApiLogsByMerchant(merchantId: string): Promise<ApiLog[]> {
    return await db
      .select()
      .from(apiLogs)
      .where(eq(apiLogs.merchantId, merchantId))
      .orderBy(desc(apiLogs.createdAt));
  }

  async createApiLog(log: InsertApiLog): Promise<ApiLog> {
    const result = await db.insert(apiLogs).values(log).returning();
    return result[0];
  }

  // ========================================
  // Customer Vault operations (Prompt 10)
  // ========================================

  async getCustomerVaultRecord(id: string): Promise<CustomerVaultRecord | undefined> {
    const result = await db.select().from(customerVault).where(eq(customerVault.id, id));
    return result[0];
  }

  async getCustomerVaultByMerchant(merchantId: string): Promise<CustomerVaultRecord[]> {
    return await db
      .select()
      .from(customerVault)
      .where(eq(customerVault.merchantId, merchantId))
      .orderBy(desc(customerVault.createdAt));
  }

  async createCustomerVaultRecord(record: InsertCustomerVault): Promise<CustomerVaultRecord> {
    const result = await db.insert(customerVault).values(record).returning();
    return result[0];
  }

  async updateCustomerVaultRecord(id: string, data: Partial<InsertCustomerVault>): Promise<CustomerVaultRecord | undefined> {
    const result = await db
      .update(customerVault)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(customerVault.id, id))
      .returning();
    return result[0];
  }

  async deleteCustomerVaultRecord(id: string): Promise<boolean> {
    const result = await db.delete(customerVault).where(eq(customerVault.id, id)).returning();
    return result.length > 0;
  }

  // ========================================
  // Vault Payment Method operations (Prompt 10)
  // ========================================

  async getVaultPaymentMethod(id: string): Promise<VaultPaymentMethod | undefined> {
    const result = await db.select().from(vaultPaymentMethods).where(eq(vaultPaymentMethods.id, id));
    return result[0];
  }

  async getVaultPaymentMethodsByCustomer(customerId: string): Promise<VaultPaymentMethod[]> {
    return await db
      .select()
      .from(vaultPaymentMethods)
      .where(eq(vaultPaymentMethods.customerId, customerId))
      .orderBy(desc(vaultPaymentMethods.createdAt));
  }

  async createVaultPaymentMethod(method: InsertVaultPaymentMethod): Promise<VaultPaymentMethod> {
    const result = await db.insert(vaultPaymentMethods).values(method).returning();
    return result[0];
  }

  async updateVaultPaymentMethod(id: string, data: Partial<InsertVaultPaymentMethod>): Promise<VaultPaymentMethod | undefined> {
    const result = await db
      .update(vaultPaymentMethods)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(vaultPaymentMethods.id, id))
      .returning();
    return result[0];
  }

  async deleteVaultPaymentMethod(id: string): Promise<boolean> {
    const result = await db.delete(vaultPaymentMethods).where(eq(vaultPaymentMethods.id, id)).returning();
    return result.length > 0;
  }

  // ========================================
  // Conversation operations (AI Chat)
  // ========================================

  async getConversation(id: string): Promise<Conversation | undefined> {
    const result = await db.select().from(conversations).where(eq(conversations.id, id));
    return result[0];
  }

  async getAllConversations(): Promise<Conversation[]> {
    return await db
      .select()
      .from(conversations)
      .orderBy(desc(conversations.createdAt));
  }

  async createConversation(conversation: InsertConversation): Promise<Conversation> {
    const result = await db.insert(conversations).values(conversation).returning();
    return result[0];
  }

  async updateConversation(id: string, data: Partial<InsertConversation>): Promise<Conversation | undefined> {
    const result = await db
      .update(conversations)
      .set(data)
      .where(eq(conversations.id, id))
      .returning();
    return result[0];
  }

  async deleteConversation(id: string): Promise<boolean> {
    const result = await db.delete(conversations).where(eq(conversations.id, id)).returning();
    return result.length > 0;
  }

  // ========================================
  // Message operations (AI Chat)
  // ========================================

  async getMessage(id: string): Promise<Message | undefined> {
    const result = await db.select().from(messages).where(eq(messages.id, id));
    return result[0];
  }

  async getMessagesByConversation(conversationId: string): Promise<Message[]> {
    return await db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, conversationId))
      .orderBy(messages.createdAt);
  }

  async createMessage(message: InsertMessage): Promise<Message> {
    const result = await db.insert(messages).values(message).returning();
    return result[0];
  }

  async updateMessage(id: string, data: Partial<InsertMessage>): Promise<Message | undefined> {
    const result = await db
      .update(messages)
      .set(data)
      .where(eq(messages.id, id))
      .returning();
    return result[0];
  }

  async deleteMessage(id: string): Promise<boolean> {
    const result = await db.delete(messages).where(eq(messages.id, id)).returning();
    return result.length > 0;
  }

  // Merchant Profile operations (Prompt 21)
  async getMerchantProfile(merchantId: string): Promise<MerchantProfile | undefined> {
    const result = await db.select().from(merchantProfiles).where(eq(merchantProfiles.merchantId, merchantId));
    return result[0];
  }

  async upsertMerchantProfile(merchantId: string, data: Partial<InsertMerchantProfile>): Promise<MerchantProfile> {
    const existing = await this.getMerchantProfile(merchantId);
    if (existing) {
      const result = await db
        .update(merchantProfiles)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(merchantProfiles.merchantId, merchantId))
        .returning();
      return result[0];
    }
    const result = await db
      .insert(merchantProfiles)
      .values({ ...data, merchantId })
      .returning();
    return result[0];
  }

  async updateMerchantAccountBusinessName(id: string, businessName: string): Promise<MerchantAccount | undefined> {
    const result = await db
      .update(merchantAccounts)
      .set({ businessName })
      .where(eq(merchantAccounts.id, id))
      .returning();
    return result[0];
  }

  // Merchant Transaction operations (Prompt 21)
  async getMerchantTransactions(merchantId: string, limit = 50, offset = 0): Promise<MerchantTransaction[]> {
    return await db
      .select()
      .from(merchantTransactions)
      .where(eq(merchantTransactions.merchantId, merchantId))
      .orderBy(desc(merchantTransactions.createdAt))
      .limit(limit)
      .offset(offset);
  }

  async createMerchantTransaction(transaction: InsertMerchantTransaction): Promise<MerchantTransaction> {
    const result = await db.insert(merchantTransactions).values(transaction).returning();
    return result[0];
  }
}

export const storage = new DbStorage();
