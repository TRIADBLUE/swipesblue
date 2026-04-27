import { Link } from "wouter";

const footerSections = {
  products: {
    title: "Products",
    links: [
      { label: "E-Commerce Suite", href: "/products/ecommerce" },
      { label: "Virtual Terminal", href: "/products/terminal" },
      { label: "Online Checkout", href: "/products/checkout" },
      { label: "Payment Links", href: "/products/payment-links" },
      { label: "Invoicing", href: "/products/invoicing" },
      { label: "Subscriptions", href: "/products/billing" },
      { label: "Customer Vault", href: "/products/customers" },
      { label: "Fraud Prevention", href: "/products/fraud" },
    ],
  },
  developers: {
    title: "Developers",
    links: [
      { label: "Documentation", href: "/developers" },
      { label: "API Reference", href: "/developers" },
      { label: "API Keys", href: "/developers" },
      { label: "Webhooks", href: "/developers" },
      { label: "SDKs & Libraries", href: "/developers" },
    ],
  },
  company: {
    title: "Company",
    links: [
      { label: "About", href: "/about" },
      { label: "Pricing", href: "/pricing" },
      { label: "Contact Sales", href: "mailto:sales@swipesblue.com" },
    ],
  },
  resources: {
    title: "Resources",
    links: [
      { label: "Help Center", href: "/help" },
      { label: "Processing Fees", href: "/processing-fees" },
      { label: "Security", href: "/security" },
      { label: "Compliance", href: "/security" },
      { label: "System Status", href: "/status" },
    ],
  },
};

export default function Footer() {
  return (
    <footer className="bg-white border-t border-gray-200" data-testid="footer">
      {/* Top Section — 4-Column Link Grid with Dividers */}
      <div className="max-w-7xl mx-auto py-16 px-8">
        <div className="grid grid-cols-2 md:grid-cols-4">
          {/* Column 1: Products */}
          <div className="pr-8 border-r border-gray-200">
            <h4 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-4">
              {footerSections.products.title}
            </h4>
            <ul>
              {footerSections.products.links.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-sm text-gray-500 hover:text-[#1844A6] transition-colors block py-1"
                    data-testid={`link-footer-${link.label.toLowerCase().replace(/\s+/g, '-')}`}
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 2: Developers */}
          <div className="px-8 border-r border-gray-200">
            <h4 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-4">
              {footerSections.developers.title}
            </h4>
            <ul>
              {footerSections.developers.links.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-sm text-gray-500 hover:text-[#1844A6] transition-colors block py-1"
                    data-testid={`link-footer-${link.label.toLowerCase().replace(/\s+/g, '-')}`}
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 3: Company + Resources */}
          <div className="px-8 border-r border-gray-200">
            <h4 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-4">
              {footerSections.company.title}
            </h4>
            <ul>
              {footerSections.company.links.map((link) => (
                <li key={link.label}>
                  {link.href.startsWith("mailto:") ? (
                    <a
                      href={link.href}
                      className="text-sm text-gray-500 hover:text-[#1844A6] transition-colors block py-1"
                      data-testid={`link-footer-${link.label.toLowerCase().replace(/\s+/g, '-')}`}
                    >
                      {link.label}
                    </a>
                  ) : (
                    <Link
                      href={link.href}
                      className="text-sm text-gray-500 hover:text-[#1844A6] transition-colors block py-1"
                      data-testid={`link-footer-${link.label.toLowerCase().replace(/\s+/g, '-')}`}
                    >
                      {link.label}
                    </Link>
                  )}
                </li>
              ))}
            </ul>

            <h4 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-4 mt-6">
              {footerSections.resources.title}
            </h4>
            <ul>
              {footerSections.resources.links.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-sm text-gray-500 hover:text-[#1844A6] transition-colors block py-1"
                    data-testid={`link-footer-${link.label.toLowerCase().replace(/\s+/g, '-')}`}
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 4: TRIADBLUE Ecosystem */}
          <div className="pl-8">
            {/* TRIADBLUE.COM ECOSYSTEM — always first, always largest */}
            <div className="mb-6">
              <img src="https://cdn.triadblue.com/brands/triadblue/ecosystem-lockup.png" alt="TRIADBLUE.COM ECOSYSTEM" style={{ height: 40, objectFit: 'contain' }} />
              <p className="text-xs mt-2" style={{ color: '#6B7280' }}>Six Platforms. One Ecosystem. Go Blue.</p>
            </div>

            <div style={{ borderTop: '0.5px solid rgba(9,8,14,0.5)', marginBottom: 20 }} />

            {/* All platforms in fixed order — swipesblue is featured (this site) */}
            <div className="space-y-4">
              <div>
                <a href="https://businessblueprint.io" target="_blank" rel="noopener noreferrer">
                  <img src="https://cdn.triadblue.com/brands/businessblueprint/logo-image-and-logo-text-as-url.png" alt="businessblueprint.io" style={{ height: 22, objectFit: 'contain' }} />
                </a>
                <p className="text-xs mt-1" style={{ color: '#6B7280' }}>Get Assessed. Get Prescribed. Get Business.</p>
              </div>

              <div>
                <img src="https://cdn.triadblue.com/brands/swipesblue/logo-image-and-logo-text-as-url.png" alt="swipesblue.com" style={{ height: 32, objectFit: 'contain' }} />
                <p className="text-sm mt-2" style={{ color: '#6B7280' }}>Go Blue. Get Swiped. Get Paid.</p>
              </div>

              <div>
                <a href="https://hostsblue.com" target="_blank" rel="noopener noreferrer">
                  <img src="https://cdn.triadblue.com/brands/hostsblue/logo-image-and-logo-text-as-url.png" alt="hostsblue.com" style={{ height: 22, objectFit: 'contain' }} />
                </a>
                <p className="text-xs mt-1" style={{ color: '#6B7280' }}>Go Blue. Get Site. Go Live.</p>
              </div>

              <div>
                <a href="https://scansblue.com" target="_blank" rel="noopener noreferrer">
                  <img src="https://cdn.triadblue.com/brands/scansblue/logo-image-and-logo-text-as-url.png" alt="scansblue.com" style={{ height: 22, objectFit: 'contain' }} />
                </a>
                <p className="text-xs mt-1" style={{ color: '#6B7280' }}>Go Blue. Get Scanned. Get Scored.</p>
              </div>

              <div>
                <a href="https://builderblue2.com" target="_blank" rel="noopener noreferrer">
                  <img src="https://cdn.triadblue.com/brands/builderblue2/logo-image-and-logo-text-as-url.png" alt="BUILDERBLUE².COM" style={{ height: 22, objectFit: 'contain' }} />
                </a>
                <p className="text-xs mt-1" style={{ color: '#6B7280' }}>Go Blue. Get Vibed. Get Ahead.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Section — Copyright Bar */}
      <div className="border-t border-gray-200">
        <div className="max-w-7xl mx-auto py-6 px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <span className="text-xs text-gray-400">
            © {new Date().getFullYear()} TRIADBLUE, Inc. All rights reserved. swipesblue.com is a product of TRIADBLUE, Inc.
          </span>
          <div className="flex items-center gap-1 text-xs text-gray-400">
            <Link href="/terms" className="hover:text-gray-500 transition-colors" data-testid="link-footer-terms">
              terms of service
            </Link>
            <span>·</span>
            <Link href="/privacy" className="hover:text-gray-500 transition-colors" data-testid="link-footer-privacy">
              privacy policy
            </Link>
            <span>·</span>
            <Link href="/cookies" className="hover:text-gray-500 transition-colors" data-testid="link-footer-cookies">
              cookie settings
            </Link>
            <span>·</span>
            <Link href="/acceptable-use" className="hover:text-gray-500 transition-colors" data-testid="link-footer-acceptable-use">
              acceptable use
            </Link>
            <span>·</span>
            <Link href="/admin/login" className="hover:text-gray-500 transition-colors" data-testid="link-footer-admin-login">
              admin login
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
