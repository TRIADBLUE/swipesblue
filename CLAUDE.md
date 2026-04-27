# CLAUDE.md — swipesblue.com
# Last updated: April 23, 2026

---

## READ THE UNIVERSAL RULES FIRST

Before doing ANY work, fetch and read the TRIADBLUE universal brand rules:
```
curl -s "https://linkblue-githubproxy.up.railway.app/api/github/file?repo=.github&path=CLAUDE.md"
```
Those rules govern colors, fonts, naming, payments, and ecosystem standards. They are non-negotiable.

---

## PLATFORM IDENTITY

**Name:** swipesblue.com
**Tagline:** Get paid. Stay paid. Go Blue.
**Role:** Centralized payment processor for the entire TRIADBLUE ecosystem. Every other TRIADBLUE platform (businessblueprint.io, scansblue.com, hostsblue.com, BUILDERBLUE2.COM) calls SwipesBlue's API for payments. SwipesBlue is the ONLY repo allowed to reference the underlying gateway (Stripe) — every other platform must only see the SwipesBlue brand.
**Stack:** React + TypeScript + Tailwind + shadcn/ui + Express + Drizzle ORM + PostgreSQL + Wouter
**Deployment:** Replit (Autoscale) — single environment, `main` branch
**Database:** Neon PostgreSQL (via Replit's connection string)
**Local path:** `/Users/deanlewis/swipesblue`
**Production URL:** `https://swipesblue.com`

---

## ARCHITECTURE

### What SwipesBlue Is
SwipesBlue is the centralized payment processor for all TRIADBLUE platforms. It uses Stripe internally as its payment rails, but customers and partner platforms never see Stripe — they see swipesblue.com. This is non-negotiable per the universal brand rules.

### How Other Platforms Connect
Each platform calls SwipesBlue's API to process payments, subscriptions, and refunds:
- **businessblueprint.io** — subscription billing for app suites (Compass, Anchor, standalone apps, Coach Blue)
- **scansblue.com** — $10 reports, $15 bundles, $5 add-ons (one-time checkout sessions)
- **hostsblue.com** — domain registration, hosting plans, email plans
- **BUILDERBLUE2.COM** — compute credits, plan billing

Partners authenticate via an `X-API-Key` header (created in the admin panel and stored in `api_keys`). Each API key has a matching `apiSecret` used for HMAC-SHA256 signing of outbound webhook payloads — the partner stores the same secret on their end and verifies the `X-Swipesblue-Signature` header on every inbound event.

### Partner API Surface (under `/api/v1`)
- **Merchants** — `POST /merchants/create`, `GET /merchants`, `GET /merchants/platform/:platform`, `GET /merchants/:id`, `PATCH /merchants/:id/status`, `GET /merchants/:id/nmi-status`
- **Payments** — `POST /payments/process`, `/authorize`, `/capture`, `/void`, `/refund`; `GET /payments/:transactionId`, `/payments/merchant/:merchantId`, `/payments/platform/:platform`
- **Vault** — `POST /payments/vault/add`, `/payments/vault/charge`, `/vault/customers`, `/vault/customers/:customerId/charge`; `GET /vault/merchants/:merchantId/customers`, `/vault/customers/:customerId/payment-methods`; `DELETE /vault/payment-methods/:id`
- **Checkout Sessions** — `POST /checkout/sessions` (redirect + embedded modes), `GET /checkout/sessions/:id`
- **Partner Webhooks** — `POST /webhooks/register`, `GET /webhooks`, `DELETE /webhooks/:id`, `POST /webhooks/:id/test`
- **API Keys (admin-only)** — `POST /api-keys/create`, `GET /api-keys`, `DELETE /api-keys/:id`
- **Gateway Webhook (internal)** — `POST /webhooks/stripe` — receives events from Stripe and dispatches to `handleCheckoutCompleted` / `handleCheckoutFailed`

### Checkout Session Flow (the canonical inbound flow)
1. Partner calls `POST /api/v1/checkout/sessions` with amount, currency, description, customer email, success URL, cancel URL, optional `webhookUrl`, and `mode` (`"redirect"` or `"embedded"`).
2. SwipesBlue creates a Stripe checkout session internally and stores a mirror row in the local `checkout_sessions` table, tagged with the caller's `platform` and `apiKeyId`.
3. Redirect mode returns the Stripe-hosted URL. Embedded mode returns `https://swipesblue.com/pay/:id` — a SwipesBlue-hosted page that uses Stripe Elements so the brand stays SwipesBlue.
4. Customer pays. Stripe fires `checkout.session.completed` (or `checkout.session.expired`) to `POST /api/v1/webhooks/stripe`.
5. `handleCheckoutCompleted` marks the row paid, extracts card brand + last 4, then — if the caller registered a `webhookUrl` — forwards a signed `payment.completed` event to the partner. Same pattern for `payment.failed` via `handleCheckoutFailed`.

### Outbound Webhook Signing (partner-facing)
Every outbound payload forwarded to a partner's `webhookUrl` carries these headers:

| Header | Value | Notes |
|---|---|---|
| `X-Swipesblue-Signature` | hex-encoded HMAC-SHA256 of the raw JSON body | Signed with the partner's `apiSecret` from `api_keys` |
| `X-Webhook-Event` | `payment.completed` or `payment.failed` | |
| `X-Webhook-Timestamp` | ISO 8601 | |
| `User-Agent` | `SwipesBlue-Webhook/1.0` | |

**Verification on the partner side:** compute `HMAC-SHA256(raw_body, SWIPESBLUE_WEBHOOK_SECRET)` and compare to `X-Swipesblue-Signature`. Partners store that secret in an env var named `SWIPESBLUE_WEBHOOK_SECRET` — **it must equal the `apiSecret` value in SwipesBlue's `api_keys` row for that partner's key.** If they don't match, every forwarded event fails verification silently on the partner side and the partner just stops reacting to payments. When onboarding a new partner, always verify the secret roundtrip before going live.

### Internal Use of Stripe
Stripe is the payment processor INSIDE SwipesBlue. **This is the ONLY repo in the entire TRIADBLUE ecosystem where Stripe code is acceptable.** If you ever find yourself writing `Stripe` in any other repo, stop — that's a universal-rules violation.

SwipesBlue env vars (Replit):
- `STRIPE_SECRET_KEY`
- `STRIPE_PUBLISHABLE_KEY`
- `STRIPE_WEBHOOK_SECRET`

These are internal to SwipesBlue only. They never appear in any other repo, never in any other doc, never in any customer-facing code path.

### Key Files
- `server/routes.ts` — main Express router (~4970 lines). Contains every `/api/*` endpoint. The Stripe webhook dispatcher lives near the end (search for `/api/v1/webhooks/stripe`).
- `server/services/checkout.ts` — `createCheckoutSession`, `handleCheckoutCompleted`, `handleCheckoutFailed`, `constructWebhookEvent`, `getCheckoutSessionForPayment`. Signs all outbound forwards with HMAC-SHA256.
- `server/services/webhook.ts` — separate webhook service for `POST /api/v1/webhooks/:id/test` and the partner-registered webhook fanout path. Uses the same signing algorithm.
- `server/services/merchant-payment.ts` — merchant-level payment processing.
- `server/services/customer-vault.ts` — card-on-file / recurring billing.
- `server/services/nmi-partner.ts` — legacy / alternate gateway adapter (reserved; core flow uses Stripe).
- `server/storage.ts` — Drizzle DAL. All DB access routes through here. `getApiKey(id)` returns the row with `apiSecret` — needed for HMAC signing in checkout forwarding.
- `server/middleware/` — `requireApiKey`, `requirePermission`, `requireAdmin`, CSRF, rate limiters.
- `server/payment-gateways/` — gateway abstraction layer (for admin UI "payment gateway" rows).
- `shared/schema.ts` — Drizzle schema. Key tables: `apiKeys`, `checkoutSessions`, `transactions`, `merchants`, `customerVault`, `webhooks`.
- `client/src/App.tsx` — main router (Wouter). Landing, pricing, register, login, dashboards (merchant + admin), embedded pay page.
- `client/src/pages/Pay.tsx` — embedded checkout page served at `/pay/:id`.
- `client/src/pages/admin/` — admin panel (merchants, API keys, webhooks, transactions, dashboard).
- `client/src/pages/dashboard/` — merchant dashboard.
- `client/src/components/Footer.tsx` — site footer (ecosystem column).
- `.replit` — Replit config. Controls deployment and installed integrations.

### Deployment & Git Workflow
- **Single branch: `main`.** Replit autodeploys from `main`. There is no staging branch on this project (unlike businessblueprint.io which has a `staging` → `main` workflow).
- Replit remote lives at `github.com/TRIADBLUE/swipesblue.git`. The local clone still points at the old `github.com/53947/swipesblue.git` URL — GitHub auto-redirects on push, but the remote URL should be updated to the new location.
- DB migrations: `npm run db:push` (Drizzle). Neon DB is owned by Replit's connected integration; there is one database, not a staging/prod split.

### Payment Rules (universal — but especially enforced here)
- All payment processing goes through SwipesBlue. Stripe references are allowed **only inside this repo**.
- Every other TRIADBLUE platform must reference the SwipesBlue API, never the underlying gateway.
- Card data never transits SwipesBlue's own servers raw — it goes straight from the browser to Stripe Elements, then Stripe returns a token. The embedded payment page at `/pay/:id` follows this pattern.
- Never leak processor details (Stripe, NMI, etc.) into API responses or error messages. Partner platforms should only ever see SwipesBlue-branded errors.

---

## COMPLETED SYSTEMS

- Core payment processing API (`/payments/process`, `authorize`, `capture`, `void`, `refund`) ✓
- Merchant onboarding API + admin panel merchant management ✓
- Customer vault (card-on-file + recurring charge) ✓
- Checkout sessions API — `POST /api/v1/checkout/sessions` with redirect + embedded modes ✓ (commit `002a409`)
- Embedded payment page at `/pay/:id` using Stripe Elements, SwipesBlue-branded ✓
- Merchant dashboard (transactions, orders, settings) ✓
- Admin dashboard (merchants, API keys, transactions, webhooks, platform breakdown) ✓
- API key management with permissions (`process_payments`, `process_refunds`, etc.) ✓
- HMAC-SHA256 webhook signature verification — partner-registered webhooks (`webhook.ts`) ✓
- **HMAC-SHA256 signed checkout webhook forwarding — `X-Swipesblue-Signature` on all `payment.completed` / `payment.failed` forwards ✓ (commit `e9068d5`, 2026-04-11)**
- **`handleCheckoutFailed` + `checkout.session.expired` event handling wired into the Stripe webhook dispatcher ✓ (commit `e9068d5`, 2026-04-11)**
- CSRF protection on all mutating public endpoints (`doubleCsrfProtection`) ✓
- Rate limiting on auth, payments, and API-management endpoints ✓
- Footer ecosystem column with logo images + taglines ✓ (commits `1c94aa3`, `24d6c83`, `8c3a48b`)
- Landing page, pricing, register, login, legal pages ✓
- Homepage eXperience repositioning ✓ (2026-04-20)
- `scansblue` added as a recognized platform across admin UI + server-side validation ✓ (commits `d7627fe`, `d9f0dac`)
- **`client/index.html` migrated to cdn.triadblue.com for favicons, apple-touch-icon, og:image, twitter:image** ✓ (2026-04-23). Static HTML now references `logo-image-32px.png` / `logo-image-180px.png` / `og-image.png` / `twitter-image.png` on the CDN. All 15 brand image variants uploaded to `/var/www/cdn/brands/swipesblue/` (sized logos 16/32/48/180/192/512px + icon/avatar, header-logo[-dark], login-logo, logo-full-mark, favicon, twitter-image mirror of og-image).
- **Static HTML meta copy aligned with 2026-04-20 eXperience hero** ✓ (2026-04-23). `<title>`, `og:title`, `twitter:title` all read `swipesblue.com — built with eXperience. Because we are.`; all three descriptions read `A payment gateway for SMBs.`; full-URL brand rule applied (swipesblue.com, never bare "swipesblue"); stale "Built on NMI's PCI Level 1 certified infrastructure" reference removed from `<meta name="description">`.
- **OGA embed endpoint switched from `console.blue` → `triadblue.systems`** ✓ (2026-04-23, line 27 of index.html).
- **All 16 pre-existing TypeScript errors eliminated** ✓ (2026-04-23). `useQuery<T>` generics added across `AdminDashboard.tsx` (3 queries + 3 new inline interfaces), `AdminTransactions.tsx`, `ApiKeys.tsx`, `Merchants.tsx`, `Webhooks.tsx`. `server/db.ts` uses `InstanceType<typeof PgPool>` to express the type. `server/replit_integrations/batch/utils.ts` imports `AbortError` as a named export from `p-retry` and uses it directly instead of `pRetry.AbortError`.

## PENDING

### CRITICAL — verify before trusting signed forwarding in production
- **`SWIPESBLUE_WEBHOOK_SECRET` roundtrip check for businessblueprint.io** — the signed forwarding shipped today (`e9068d5`) will only work if businessblueprint.io's `SWIPESBLUE_WEBHOOK_SECRET` Railway env var is EXACTLY equal to the `apiSecret` column value in SwipesBlue's `api_keys` row for the BP key. Mismatched secrets fail silently: SwipesBlue forwards a valid signature, BP recomputes with a different secret, BP rejects every event. Before relying on this in production, open the BP API key in the SwipesBlue admin panel, copy its `apiSecret`, and confirm it matches BP's env var. Do the same for any other partner that uses `webhookUrl` forwarding (scansblue when it comes online, etc.).
- ~~**16 pre-existing TypeScript errors**~~ — all 16 eliminated 2026-04-23 (see COMPLETED).

### Other pending
- **`POST /api/v1/checkout/sessions` endpoint** — built and shipping (`002a409`). Previously listed as "NEEDS BUILDING" in older CLAUDE.md versions; that was stale. Scansblue can consume it now.
- **Footer copyright bar** — currently reads "swipesblue, inc." — should read "TRIADBLUE, Inc." per universal brand rules (TRIADBLUE is the parent company and is always all caps). Fix in `client/src/components/Footer.tsx`.
- **Remote URL still old** — local git remote points at `github.com/53947/swipesblue.git`; GitHub redirects to `github.com/TRIADBLUE/swipesblue.git` on every push. Fix with `git remote set-url origin https://github.com/TRIADBLUE/swipesblue.git`. Cosmetic but worth doing.
- **Replit `openrouter` integration** — `AI_INTEGRATIONS_OPENROUTER_BASE_URL` + `AI_INTEGRATIONS_OPENROUTER_API_KEY` are auto-provisioned by Replit's `javascript_openrouter_ai_integrations:2.0.0` integration listed in `.replit:43`. Used by `server/replit_integrations/chat/routes.ts`. If the chat feature isn't being used on swipesblue.com, the integration can be removed via Replit's Integrations panel to drop the secret.
- **Merchant API for partner onboarding** — documented in the old "Key Endpoints" section as a line item. `POST /api/v1/merchants/create` exists; the question is whether a full self-serve partner-onboarding flow (company info → KYC → API key issuance → webhook registration) is wanted. Not currently built end-to-end as a single UX.

---

## CURRENT STATE CHANGELOG

| Date | Changes |
|------|---------|
| 2026-04-27 | **`Logo.tsx` and `Footer.tsx` switched to canonical CDN-hosted lockups — spoke-site brand assets now resolved at runtime from `cdn.triadblue.com` instead of bundled at build time.** (a) `client/src/components/Logo.tsx` fully rewritten — was 85 lines of icon-image + styled-text spans (rendered "swipes" in `#374151` and "blue" in `#0000FF` over a Vite-bundled `@assets/swipesblue_logo_1769971645259.png` icon), now 17 lines that render the single canonical lockup image at `https://cdn.triadblue.com/brands/swipesblue/logo-image-and-logo-text-as-url.png` (icon + URL wordmark already merged in the asset). The rewritten component exposes only an optional `className` prop — legacy `variant` / `showIcon` / `showUrl` props removed because the lockup image makes them meaningless. (b) `client/src/components/Footer.tsx` ecosystem column — six `<img src>` values swapped from local-bundled `/images/logos/...` paths to CDN URLs at the canonical nomenclature: line 144 → `cdn.triadblue.com/brands/triadblue/ecosystem-lockup.png` (header), line 154 → `businessblueprint/logo-image-and-logo-text-as-url.png`, line 160 → `swipesblue/logo-image-and-logo-text-as-url.png`, line 166 → `hostsblue/logo-image-and-logo-text-as-url.png`, line 173 → `scansblue/logo-image-and-logo-text-as-url.png`, line 180 → `builderblue2/logo-image-and-logo-text-as-url.png`. Image-related attributes only — alt text, height, className, anchor wrappers, and surrounding tagline `<p>` blocks untouched. (c) Five callers updated to drop the removed props: `Header.tsx:245`, `Login.tsx:59`, `Pay.tsx:54`, `Register.tsx:62` (each `<Logo showIcon variant="default" />` → `<Logo />`), and `examples/Logo.tsx:7` (`<Logo variant="small" />` → `<Logo />`). `SubscriptionCheckout.tsx:151`, `SubscriptionSuccess.tsx:49`, and `examples/Logo.tsx:6` already used `<Logo />` with no props — no edit needed. Note: `client/src/pages/admin/AdminLogin.tsx:43` also calls `<Logo />` with no props — already compatible with the rewritten component, no edit needed, but acknowledged here for caller-inventory completeness. (d) Resolves the architectural debt called out in the 2026-04-23 row for the swipesblue repo specifically: spoke-site components no longer bundle brand assets from `attached_assets/` or `client/public/images/` at build time — they fetch the canonical CDN URL at runtime, so future logo updates propagate without redeploying. Same shape of fix is still pending in businessblueprint.io. (e) The rewritten `Logo` does NOT honor variant sizes (small/large) — if any future caller needs explicit sizing, pass an explicit `className="h-[28px]"` (or similar). Default render is `h-[39px] w-auto`. (f) `npx tsc --noEmit` passes with exit code 0 — no Logo-related TypeScript errors introduced. |
| 2026-04-23 | **`client/index.html` fully migrated to OGA + CDN + new eXperience positioning, and all 16 pre-existing TypeScript errors eliminated.** (1) Favicon, apple-touch-icon, og:image, twitter:image on lines 6/7/13/18 now point at `https://cdn.triadblue.com/brands/swipesblue/{logo-image-32px,logo-image-180px,og-image,twitter-image}.png`. (2) OGA embed endpoint switched from `console.blue` → `triadblue.systems` (line 27). (3) `<title>`, `og:title`, `twitter:title` (lines 8/11/16) updated to `swipesblue.com — built with eXperience. Because we are.` — aligns static HTML with the 2026-04-20 hero repositioning, applies the "complete URL, never just the name" brand rule, and removes the stale `swipesblue —` bare-name form. (4) `description`, `og:description`, `twitter:description` (lines 9/12/17) all set to `A payment gateway for SMBs.` — strips the stale "Built on NMI's PCI Level 1 certified infrastructure" reference and the legacy "Simple payment processing for small businesses and developers" copy. (5) 15 brand image variants generated from `/Users/Shared/global assets/logo images and texts/swipesblue-com/swipesblue logo image.png` (3072×3072 source) via `sips` and uploaded to `/var/www/cdn/brands/swipesblue/` on the Kamatera CDN server: sized logos at 16/32/48/180/192/512px + icon (256) + avatar (200), header-logo / header-logo-dark / login-logo / logo-full-mark (copies of `swipesblue_logo_image_and_text_as_url.png`, 2076×240), static-fallback `favicon.png` (= 32px variant), `twitter-image.png` (mechanical mirror of `og-image.png` bytes), plus a drift-check re-upload of `logo-image.png`. (6) **All 16 TS errors eliminated** — `useQuery<T>()` generics on all 5 admin pages (AdminDashboard uses 3 new inline interfaces for `DashboardMetrics` / `RecentTransaction` / `VolumePoint`; others reuse their existing local interfaces `Transaction` / `ApiKey` / `Merchant` / `WebhookEndpoint`); `server/db.ts:17` switched `PgPool` type reference to `InstanceType<typeof PgPool>` (no new imports); `server/replit_integrations/batch/utils.ts:4,99,140` imports `AbortError` as a named export from `p-retry` and uses it directly instead of `pRetry.AbortError`. (7) Rule saved to memory: all TRIADBLUE brand names must appear as the complete URL form (`swipesblue.com`, `hostsblue.com`, `TRIADBLUE.COM`, etc.) in every customer-facing text slot — `<title>`, og/twitter titles, og:site_name, site-name OGA slot, hero subcopy, footer copyright; never the bare short name. |
| 2026-01-31 | HMAC-SHA256 webhook signature verification added for partner-registered webhooks (`server/services/webhook.ts`). Test webhook endpoint wired. |
| 2026-03-XX | Checkout sessions API built — `POST /api/v1/checkout/sessions` with redirect + embedded modes (commit `002a409`). Embedded page at `/pay/:id` using Stripe Elements. |
| 2026-04-02 | Ecosystem footer prompt written. Footer ecosystem column identified as needing logo images + official taglines. Checkout sessions endpoint (previously listed as blocker for scansblue) confirmed already built. |
| 2026-04-02 | Footer ecosystem column rebuilt with logo images and official taglines (commit `1c94aa3`). Fixed order, TRIADBLUE first, swipesblue featured (commit `24d6c83`). Added swipesblue URL logo (commit `8c3a48b`). |
| 2026-04-11 | **Checkout webhook forwarding now HMAC-SHA256 signed (commit `e9068d5`).** Replaced the unsigned `fetch()` in `server/services/checkout.ts` `handleCheckoutCompleted` with a signed version that looks up `api_keys.apiSecret` via `storage.getApiKey(session.apiKeyId)`, computes `createHmac("sha256", secret).update(body).digest("hex")`, and sends it as `X-Swipesblue-Signature`. Added `X-Webhook-Event`, `X-Webhook-Timestamp`, `User-Agent: SwipesBlue-Webhook/1.0`, a 10s AbortController timeout, and non-2xx response logging. Added `crypto` import at the top of `checkout.ts`. Added new exported `handleCheckoutFailed(gatewaySessionId)` that marks the session `"failed"` and forwards a signed `payment.failed` event using the same pattern. Wired `case "checkout.session.expired"` into the switch in `server/routes.ts` `/api/v1/webhooks/stripe` handler, importing `handleCheckoutFailed` alongside `handleCheckoutCompleted`. Rationale: businessblueprint.io (and any future partner consuming `webhookUrl`) expects HMAC verification via `X-Swipesblue-Signature`; without it, partners correctly reject every forwarded event as unverified. |
| 2026-04-20 | Homepage repositioned to eXperience tagline. Removed all Stripe-comparison price claims ("2.70% beats Stripe", "SAVE UP TO $0.48", "Lower fees than Square"), removed all NMI references ("Built on NMI" trust badge, NMI stats footnote, "5.8B+ transactions powered annually" stat sourced from NMI), replaced the competitor price table with a three-column differentiator grid ("We answer the phone / We read the fine print / We keep our word"), updated Path 3 gateway card from price-led to people-led, and set the hero to "Built with eXperience. Because we are." with the X rendered in #8000FF for TRIADBLUE ecosystem continuity with /convert. Only file changed: client/src/pages/Home.tsx. |

**AGENTS: Update this section on every commit. Your work is not done until this changelog reflects it.**

---

## HANDOFF NOTES FOR THE NEXT AGENT (2026-04-20)

**Current branch state:** `main` is up to date with origin. Two commits this session (oldest → newest):
1. `e9068d5` (2026-04-11) — `fix: sign checkout webhook forwarding with HMAC-SHA256 via X-Swipesblue-Signature header`
2. `a66ec93` (2026-04-12) — `docs: rebuild CLAUDE.md with full architecture, API surface, handoff notes, and changelog`
3. (pending commit) — homepage eXperience repositioning

`.replit` and `public/` are in the working tree as pre-existing uncommitted changes — **do not touch them** unless you know what they are. Dean has not authorized a commit on either. Ask before staging.

**What landed today (2026-04-20) in plain English:**
- The homepage (`client/src/pages/Home.tsx`) was repositioned from a price-led pitch ("2.70% beats Stripe") to a trust-led pitch ("Built with eXperience. Because we are."). This was necessary because SwipesBlue is temporarily running on Stripe rails, making price comparisons against Stripe indefensible, and all NMI references were stale since NMI infrastructure is not currently in use.
- **Removed:** hero headline/subhead with pricing, "Built on NMI" trust badge, entire competitor fee comparison table (`competitors` const + `<table>` block), NMI stats footnote at page bottom, all "2.70%", "5.8B+", "SAVE UP TO $0.48", "Lower fees than Square" copy, and the "keep more revenue" Path 3 subtitle.
- **Added:** new hero "Built with eXperience. Because we are." with the X in `#8000FF` (visual continuity with /convert across TRIADBLUE ecosystem). New subhead targeting Gen X/SMB trust. "Human Underwriting" trust badge. Three-column differentiator grid ("We answer the phone / We read the fine print / We keep our word"). Path 3 gateway card rewritten from price-led to people-led. Path 2 and Path 3 rate labels both changed to "TRANSPARENT, TRANSACTION-BASED PRICING". Stats bar updated from NMI-sourced numbers to PCI/Human/Uptime/$0.
- **Casing rule:** The word is **eXperience** (lowercase e, capital X, lowercase perience). In JSX it renders as `e<span style={{ color: '#8000FF' }}>X</span>perience` — three text nodes, not a single string. The capital X carries the pun; the `#8000FF` color is the amplifier, not the carrier.

**Still pending from prior sessions:**
1. **`SWIPESBLUE_WEBHOOK_SECRET` roundtrip check for businessblueprint.io** — same as before (see PENDING > CRITICAL section). Still unverified.
2. **Footer copyright bar** — still reads "swipesblue, inc." — should be "TRIADBLUE, Inc."
3. **16 pre-existing TypeScript errors** — unchanged, not blocking Replit builds.

**Things that look odd but are intentional:**
- `server/services/checkout.ts` and `server/services/webhook.ts` both contain inline HMAC signing — NOT shared through a helper. Dean wants them independent.
- 16 TypeScript errors are present on `main` and have been for weeks. Do not fix without explicit scope.
- `Check` and `ArrowRight` are imported from `lucide-react` in Home.tsx but not used in the JSX. They were already unused before this session's changes — left alone per "do not touch anything outside scope."
- The `#8000FF` color appears ONLY on the hero X in Home.tsx. It must NOT spread to other elements on this page or elsewhere. It's the /convert accent color borrowed for ecosystem continuity.
- Local `npm run build` fails due to a broken `node_modules/.bin/vite` CJS shim — this is a pre-existing local toolchain issue, not caused by any code change. The project builds correctly on Replit.

**Key file map for today's work:**
- Homepage copy + differentiator grid → `client/src/pages/Home.tsx`

**Universal-rules reminders for swipesblue specifically:**
- TRIADBLUE.COM is always ALL CAPS. swipesblue.com is always lowercase. Do not mix cases anywhere in UI copy or docs.
- No "Coming Soon" language anywhere.
- No placeholder content ("Lorem ipsum", stock filler copy, etc.).
- Footer copyright currently reads "swipesblue, inc." — per brand rules it should be "TRIADBLUE, Inc." This is listed in PENDING above.
- Audience is Gen X / SMB owners who built real businesses without technology. Copy speaks like a trusted advisor, plain language, no jargon. Don't write "seamless", "robust", "powerful", etc.
- The word **eXperience** has exactly one correct spelling. Lowercase e, capital X, lowercase perience. No exceptions anywhere — code, comments, commit messages, CLAUDE.md, conversation.
