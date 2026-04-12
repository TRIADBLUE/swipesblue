# CLAUDE.md — swipesblue.com
# Last updated: April 11, 2026

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
- `scansblue` added as a recognized platform across admin UI + server-side validation ✓ (commits `d7627fe`, `d9f0dac`)

## PENDING

### CRITICAL — verify before trusting signed forwarding in production
- **`SWIPESBLUE_WEBHOOK_SECRET` roundtrip check for businessblueprint.io** — the signed forwarding shipped today (`e9068d5`) will only work if businessblueprint.io's `SWIPESBLUE_WEBHOOK_SECRET` Railway env var is EXACTLY equal to the `apiSecret` column value in SwipesBlue's `api_keys` row for the BP key. Mismatched secrets fail silently: SwipesBlue forwards a valid signature, BP recomputes with a different secret, BP rejects every event. Before relying on this in production, open the BP API key in the SwipesBlue admin panel, copy its `apiSecret`, and confirm it matches BP's env var. Do the same for any other partner that uses `webhookUrl` forwarding (scansblue when it comes online, etc.).
- **16 pre-existing TypeScript errors** (NOT introduced by today's work, but blocking clean builds). They've been there since at least `e9068d5`'s parent and do not prevent `tsx`-based dev or the Replit build from running:
  - `client/src/pages/admin/AdminDashboard.tsx` — 7 errors: `{}` return type from `useQuery` means `platformBreakdown`, `merchantStats`, `totalProcessed`, `thisMonth`, `successRate`, array methods, and `.slice` are all "does not exist on type `{}`". Needs query generic types.
  - `client/src/pages/admin/AdminTransactions.tsx:95` — same pattern, `.filter on {}`.
  - `client/src/pages/admin/ApiKeys.tsx:206/213` — `.length` / `.map` on `{}`.
  - `client/src/pages/admin/Merchants.tsx:80` — `.filter on {}`.
  - `client/src/pages/admin/Webhooks.tsx:269/276` — `.length` / `.map` on `{}`.
  - `server/db.ts:17` — `PgPool` used as a type but imported as a value. Should be `typeof PgPool` or switch to the `Pool` type import from `pg`.
  - `server/replit_integrations/batch/utils.ts:99/140` — `AbortError` property missing on the imported `p-retry` function. Library typing issue; either typecast or upgrade.

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
| 2026-01-31 | HMAC-SHA256 webhook signature verification added for partner-registered webhooks (`server/services/webhook.ts`). Test webhook endpoint wired. |
| 2026-03-XX | Checkout sessions API built — `POST /api/v1/checkout/sessions` with redirect + embedded modes (commit `002a409`). Embedded page at `/pay/:id` using Stripe Elements. |
| 2026-04-02 | Ecosystem footer prompt written. Footer ecosystem column identified as needing logo images + official taglines. Checkout sessions endpoint (previously listed as blocker for scansblue) confirmed already built. |
| 2026-04-02 | Footer ecosystem column rebuilt with logo images and official taglines (commit `1c94aa3`). Fixed order, TRIADBLUE first, swipesblue featured (commit `24d6c83`). Added swipesblue URL logo (commit `8c3a48b`). |
| 2026-04-11 | **Checkout webhook forwarding now HMAC-SHA256 signed (commit `e9068d5`).** Replaced the unsigned `fetch()` in `server/services/checkout.ts` `handleCheckoutCompleted` with a signed version that looks up `api_keys.apiSecret` via `storage.getApiKey(session.apiKeyId)`, computes `createHmac("sha256", secret).update(body).digest("hex")`, and sends it as `X-Swipesblue-Signature`. Added `X-Webhook-Event`, `X-Webhook-Timestamp`, `User-Agent: SwipesBlue-Webhook/1.0`, a 10s AbortController timeout, and non-2xx response logging. Added `crypto` import at the top of `checkout.ts`. Added new exported `handleCheckoutFailed(gatewaySessionId)` that marks the session `"failed"` and forwards a signed `payment.failed` event using the same pattern. Wired `case "checkout.session.expired"` into the switch in `server/routes.ts` `/api/v1/webhooks/stripe` handler, importing `handleCheckoutFailed` alongside `handleCheckoutCompleted`. Rationale: businessblueprint.io (and any future partner consuming `webhookUrl`) expects HMAC verification via `X-Swipesblue-Signature`; without it, partners correctly reject every forwarded event as unverified. |

**AGENTS: Update this section on every commit. Your work is not done until this changelog reflects it.**

---

## HANDOFF NOTES FOR THE NEXT AGENT (2026-04-11)

**Current branch state:** `main` is **1 commit ahead of origin at session start**, now pushed. Single commit this session:
1. `e9068d5` — `fix: sign checkout webhook forwarding with HMAC-SHA256 via X-Swipesblue-Signature header`

`.replit` and `public/` are in the working tree as pre-existing uncommitted changes that were there before this session started — **do not touch them** unless you know what they are. Dean has not authorized a commit on either. Ask before staging.

**What landed today in plain English:**
- Before: `handleCheckoutCompleted` forwarded `payment.completed` events to the partner's `webhookUrl` with a plain unsigned `fetch()`. businessblueprint.io (which uses HMAC verification) rejected every event as unauthenticated, so BP silently stopped acting on SwipesBlue payments.
- After: The forwarding now computes an HMAC-SHA256 over the raw JSON body using the partner's `apiSecret` (from the `api_keys` row matched by `session.apiKeyId`), and sends it as `X-Swipesblue-Signature`. Plus matching `X-Webhook-Event` / `X-Webhook-Timestamp` / `User-Agent` headers, a 10s timeout, and error logging. Same pattern added for failed/expired sessions via the new `handleCheckoutFailed` function and a new `case "checkout.session.expired"` in the Stripe webhook switch.
- This is a drop-in compatibility fix with the existing `server/services/webhook.ts` signing algorithm — same `sha256` + hex digest. The two code paths (partner-registered webhooks and checkout forwarding) now sign identically.

**Before trusting this in production:**
1. **Verify the secret roundtrip for businessblueprint.io.** Open SwipesBlue admin → API Keys → find the row for BP's key → view `apiSecret`. Then on Railway, check BP's `SWIPESBLUE_WEBHOOK_SECRET` env var. They must match byte-for-byte. If BP ever rotated the secret on its side without telling SwipesBlue, today's fix will still silently fail.
2. **Run an end-to-end test.** Create a $1 checkout session via the BP → SwipesBlue flow, complete it with a Stripe test card, confirm BP receives the `payment.completed` event AND marks the user as paid. Do the same with `checkout.session.expired` by creating a session and letting it time out (or firing it manually via the Stripe CLI).
3. **Do not stage `.replit` or `public/`.** They're pre-existing uncommitted changes from before this session. Scope everything you commit to the files you actually edited.

**Things that look odd but are intentional:**
- `server/services/checkout.ts` and `server/services/webhook.ts` both contain inline HMAC signing — they are NOT shared through a helper. The prompt for today's work explicitly said "checkout uses its own signing inline" — do not refactor this into a shared util without instruction. Dean wants them independent so the two paths can be reasoned about separately.
- 16 TypeScript errors are present on `main` and have been for at least a week. They do not block dev (`tsx`) or the Replit build. Do NOT "fix them while you're in there" without scope — most are admin dashboard query-typing issues that need their own focused session. `db.ts:17` (`PgPool` value-as-type) and the two `p-retry` `AbortError` errors in `replit_integrations/batch/utils.ts` are the lowest-hanging if Dean asks for a cleanup pass.
- This repo is the **only** place `Stripe` may be referenced. If you see `Stripe` outside this repo, it's a universal-rules violation — flag it, don't normalize it.
- Replit still has the `javascript_openrouter_ai_integrations:2.0.0` integration installed (`.replit:43`). It injects `AI_INTEGRATIONS_OPENROUTER_*` env vars used by `server/replit_integrations/chat/routes.ts`. If you don't see the chat feature being used anywhere meaningful, it's probably cruft from an earlier exploration — confirm with Dean before ripping out.

**Key file map for the work that just landed:**
- Checkout signing → `server/services/checkout.ts` (lines ~150-204 for `handleCheckoutCompleted`, ~207-262 for new `handleCheckoutFailed`, `import crypto from "crypto"` at line 10)
- Stripe webhook dispatch → `server/routes.ts` (search for `/api/v1/webhooks/stripe`, the switch is around line 4949-4958 with the new `checkout.session.expired` case)
- API key lookup for signing → `server/storage.ts` `getApiKey(id)` (line 854) — returns the row with `apiSecret`
- Partner-side verification pattern (for reference) → businessblueprint.io `server/routes/convert.ts` uses `SWIPESBLUE_WEBHOOK_SECRET` to recompute and compare

**Universal-rules reminders for swipesblue specifically:**
- TRIADBLUE.COM is always ALL CAPS. swipesblue.com is always lowercase. Do not mix cases anywhere in UI copy or docs.
- No "Coming Soon" language anywhere.
- No placeholder content ("Lorem ipsum", stock filler copy, etc.).
- Footer copyright currently reads "swipesblue, inc." — per brand rules it should be "TRIADBLUE, Inc." This is listed in PENDING above.
- Audience is Gen X / SMB owners who built real businesses without technology. Copy speaks like a trusted advisor, plain language, no jargon. Don't write "seamless", "robust", "powerful", etc.
