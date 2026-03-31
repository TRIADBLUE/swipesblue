import { Switch, Route, useLocation, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import AdminLayout from "@/components/AdminLayout";
import DashboardLayout from "@/components/DashboardLayout";
import Home from "@/pages/Home";
import Dashboard from "@/pages/Dashboard";
import Transactions from "@/pages/Transactions";
import Products from "@/pages/Products";
import ShoppingCart from "@/pages/ShoppingCart";
import Checkout from "@/pages/Checkout";
import Orders from "@/pages/Orders";
import BrandStudio from "@/pages/BrandStudio";
import Pricing from "@/pages/Pricing";
import Demo from "@/pages/Demo";
import Developers from "@/pages/Developers";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import AdminDashboard from "@/pages/admin/AdminDashboard";
import AdminLogin from "@/pages/admin/AdminLogin";
import Merchants from "@/pages/admin/Merchants";
import AdminTransactions from "@/pages/admin/AdminTransactions";
import ApiKeys from "@/pages/admin/ApiKeys";
import Webhooks from "@/pages/admin/Webhooks";
import RateManagement from "@/pages/admin/RateManagement";
import NotFound from "@/pages/not-found";
import ProductDetail from "@/pages/ProductDetail";
import SubscriptionCheckout from "@/pages/SubscriptionCheckout";
import SubscriptionSuccess from "@/pages/SubscriptionSuccess";
import TermsOfService from "@/pages/legal/TermsOfService";
import PrivacyPolicy from "@/pages/legal/PrivacyPolicy";
import CookiePolicy from "@/pages/legal/CookiePolicy";
import AcceptableUsePolicy from "@/pages/legal/AcceptableUsePolicy";
import About from "@/pages/About";
import ProcessingFees from "@/pages/ProcessingFees";
import HelpCenter from "@/pages/HelpCenter";
import SystemStatus from "@/pages/SystemStatus";
import Blog from "@/pages/Blog";
import Careers from "@/pages/Careers";
import Security from "@/pages/Security";

// Public product marketing pages
import EcommerceSuite from "@/pages/products/EcommerceSuite";
import ShoppingCartProduct from "@/pages/products/ShoppingCartProduct";
import CheckoutProduct from "@/pages/products/CheckoutProduct";
import VirtualTerminalProduct from "@/pages/products/VirtualTerminalProduct";
import PaymentLinksProduct from "@/pages/products/PaymentLinksProduct";
import InvoicingProduct from "@/pages/products/InvoicingProduct";
import RecurringBillingProduct from "@/pages/products/RecurringBillingProduct";
import CustomerVaultProduct from "@/pages/products/CustomerVaultProduct";
import FraudPreventionProduct from "@/pages/products/FraudPreventionProduct";

// Dashboard pages — Workspace
import CustomerList from "@/pages/dashboard/CustomerList";
import OrdersDashboard from "@/pages/dashboard/OrdersDashboard";
import TransactionsDashboard from "@/pages/dashboard/TransactionsDashboard";
import Balances from "@/pages/dashboard/Balances";
import MerchantProducts from "@/pages/dashboard/MerchantProducts";
import ProductForm from "@/pages/dashboard/ProductForm";
import BulkEditor from "@/pages/dashboard/BulkEditor";
import ImportExport from "@/pages/dashboard/ImportExport";

// Dashboard pages — Core Products
import EcommerceSuiteDashboard from "@/pages/dashboard/EcommerceSuiteDashboard";
import ShoppingCartDashboard from "@/pages/dashboard/ShoppingCartDashboard";
import CheckoutDashboard from "@/pages/dashboard/CheckoutDashboard";
import VirtualTerminal from "@/pages/dashboard/VirtualTerminal";
import PaymentLinks from "@/pages/dashboard/PaymentLinks";
import Invoicing from "@/pages/dashboard/Invoicing";
import Subscriptions from "@/pages/dashboard/Subscriptions";
import CustomerVault from "@/pages/dashboard/CustomerVault";
import FraudPrevention from "@/pages/dashboard/FraudPrevention";

// Dashboard pages — Enhancements
import EnhancementDetail from "@/pages/dashboard/EnhancementDetail";

// Dashboard pages — Other
import Reporting from "@/pages/dashboard/Reporting";
import SettingsPage from "@/pages/dashboard/SettingsPage";

import { AdminAuthProvider, useAdminAuth } from "@/contexts/AdminAuthContext";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { ReactNode } from "react";

function ProtectedAdminRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading } = useAdminAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F6F9FC] flex items-center justify-center">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Redirect to="/admin/login" />;
  }

  return <>{children}</>;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/pricing" component={Pricing} />
      <Route path="/demo" component={Demo} />
      <Route path="/developers" component={Developers} />
      <Route path="/about" component={About} />
      <Route path="/processing-fees" component={ProcessingFees} />
      <Route path="/help" component={HelpCenter} />
      <Route path="/status" component={SystemStatus} />
      <Route path="/blog" component={Blog} />
      <Route path="/careers" component={Careers} />
      <Route path="/security" component={Security} />
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />

      {/* Public Product Marketing Pages */}
      <Route path="/products/ecommerce" component={EcommerceSuite} />
      <Route path="/products/cart" component={ShoppingCartProduct} />
      <Route path="/products/checkout" component={CheckoutProduct} />
      <Route path="/products/terminal" component={VirtualTerminalProduct} />
      <Route path="/products/payment-links" component={PaymentLinksProduct} />
      <Route path="/products/invoicing" component={InvoicingProduct} />
      <Route path="/products/billing" component={RecurringBillingProduct} />
      <Route path="/products/customers" component={CustomerVaultProduct} />
      <Route path="/products/fraud" component={FraudPreventionProduct} />

      {/* Product catalog and detail pages */}
      <Route path="/products" component={Products} />
      <Route path="/products/:slug" component={ProductDetail} />
      <Route path="/subscribe/:slug" component={SubscriptionCheckout} />
      <Route path="/subscription/success" component={SubscriptionSuccess} />
      <Route path="/cart" component={ShoppingCart} />
      <Route path="/shoppingcart" component={ShoppingCart} />
      <Route path="/checkout" component={Checkout} />
      <Route path="/orders" component={Orders} />
      <Route path="/brand-studio" component={BrandStudio} />
      <Route path="/transactions" component={Transactions} />

      {/* Legal Pages */}
      <Route path="/terms" component={TermsOfService} />
      <Route path="/privacy" component={PrivacyPolicy} />
      <Route path="/cookies" component={CookiePolicy} />
      <Route path="/acceptable-use" component={AcceptableUsePolicy} />

      {/* ════════════════════════════════════════════════════════════
          BACKWARD COMPATIBILITY REDIRECTS — old routes → new routes
          ════════════════════════════════════════════════════════════ */}
      <Route path="/dashboard/virtual-terminal">
        {() => <Redirect to="/dashboard/terminal" />}
      </Route>
      <Route path="/dashboard/customer-vault">
        {() => <Redirect to="/dashboard/vault" />}
      </Route>
      <Route path="/dashboard/recurring-billing">
        {() => <Redirect to="/dashboard/subscriptions" />}
      </Route>
      <Route path="/dashboard/invoicing">
        {() => <Redirect to="/dashboard/invoices" />}
      </Route>
      <Route path="/dashboard/fraud-prevention">
        {() => <Redirect to="/dashboard/fraud" />}
      </Route>
      <Route path="/dashboard/brand-studio">
        {() => <Redirect to="/dashboard/settings" />}
      </Route>
      <Route path="/dashboard/products">
        {() => <Redirect to="/dashboard/catalog" />}
      </Route>
      <Route path="/dashboard/abandoned-carts">
        {() => <Redirect to="/dashboard/ecommerce/cart" />}
      </Route>
      <Route path="/dashboard/analytics">
        {() => <Redirect to="/dashboard/enhance/advanced-analytics" />}
      </Route>
      <Route path="/dashboard/security">
        {() => <Redirect to="/dashboard/enhance/security-suite" />}
      </Route>
      <Route path="/dashboard/checkout-optimizer">
        {() => <Redirect to="/dashboard/enhance/checkout-optimizer" />}
      </Route>
      <Route path="/dashboard/cart-settings">
        {() => <Redirect to="/dashboard/enhance/shopping-cart-pro" />}
      </Route>
      <Route path="/dashboard/gateways">
        {() => <Redirect to="/dashboard/enhance/multi-gateway" />}
      </Route>
      <Route path="/dashboard/customer-portal">
        {() => <Redirect to="/dashboard/enhance/customer-portal" />}
      </Route>
      <Route path="/dashboard/dispute-management">
        {() => <Redirect to="/dashboard/transactions" />}
      </Route>
      <Route path="/dashboard/api-keys">
        {() => <Redirect to="/dashboard/enhance/premium-api" />}
      </Route>
      <Route path="/dashboard/webhooks">
        {() => <Redirect to="/dashboard/enhance/premium-api" />}
      </Route>

      {/* ════════════════════════════════════════════════════════════
          DASHBOARD ROUTES — NEW STRUCTURE
          ════════════════════════════════════════════════════════════ */}

      {/* Overview */}
      <Route path="/dashboard">
        {() => (
          <DashboardLayout>
            <Dashboard />
          </DashboardLayout>
        )}
      </Route>

      {/* ── WORKSPACE ─────────────────────────────────────────── */}
      <Route path="/dashboard/customers">
        {() => (
          <DashboardLayout>
            <CustomerList />
          </DashboardLayout>
        )}
      </Route>
      <Route path="/dashboard/orders">
        {() => (
          <DashboardLayout>
            <OrdersDashboard />
          </DashboardLayout>
        )}
      </Route>
      <Route path="/dashboard/transactions">
        {() => (
          <DashboardLayout>
            <TransactionsDashboard />
          </DashboardLayout>
        )}
      </Route>
      <Route path="/dashboard/balances">
        {() => (
          <DashboardLayout>
            <Balances />
          </DashboardLayout>
        )}
      </Route>

      {/* Product Catalog */}
      <Route path="/dashboard/catalog">
        {() => (
          <DashboardLayout>
            <MerchantProducts />
          </DashboardLayout>
        )}
      </Route>
      <Route path="/dashboard/catalog/create">
        {() => (
          <DashboardLayout>
            <ProductForm />
          </DashboardLayout>
        )}
      </Route>
      <Route path="/dashboard/catalog/:id/edit">
        {() => (
          <DashboardLayout>
            <ProductForm />
          </DashboardLayout>
        )}
      </Route>
      <Route path="/dashboard/catalog/bulk-edit">
        {() => (
          <DashboardLayout>
            <BulkEditor />
          </DashboardLayout>
        )}
      </Route>
      <Route path="/dashboard/catalog/import">
        {() => (
          <DashboardLayout>
            <ImportExport />
          </DashboardLayout>
        )}
      </Route>

      {/* ── CORE PRODUCTS ─────────────────────────────────────── */}

      {/* E-Commerce Suite overview */}
      <Route path="/dashboard/ecommerce">
        {() => (
          <DashboardLayout>
            <EcommerceSuiteDashboard />
          </DashboardLayout>
        )}
      </Route>
      {/* Suite-dependent: Shopping Cart */}
      <Route path="/dashboard/ecommerce/cart">
        {() => (
          <DashboardLayout>
            <ShoppingCartDashboard />
          </DashboardLayout>
        )}
      </Route>
      {/* Suite-dependent: One-Page Checkout */}
      <Route path="/dashboard/ecommerce/checkout">
        {() => (
          <DashboardLayout>
            <CheckoutDashboard />
          </DashboardLayout>
        )}
      </Route>
      {/* Standalone: Virtual Terminal */}
      <Route path="/dashboard/terminal">
        {() => (
          <DashboardLayout>
            <VirtualTerminal />
          </DashboardLayout>
        )}
      </Route>
      {/* Standalone: Payment Links */}
      <Route path="/dashboard/payment-links">
        {() => (
          <DashboardLayout>
            <PaymentLinks />
          </DashboardLayout>
        )}
      </Route>
      {/* Standalone: Invoicing */}
      <Route path="/dashboard/invoices">
        {() => (
          <DashboardLayout>
            <Invoicing />
          </DashboardLayout>
        )}
      </Route>
      {/* Standalone: Subscriptions */}
      <Route path="/dashboard/subscriptions">
        {() => (
          <DashboardLayout>
            <Subscriptions />
          </DashboardLayout>
        )}
      </Route>
      {/* Standalone: Customer Vault */}
      <Route path="/dashboard/vault">
        {() => (
          <DashboardLayout>
            <CustomerVault />
          </DashboardLayout>
        )}
      </Route>
      {/* Fraud Prevention */}
      <Route path="/dashboard/fraud">
        {() => (
          <DashboardLayout>
            <FraudPrevention />
          </DashboardLayout>
        )}
      </Route>

      {/* ── ENHANCEMENTS ──────────────────────────────────────── */}
      <Route path="/dashboard/enhance/:slug">
        {() => (
          <DashboardLayout>
            <EnhancementDetail />
          </DashboardLayout>
        )}
      </Route>

      {/* ── SETTINGS ──────────────────────────────────────────── */}
      <Route path="/dashboard/settings/:tab?">
        {() => (
          <DashboardLayout>
            <SettingsPage />
          </DashboardLayout>
        )}
      </Route>

      {/* ── REPORTING ─────────────────────────────────────────── */}
      <Route path="/dashboard/reporting">
        {() => (
          <DashboardLayout>
            <Reporting />
          </DashboardLayout>
        )}
      </Route>

      {/* ════════════════════════════════════════════════════════════
          ADMIN ROUTES
          ════════════════════════════════════════════════════════════ */}

      {/* Admin Login (public) */}
      <Route path="/admin/login" component={AdminLogin} />

      {/* Protected Admin Routes */}
      <Route path="/admin">
        {() => (
          <ProtectedAdminRoute>
            <AdminLayout>
              <AdminDashboard />
            </AdminLayout>
          </ProtectedAdminRoute>
        )}
      </Route>
      <Route path="/admin/merchants">
        {() => (
          <ProtectedAdminRoute>
            <AdminLayout>
              <Merchants />
            </AdminLayout>
          </ProtectedAdminRoute>
        )}
      </Route>
      <Route path="/admin/transactions">
        {() => (
          <ProtectedAdminRoute>
            <AdminLayout>
              <AdminTransactions />
            </AdminLayout>
          </ProtectedAdminRoute>
        )}
      </Route>
      <Route path="/admin/rates">
        {() => (
          <ProtectedAdminRoute>
            <AdminLayout>
              <RateManagement />
            </AdminLayout>
          </ProtectedAdminRoute>
        )}
      </Route>
      <Route path="/admin/api-keys">
        {() => (
          <ProtectedAdminRoute>
            <AdminLayout>
              <ApiKeys />
            </AdminLayout>
          </ProtectedAdminRoute>
        )}
      </Route>
      <Route path="/admin/webhooks">
        {() => (
          <ProtectedAdminRoute>
            <AdminLayout>
              <Webhooks />
            </AdminLayout>
          </ProtectedAdminRoute>
        )}
      </Route>

      <Route component={NotFound} />
    </Switch>
  );
}

function AppLayout() {
  const [location] = useLocation();
  const isAdminRoute = location.startsWith("/admin");
  const isDashboardRoute = location.startsWith("/dashboard");
  const isAuthPage = location === "/login" || location === "/register";

  // Auth pages have their own layout
  if (isAuthPage) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Router />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F6F9FC]">
      <div className="max-w-[1400px] mx-auto bg-white min-h-screen flex flex-col border-x border-gray-200">
        {!isAdminRoute && <Header />}
        <main className="flex-1 flex flex-col">
          <Router />
        </main>
        {!isAdminRoute && !isDashboardRoute && <Footer />}
      </div>
    </div>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <AdminAuthProvider>
            <AppLayout />
            <Toaster />
          </AdminAuthProvider>
        </TooltipProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
