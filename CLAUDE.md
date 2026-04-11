# CLAUDE.md — swipesblue.com
# Last updated: April 2, 2026

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
**Role:** Payment processing for the entire TRIADBLUE ecosystem
**Stack:** React + TypeScript + Tailwind + shadcn/ui + Express + Drizzle ORM + PostgreSQL + Wouter
**Deployment:** Replit (Autoscale)
**Local path:** `/Users/deanlewis/swipesblue`

---

## ARCHITECTURE

### What SwipesBlue Is
SwipesBlue is the centralized payment processor for all TRIADBLUE platforms. It uses Stripe internally as its payment rails, but customers never see Stripe — they see swipesblue.com.

### How Other Platforms Connect
Each platform calls SwipesBlue's API to process payments:
- businessblueprint.io → subscription billing for app suites
- scansblue.com → $10 reports, $15 bundles, $5 add-ons
- hostsblue.com → domain registration, hosting plans
- BUILDERBLUE2.COM → compute credits, plan billing

### Key Endpoints (built or needed)
- `POST /api/v1/checkout/sessions` — create checkout session (redirect + embedded modes) — NEEDS BUILDING
- `POST /api/v1/payments/process` — process a payment
- `POST /api/v1/webhooks` — receive payment webhooks
- Merchant API for partner onboarding

### Key Files
- `client/src/components/Footer.tsx` — footer (needs ecosystem rebuild)
- `client/src/App.tsx` — main routing
- `server/` — Express API
- `shared/` — shared types and schema

### Internal Use of Stripe
Stripe is the payment processor INSIDE SwipesBlue. This is the ONLY repo where Stripe code is acceptable. All other repos must NEVER reference Stripe.

SwipesBlue env vars: `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET`
These are internal to SwipesBlue only.

---

## COMPLETED

- Core payment processing API ✓
- Merchant dashboard ✓
- Admin dashboard ✓
- HMAC-SHA256 webhook signature verification ✓
- Footer with ecosystem column (needs tagline update) ✓

## PENDING

- `POST /api/v1/checkout/sessions` endpoint (redirect + embedded modes) — scansblue.com needs this
- Footer ecosystem section rebuild with logo images + taglines (prompt written: ECOSYSTEM_FOOTER_2_SWIPESBLUE.md)
- Copyright bar: "swipesblue, inc." → "TRIADBLUE, Inc."

---

## CURRENT STATE CHANGELOG

| Date | Changes |
|------|---------|
| 2026-01-31 | Webhook signature verification added. |
| 2026-04-02 | Ecosystem footer prompt written. Checkout sessions endpoint identified as blocker for scansblue. |
| 2026-04-11 | Checkout webhook forwarding now HMAC-SHA256 signed via `X-Swipesblue-Signature` header (uses `api_keys.apiSecret`). Added `handleCheckoutFailed` and wired `checkout.session.expired` in the Stripe webhook router. |

**AGENTS: Update this section on every commit. Your work is not done until this changelog reflects it.**
