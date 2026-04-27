import { Link, useLocation } from "wouter";
import Logo from "./Logo";
import { 
  Menu, 
  X, 
  ArrowRight, 
  CreditCard, 
  Code, 
  LayoutDashboard, 
  ShoppingCart, 
  ChevronDown, 
  FileText, 
  Users, 
  Key, 
  Webhook, 
  Package, 
  Palette, 
  BookOpen, 
  Phone, 
  Activity,
  RefreshCw,
  Lock,
  Link as LinkIcon,
  Receipt,
  BarChart3,
  Settings,
  Globe,
  Terminal,
  Shield,
  User,
  LogOut,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useState, useEffect, useRef } from "react";
import { useMerchantAuth } from "@/hooks/use-merchant-auth";
import { useQueryClient } from "@tanstack/react-query";

interface MenuItem {
  icon: any;
  label: string;
  description: string;
  href: string;
  badge?: "FREE" | "NEW" | "PRO" | null;
}

interface MenuColumn {
  title: string;
  subtitle?: string;
  items: MenuItem[];
  ctaLabel?: string;
  ctaHref?: string;
}

const megaMenus: Record<string, { columns: MenuColumn[] }> = {
  products: {
    columns: [
      {
        title: "E-Commerce Suite",
        subtitle: "Complete online selling platform",
        items: [
          { icon: ShoppingCart, label: "E-Commerce Suite", description: "Full commerce platform overview", href: "/products/ecommerce" },
          { icon: Package, label: "Shopping Cart", description: "Product catalog & storefront", href: "/products/cart" },
          { icon: CreditCard, label: "Online Checkout", description: "Secure hosted checkout pages", href: "/products/checkout" },
        ],
        ctaLabel: "Explore the suite",
        ctaHref: "/products"
      },
      {
        title: "Payment Tools",
        subtitle: "Accept and manage payments",
        items: [
          { icon: Terminal, label: "Virtual Terminal", description: "Process cards in your browser", href: "/products/terminal" },
          { icon: LinkIcon, label: "Payment Links", description: "Shareable payment URLs", href: "/products/payment-links" },
          { icon: Receipt, label: "Invoicing", description: "Send professional invoices", href: "/products/invoicing" },
          { icon: RefreshCw, label: "Subscriptions", description: "Subscriptions & payment plans", href: "/products/billing" },
          { icon: Users, label: "Customer Vault", description: "Store payment methods securely", href: "/products/customers" },
          { icon: Lock, label: "Fraud Prevention", description: "Real-time fraud detection", href: "/products/fraud" },
        ],
        ctaLabel: "View all products",
        ctaHref: "/products"
      }
    ]
  },
  developers: {
    columns: [
      {
        title: "Get Started",
        subtitle: "Everything you need to integrate",
        items: [
          { icon: BookOpen, label: "Quick Start Guide", description: "Get up and running in minutes", href: "/developers", badge: "FREE" },
          { icon: Terminal, label: "API Reference", description: "Complete endpoint documentation", href: "/developers" },
          { icon: Code, label: "SDKs & Libraries", description: "Code samples in every language", href: "/developers" },
        ],
        ctaLabel: "Read the docs",
        ctaHref: "/developers"
      },
      {
        title: "Build & Test",
        subtitle: "Developer tools",
        items: [
          { icon: Key, label: "API Keys", description: "Manage your credentials", href: "/dashboard/api-keys" },
          { icon: Webhook, label: "Webhooks", description: "Real-time event notifications", href: "/dashboard/webhooks" },
          { icon: Globe, label: "Sandbox", description: "Test in a safe environment", href: "/demo" },
        ],
        ctaLabel: "Get API keys",
        ctaHref: "/dashboard/api-keys"
      },
      {
        title: "Learn More",
        subtitle: "Resources & support",
        items: [
          { icon: FileText, label: "Changelog", description: "Latest updates & releases", href: "/developers" },
          { icon: Users, label: "Community", description: "Connect with other developers", href: "/developers" },
        ],
        ctaLabel: "View status page",
        ctaHref: "/status"
      }
    ]
  },
  resources: {
    columns: [
      {
        title: "Support",
        subtitle: "Get help when you need it",
        items: [
          { icon: Users, label: "Help Center", description: "FAQs and tutorials", href: "/help" },
          { icon: Phone, label: "Contact Sales", description: "Talk to our team", href: "mailto:sales@swipesblue.com" },
          { icon: Activity, label: "System Status", description: "Uptime and incidents", href: "/status" },
        ],
        ctaLabel: "Get support",
        ctaHref: "/help"
      },
      {
        title: "Company",
        subtitle: "Learn about swipesblue",
        items: [
          { icon: Globe, label: "About Us", description: "Our mission and story", href: "/about" },
          { icon: FileText, label: "Blog", description: "News and updates", href: "/blog" },
          { icon: Users, label: "Careers", description: "Join our team", href: "/careers" },
        ],
        ctaLabel: "Learn more",
        ctaHref: "/about"
      }
    ]
  }
};

export default function Header() {
  const [location, setLocation] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const { isAuthenticated, isLoading } = useMerchantAuth();
  const queryClient = useQueryClient();

  const handleSignOut = async () => {
    try {
      // Fetch CSRF token first
      const csrfRes = await fetch("/api/csrf-token");
      const { token } = await csrfRes.json();
      await fetch("/api/auth/logout", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-csrf-token": token },
      });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/check"] });
      setLocation("/");
    } catch {
      // If logout fails, still redirect
      setLocation("/");
    }
  };

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setActiveMenu(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleMouseEnter = (menu: string) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setActiveMenu(menu);
  };

  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => {
      setActiveMenu(null);
    }, 150);
  };

  const getBadgeStyles = (badge: string) => {
    switch (badge) {
      case "FREE":
        return "bg-green-600 text-white";
      case "NEW":
        return "bg-yellow-500 text-black";
      case "PRO":
        return "bg-[#1844A6] text-white";
      default:
        return "";
    }
  };

  return (
    <>
      {/* Backdrop blur overlay */}
      {activeMenu && (
        <div
          className="fixed inset-0 top-16 bg-black/5 backdrop-blur-sm z-40 transition-all duration-300"
          onClick={() => setActiveMenu(null)}
        />
      )}
      <header
        className={`sticky top-0 z-50 bg-white transition-shadow duration-200 ${
          scrolled ? "shadow-md" : "border-b border-gray-100"
        }`}
        data-testid="header"
        ref={menuRef}
      >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center gap-4">
        {/* Left: Logo */}
        <Link href="/" className="flex items-center flex-shrink-0" data-testid="link-logo-home">
          <Logo />
        </Link>

        {/* Right-aligned: Nav + Auth actions as one continuous row */}
        <nav className="hidden lg:flex items-center gap-1 ml-auto">
          {/* Products dropdown */}
          <div
            className="relative"
            onMouseEnter={() => handleMouseEnter('products')}
            onMouseLeave={handleMouseLeave}
          >
            <Link href="/products">
              <Button
                variant="ghost"
                size="sm"
                className={`gap-1 text-[15px] font-medium rounded-[7px] ${
                  activeMenu === 'products' ? "text-[#1844A6] bg-gray-50" : "text-gray-600"
                }`}
                data-testid="button-nav-products"
              >
                Products
                <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${activeMenu === 'products' ? 'rotate-180' : ''}`} />
              </Button>
            </Link>
          </div>

          {/* Developers dropdown */}
          <div
            className="relative"
            onMouseEnter={() => handleMouseEnter('developers')}
            onMouseLeave={handleMouseLeave}
          >
            <Button
              variant="ghost"
              size="sm"
              className={`gap-1 text-[15px] font-medium rounded-[7px] ${
                activeMenu === 'developers' ? "text-[#1844A6] bg-gray-50" : "text-gray-600"
              }`}
              data-testid="button-nav-developers"
            >
              Developers
              <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${activeMenu === 'developers' ? 'rotate-180' : ''}`} />
            </Button>
          </div>

          {/* Pricing link */}
          <Link href="/pricing" data-testid="link-nav-pricing">
            <Button
              variant="ghost"
              size="sm"
              className={`text-[15px] font-medium rounded-[7px] ${
                location === '/pricing' ? "text-[#1844A6] bg-gray-50" : "text-gray-600"
              }`}
              data-testid="button-nav-pricing"
            >
              Pricing
            </Button>
          </Link>

          {/* Resources dropdown */}
          <div
            className="relative"
            onMouseEnter={() => handleMouseEnter('resources')}
            onMouseLeave={handleMouseLeave}
          >
            <Button
              variant="ghost"
              size="sm"
              className={`gap-1 text-[15px] font-medium rounded-[7px] ${
                activeMenu === 'resources' ? "text-[#1844A6] bg-gray-50" : "text-gray-600"
              }`}
              data-testid="button-nav-resources"
            >
              Resources
              <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${activeMenu === 'resources' ? 'rotate-180' : ''}`} />
            </Button>
          </div>

          {/* Dashboard link */}
          <Link href="/dashboard" data-testid="link-nav-dashboard">
            <Button
              variant="ghost"
              size="sm"
              className={`text-[15px] font-medium rounded-[7px] ${
                location.startsWith('/dashboard') ? "text-[#1844A6] bg-gray-50" : "text-gray-600"
              }`}
              data-testid="button-nav-dashboard"
            >
              Dashboard
            </Button>
          </Link>

          {/* Divider */}
          <div className="w-px h-5 bg-gray-200 mx-2" />

          {/* Auth actions — inline with nav */}
          {!isLoading && isAuthenticated ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  className="bg-[#1844A6] text-white rounded-[7px] gap-2"
                  data-testid="button-account-menu"
                >
                  <User className="h-4 w-4" />
                  Account
                  <ChevronDown className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52 rounded-[7px]">
                <DropdownMenuItem asChild className="cursor-pointer">
                  <Link href="/dashboard" className="flex items-center gap-2 w-full">
                    <LayoutDashboard className="h-4 w-4" />
                    Dashboard
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild className="cursor-pointer">
                  <Link href="/dashboard/settings" className="flex items-center gap-2 w-full">
                    <User className="h-4 w-4" />
                    My Account
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild className="cursor-pointer">
                  <Link href="/dashboard/settings?tab=business" className="flex items-center gap-2 w-full">
                    <Settings className="h-4 w-4" />
                    My Profile
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild className="cursor-pointer">
                  <Link href="/dashboard/settings?tab=billing" className="flex items-center gap-2 w-full">
                    <CreditCard className="h-4 w-4" />
                    Billing & Subscriptions
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="cursor-pointer text-red-600 focus:text-red-600"
                  onClick={handleSignOut}
                  data-testid="button-sign-out"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <>
              <Link href="/login" className="flex items-center" data-testid="link-sign-in">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-[15px] font-medium text-gray-600 rounded-[7px]"
                  data-testid="button-sign-in"
                >
                  Sign in
                </Button>
              </Link>
              <Link href="/register" className="flex items-center" data-testid="link-get-started">
                <Button
                  className="bg-[#1844A6] text-white rounded-[7px]"
                  data-testid="button-get-started"
                >
                  Get Started
                </Button>
              </Link>
            </>
          )}
        </nav>

        {/* Mobile menu button */}
        <Button
          size="icon"
          variant="ghost"
          className="lg:hidden"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label="Toggle menu"
          data-testid="button-mobile-menu"
        >
          {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
      </div>

      {/* Mega Menu Dropdowns */}
      {activeMenu && megaMenus[activeMenu] && (
        <div 
          className="absolute left-0 right-0 bg-white border-t border-gray-100 shadow-xl animate-in fade-in slide-in-from-top-2 duration-200"
          onMouseEnter={() => handleMouseEnter(activeMenu)}
          onMouseLeave={handleMouseLeave}
          data-testid={`mega-menu-${activeMenu}`}
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className={`grid gap-8 ${megaMenus[activeMenu].columns.length === 3 ? 'grid-cols-3' : 'grid-cols-2'}`}>
              {megaMenus[activeMenu].columns.map((column, colIndex) => (
                <div key={colIndex} className={colIndex > 0 ? "border-l border-gray-100 pl-8" : ""}>
                  <div className="mb-6">
                    <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">
                      {column.title}
                    </h3>
                    {column.subtitle && (
                      <p className="text-sm text-gray-500 mt-1">{column.subtitle}</p>
                    )}
                  </div>
                  <ul className="space-y-1">
                    {column.items.map((item, itemIndex) => {
                      const Icon = item.icon;
                      const isExternal = item.href.startsWith("mailto:") || item.href.startsWith("http");
                      const linkContent = (
                        <div className="flex items-start gap-3 p-3 rounded-[7px] cursor-pointer">
                          <div className="flex-shrink-0 w-10 h-10 rounded-[7px] bg-[#1844A6]/5 flex items-center justify-center">
                            <Icon className="h-5 w-5 text-[#1844A6]" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-gray-900">
                                {item.label}
                              </span>
                              {item.badge && (
                                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${getBadgeStyles(item.badge)}`}>
                                  {item.badge}
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-gray-500 truncate">
                              {item.description}
                            </p>
                          </div>
                        </div>
                      );
                      return (
                        <li key={itemIndex}>
                          {isExternal ? (
                            <a href={item.href} onClick={() => setActiveMenu(null)} data-testid={`link-mega-menu-${item.label.toLowerCase().replace(/\s+/g, '-')}`}>
                              {linkContent}
                            </a>
                          ) : (
                            <Link href={item.href} onClick={() => setActiveMenu(null)} data-testid={`link-mega-menu-${item.label.toLowerCase().replace(/\s+/g, '-')}`}>
                              {linkContent}
                            </Link>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                  {column.ctaLabel && column.ctaHref && (
                    <Link href={column.ctaHref} onClick={() => setActiveMenu(null)} data-testid={`link-mega-menu-cta-${column.title.toLowerCase().replace(/\s+/g, '-')}`}>
                      <span className="inline-flex items-center text-sm font-medium text-[#1844A6] underline mt-4">
                        {column.ctaLabel}
                        <ArrowRight className="ml-1 h-4 w-4" />
                      </span>
                    </Link>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden py-4 border-t border-gray-100 bg-white shadow-lg">
          <nav className="flex flex-col gap-1 px-4">
            <Link href="/products" onClick={() => setMobileMenuOpen(false)} data-testid="link-mobile-nav-products">
              <span className="block py-3 px-4 text-[15px] font-medium text-gray-600 rounded-[7px]">Products</span>
            </Link>
            <Link href="/developers" onClick={() => setMobileMenuOpen(false)} data-testid="link-mobile-nav-developers">
              <span className="block py-3 px-4 text-[15px] font-medium text-gray-600 rounded-[7px]">Developers</span>
            </Link>
            <Link href="/pricing" onClick={() => setMobileMenuOpen(false)} data-testid="link-mobile-nav-pricing">
              <span className="block py-3 px-4 text-[15px] font-medium text-gray-600 rounded-[7px]">Pricing</span>
            </Link>
            <div className="pt-4 mt-4 border-t border-gray-100 flex flex-col gap-3">
              {!isLoading && isAuthenticated ? (
                <>
                  <Link href="/dashboard" onClick={() => setMobileMenuOpen(false)} data-testid="link-mobile-nav-dashboard">
                    <Button className="w-full bg-[#1844A6] text-white rounded-[7px]" data-testid="button-mobile-dashboard">
                      Dashboard
                    </Button>
                  </Link>
                  <Link href="/dashboard/settings" onClick={() => setMobileMenuOpen(false)}>
                    <span className="block py-3 px-4 text-[15px] font-medium text-gray-600 rounded-[7px]">My Account</span>
                  </Link>
                  <Link href="/dashboard/settings?tab=business" onClick={() => setMobileMenuOpen(false)}>
                    <span className="block py-3 px-4 text-[15px] font-medium text-gray-600 rounded-[7px]">My Profile</span>
                  </Link>
                  <Link href="/dashboard/settings?tab=billing" onClick={() => setMobileMenuOpen(false)}>
                    <span className="block py-3 px-4 text-[15px] font-medium text-gray-600 rounded-[7px]">Billing & Subscriptions</span>
                  </Link>
                  <Button
                    variant="ghost"
                    className="w-full text-[15px] font-medium text-red-600 rounded-[7px]"
                    onClick={() => { setMobileMenuOpen(false); handleSignOut(); }}
                    data-testid="button-mobile-sign-out"
                  >
                    Sign Out
                  </Button>
                </>
              ) : (
                <>
                  <Link href="/login" onClick={() => setMobileMenuOpen(false)} data-testid="link-mobile-sign-in">
                    <span className="block py-3 px-4 text-[15px] font-medium text-gray-600">Sign in</span>
                  </Link>
                  <Link href="/register" onClick={() => setMobileMenuOpen(false)} data-testid="link-mobile-get-started">
                    <Button className="w-full bg-[#1844A6] text-white rounded-[7px]" data-testid="button-mobile-get-started">
                      Get Started
                    </Button>
                  </Link>
                </>
              )}
            </div>
          </nav>
        </div>
      )}
    </header>
    </>
  );
}
