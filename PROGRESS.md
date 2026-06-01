# Progress

## Phase 1 — Foundation

- [x] Project scaffold (Next.js 15 App Router + TS + Tailwind)
- [x] Prisma schema (firms, users, contacts, properties, property_photos, otp_codes, sessions, activity_log)
- [x] Phone OTP auth (dev stub: logs OTP to console; prod: swap MSG91 in `lib/sms.ts`)
- [x] Session cookies + `requireUser()` / `requireRole()` helpers
- [x] Firm-scoped query helpers (RLS-equivalent at app layer)
- [x] Contacts: list + create + detail
- [x] Properties: list + create + detail (photo URLs; upload in Phase 1.5)
- [x] Activity log written on mutations
- [x] Mobile-responsive shell (sidebar → bottom nav < 768px)
- [x] Seed script (1 firm, 2 users, 5 contacts, 3 properties)
- [x] Vitest test for properties API

## Pending in Phase 1 follow-up
- [ ] Photo upload to S3/R2/Supabase Storage (currently URL input)
- [ ] MSG91 OTP integration (currently console.log in dev)
- [ ] Edit + delete for properties/contacts (Phase 1 covers create + read)
- [ ] Bulk CSV import

## Phase 2 — Lead pipeline

- [x] `Lead` and `SiteVisit` models, `LeadStage` enum (9 stages from `new` → `registered` + `lost`)
- [x] Lead CRUD APIs (`GET /api/leads`, `POST /api/leads`, `GET/PATCH /api/leads/[id]`)
- [x] Site-visit scheduling API (`POST /api/site-visits`) — auto-advances lead to `site_visit_scheduled`
- [x] Kanban board UI at `/leads` (horizontal columns desktop, stacked sections mobile, per-card "→ next stage" + "Lost" buttons)
- [x] New-lead form with existing-contact OR inline-create-contact modes
- [x] Lead detail page with activity log, site-visit list, requirements, follow-up editor
- [x] Follow-up reminders (overdue count surfaced on board header + per-card ⏰ icon)
- [x] Round-robin assignment in inbound webhook (picks user with fewest open leads)
- [x] Inbound lead webhook at `/api/leads/inbound/[firm.webhookToken]` — JSON or form payloads, source normalization, auto-creates contact
- [x] Settings page exposes webhook URL with copy button + curl example
- [x] Activity log records every stage transition and inbound webhook hit

## Pending in Phase 2 follow-up
- [ ] Drag-and-drop on the kanban (currently button-driven; functional but less satisfying)
- [ ] WhatsApp / email notifications when a lead is assigned or follow-up is due (in-app surfacing only for now)
- [ ] Site-visit feedback UI (the API takes feedback; no form yet)
- [ ] Webhook token rotation UI

## Phase 3 — Public property pages + share + Request Visit

- [x] `Property.publicSlug` (unique) + `publicEnabled` flag; auto-generated on create via `slugify(title) + shortId()`
- [x] Public mobile property page at `/p/[slug]` — hero photo, price, quick facts, amenities, broker contact (tel: link), Request Visit form
- [x] OG metadata for WhatsApp/Twitter link previews
- [x] `POST /api/p/[slug]/request-visit` — public endpoint, in-memory rate limit, creates contact + lead, sets 1h auto-followup, assigns to property's listing broker
- [x] WhatsApp share card builder (`lib/share.ts`) — broker-friendly multi-line text with price, location, highlights, contact, link
- [x] `ShareCard` component on logged-in property detail — copy text / copy URL / "Send via WhatsApp" deep link to `wa.me`
- [x] Lead detail activity log already shows `public_request_visit` events
- [x] Tests for slug generation and share-text builder

## Pending in Phase 3 follow-up
- [ ] Persistent rate-limit (Redis) instead of in-memory map
- [ ] Public-page analytics (views, request-visit conversion) — likely Phase 8
- [ ] Auto-generated OG image (currently uses first photo URL)

## Phase 4 — Deal tracker + commission splits + GST invoices

- [x] Schema: `Deal`, `CommissionSplit`, `Invoice`, `InvoiceCounter`; added `Firm.state` / `Firm.invoicePrefix` for GST + invoice numbering
- [x] Deal CRUD APIs (`/api/deals`, `/api/deals/[id]`) with auto brokerage calc (sale = %, rent = months)
- [x] Commission split APIs (`/api/deals/[id]/splits`, `/api/splits/[id]`) — in-firm or external recipient, %-of-total OR fixed amount, TDS@5% (Sec 194H) configurable
- [x] Stage advancement side effects: `agreementDate` set on entering Agreement; `registrationDate` set + all pending splits flip to `payable` on Registration; cancel holds unpaid splits
- [x] Invoice API (`/api/invoices`) with atomic per-firm-per-FY sequence (`SR/2627/0001`)
- [x] GST split logic: same-state firm + client → CGST + SGST; cross-state → IGST; missing state defaults to IGST
- [x] Deals list at `/deals` grouped by stage, total-pipeline-brokerage summary
- [x] New deal form (`/deals/new?leadId=...` pre-fills from a lead) with sale/rent toggle
- [x] Deal detail at `/deals/[id]`: stage actions, agreement/registration date editors, split builder with live %-coverage indicator, mark-paid flow, invoice list
- [x] Printable invoice page at `/invoices/[id]` with HSN/SAC 9972, amount-in-words, INR rupees+paise, browser-print → PDF (no puppeteer needed)
- [x] Commission reports at `/reports/commissions` — aging buckets (0-30/31-60/61-90/90+), by-broker (earned/paid/payable/TDS), TDS register (paid + TDS deducted)
- [x] "Convert to deal" CTA on lead detail when stage ≥ token
- [x] Nav updated: Properties / Leads / Deals / Contacts / Reports / Settings
- [x] 19 new tests covering brokerage math, TDS, FY calc, GST CGST/SGST/IGST splits, rounding

## Pending in Phase 4 follow-up
- [ ] Edit existing split (current UI only allows mark-paid + delete)
- [ ] Email/WhatsApp delivery of the invoice PDF (currently browser-print)
- [ ] Multi-line-item invoices (currently single brokerage line)
- [ ] Reverse-charge GST scenarios
- [ ] Form 26AS-friendly yearly statement export for sub-brokers (the data is there in the TDS register, just needs CSV export)

## Phase 5 — Portal syndication via XML/CSV feeds

- [x] Schema: `ListingTarget` (per-property-per-portal status + refresh state), `PortalConfig` (per-firm enablement), `PortalId` + `ListingTargetStatus` enums
- [x] `PortalAdapter` interface in [lib/portals/adapter.ts](lib/portals/adapter.ts) matching spec §7.2
- [x] XML feed adapters: 99acres, MagicBricks, Housing.com
- [x] Generic CSV adapter (for Google Sheets / custom integrations / BI tools)
- [x] Each adapter has its own `validate()` — 99acres blocks rent without furnishing, etc.
- [x] Public feed endpoint at `/feeds/[token]/[portal].(xml|csv)` — 5-min cache, gated by firm's webhookToken
- [x] Per-property syndication panel: enable/disable per portal, see last/next refresh, manual refresh
- [x] Settings page shows all feed URLs with copy buttons
- [x] Refresh scheduler in [lib/portals/refresh.ts](lib/portals/refresh.ts) — 5-day default cadence, ±18h jitter to avoid bot-like patterns
- [x] Refresh trigger: `POST /api/admin/refresh-due` (auth via `ADMIN_CRON_SECRET` header) — wire to Vercel Cron / cron-job.org / system cron
- [x] Standalone CLI worker: `npm run worker:refresh` (runs the same logic, exits)
- [x] Activity log records target enable/disable/manual_refresh
- [x] 18 new tests across all 4 adapters + xml helpers + jitter math

## Pending in Phase 5 follow-up
- [ ] Webhook token rotation UI (currently `cuid()` default; manual swap in DB)
- [ ] Per-portal `PortalConfig` UI (broker_id assignment provided by partnership team)
- [ ] OLX adapter (low-priority; not all firms use it)
- [ ] Refresh count cap → prompt for new photos/price after N refreshes (spec §7.3)

## Phase 6 — Portal API adapters (per-partnership)

- [x] `PortalAdapter` interface extended with `post() / refresh() / delete() / fetchLeads()` (per spec §7.2)
- [x] AES-256-GCM credential storage in [lib/crypto.ts](lib/crypto.ts) — derived from `SESSION_SECRET` via scrypt
- [x] `PortalCredential` model — encrypted api_key + api_secret, plus broker_code + base_url
- [x] `PortalJob` queue model — kind ∈ {post, refresh, delete, fetch_leads}, with retry/backoff state
- [x] [lib/portals/api-base.ts](lib/portals/api-base.ts) — `apiFetch()` with timeout + safe JSON parsing
- [x] [lib/portals/magicbricks-api.ts](lib/portals/magicbricks-api.ts) — worked-example API adapter implementing post/refresh/delete/fetchLeads
- [x] [lib/portals/sync.ts](lib/portals/sync.ts) — processes job queue, auto-enqueues refreshes for due API targets, schedules daily lead-fetches per (firm, portal)
- [x] Inbound leads from portals are de-duped by `sourceListingId = "{portal}:{externalLeadId}"` and round-robin assigned
- [x] CLI runner: `npm run worker:portal-sync` — exits when queue drained
- [x] HTTP cron endpoint: `POST /api/admin/portal-sync` (same `x-admin-secret` gate as Phase 5)
- [x] Credentials management API at `/api/firms/portal-credentials` — owner/principal only, returns `hasApiKey` boolean (never the plaintext)
- [x] Settings UI: `PortalCredentialsPanel` with per-portal Add/Edit/Remove + lastUsed timestamp + adapter-implemented hint

## Pending in Phase 6 follow-up
- [ ] 99acres + Housing.com API adapters (waiting on actual partnership documentation)
- [ ] Manual "Push to portal now" button on property detail (currently auto-enqueued by sync)
- [ ] Detailed per-job log view (data in `PortalJob`, no UI yet)
- [ ] Key rotation flow when `SESSION_SECRET` changes

## Phase 7 — WhatsApp Business API

- [x] `Contact.whatsappOptIn` + `whatsappOptInAt`; first inbound is implicit opt-in
- [x] `WaTemplate` model — mirrors Meta-approved templates locally for UI/preview
- [x] `WaMessage` model — outbound + inbound, status (queued/sent/delivered/read/failed/received), Meta message-id unique constraint
- [x] [lib/whatsapp.ts](lib/whatsapp.ts) — Meta Graph API client (`sendTemplateMessage`), HMAC-SHA256 webhook signature verification, subscription challenge verification, template variable substitution
- [x] `POST /api/whatsapp/send` — hard gate: MARKETING templates blocked for non-opted-in contacts, logs queued→sent/failed state transitions
- [x] `GET/POST /api/whatsapp/templates` — CRUD with Meta-name regex validation
- [x] `GET/POST /api/whatsapp/webhook` — subscription verification on GET, signed-payload + idempotent inbound storage + delivery-receipt updates on POST
- [x] `/whatsapp` admin page — template manager + recent-messages timeline + env config warning if creds missing
- [x] `WaSendModal` on Lead detail — picks template, renders variables, send button blocked when opt-in missing for MARKETING
- [x] Activity log records every outbound send + inbound message
- [x] Seed creates 3 Meta-style templates: `new_listing_alert`, `site_visit_confirm`, `price_drop`
- [x] 12 new tests covering AES round-trip, ciphertext tampering, signature verification, challenge verify, template rendering, backoff math

## Pending in Phase 7 follow-up
- [ ] Multi-firm WA number routing (currently webhook routes to the first firm)
- [ ] Free-form replies within the 24h customer service window (currently template-only outbound)
- [ ] Bulk broadcast UI (one-to-many template send across opted-in contacts)
- [ ] Media templates (images/PDFs as header components)
- [ ] Two-way conversation thread view per contact

## Phase 8 — Polish (analytics, exports, notifications, i18n)

- [x] **Analytics dashboard** at `/analytics` (principal/owner/accounts only)
  - Lead funnel (8 stages, bar visualisation)
  - Stats: total leads, deals closed, brokerage closed, lead→deal conversion %
  - By source (with per-source conversion rate)
  - By locality (leads + active listings, top 20)
  - By broker (leads / registered / conv % / deals closed / earned)
  - Range filter: 7d / 30d / 90d / 1yr / all-time
- [x] **CSV exports** at `/api/exports/{leads,deals,commissions,properties}` — RFC 4180 compliant ([lib/csv.ts](lib/csv.ts)), download buttons on every list page + Reports; commissions export accepts `?view=tds` for the TDS register
- [x] **In-app notifications**
  - `Notification` model + `NotificationKind` enum (9 kinds)
  - [lib/notifications.ts](lib/notifications.ts) — `notify()` + `notifyOnce()` (dedupe by unread title)
  - `GET/PATCH /api/notifications` (mark single or mark-all-read)
  - Header `NotificationsBell` with unread badge, 60s poll, deep-link navigation
  - Wired into existing flows: lead assigned, all split recipients on `registration`, payment confirmation
- [x] **i18n scaffold**
  - [lib/i18n/](lib/i18n/) — typed dict, English source-of-truth, Hindi translations of nav + login + common verbs as proof
  - `User.preferredLanguage` (default `en`) + `LanguageSwitcher` in Settings + `PATCH /api/preferences`
  - Server-side dictionary lookup in `app/(app)/layout.tsx` passes labels into the app shell; nav swaps live
- [x] 16 new tests — CSV writer (quoting/escaping/Date), analytics aggregations (funnel, source, by-broker sort), i18n dict resolution

## Pending in Phase 8 follow-up
- [ ] Extend i18n into form labels, table headers, button text (current scope = nav + login only — full UI translation is many days of copy work)
- [ ] Additional locales (Marathi, Tamil, Telugu, Kannada) — pattern is established, just need translation
- [ ] CSV/Excel **imports** for migration off Excel (per spec §9) — separate from exports, deferred
- [ ] WhatsApp/email delivery for notifications (currently in-app only)
- [ ] Saved analytics views / custom date-range picker beyond preset buckets

## Not built (deliberate, per spec)
- **Native mobile app** — spec §11.8 explicitly conditional ("if web feels insufficient"). The web app is mobile-responsive (bottom-nav, 360px tested) and that's enough until design-partner feedback says otherwise.

## Phase 9 — Nebula Dark redesign + 30-min onboarding

A UX overhaul focused on getting a non-technical broker productive in 30 min from first login, plus a wholesale visual rebuild on the Nebula Dark design system.

### Design system foundation
- [x] **Nebula Dark tokens** in [tailwind.config.ts](tailwind.config.ts): `app`, `surface{,2,3}`, `ink{,muted,faint}`, `accent`, `accent-glow`, `positive/negative/warn`, `border-subtle/strong`, custom shadows + glow gradients
- [x] **Plus Jakarta Sans** loaded with tabular figures (`font-feature-settings: tnum`) so numeric columns align
- [x] Dark-first [app/globals.css](app/globals.css): muted-gradient desktop background, floating app panel, dark inputs/selects/textareas as the default, slim dark scrollbars, print-mode reset that restores light styles for invoice PDFs
- [x] Reusable UI primitives in [components/ui/](components/ui/):
  - `Card`, `CardHeader` — rounded-card with top hairline highlight
  - `Button` — primary / secondary / ghost / danger / success, three sizes
  - `Pill`, `ChangePill`, `StatusDot` — semantic tones (neutral/blue/amber/green/red/purple/cyan)
  - `Input`, `Select`, `Textarea`, `Field` — dark inputs with custom select chevron, label + required marker + hint slot
  - `EmptyState` — illustrated empty list with primary + secondary CTAs
  - `HelpTooltip` + `HELP` glossary for RERA / TDS / GST / HSN / carpet vs builtup / webhook

### 30-minute onboarding rails
- [x] **First-run wizard** at `/onboarding` (3 steps: welcome → firm details → sample-data choice). Auto-redirects new signups; bounce back to `/home` if already onboarded
- [x] `Firm.onboardedAt` column gates the wizard; `Property.isDemo` / `Contact.isDemo` / `Lead.isDemo` / `Deal.isDemo` flags tag sample rows
- [x] **Sample data seeder** [lib/sample-data.ts](lib/sample-data.ts): one click creates 5 contacts, 3 properties (2 active + 1 draft), 3 leads across stages (one deliberately overdue), 1 token-stage deal with 2 commission splits (TDS pre-calculated)
- [x] **Clear demo data** button in Settings — DELETE `/api/onboarding`, removes all `isDemo=true` rows in a single transaction
- [x] [POST /api/onboarding](app/api/onboarding/route.ts) finishes setup: writes firm details + sets `onboardedAt` + optionally seeds demo
- [x] OTP verify route returns `isNewUser` flag so login redirects to `/onboarding` for first-time users

### New home dashboard
- [x] [/home](app/(app)/home/page.tsx) replaces the old root redirect. Greeting + 4-stat row (overdue / today's follow-ups / weekly leads / 7d closes) + Getting Started checklist (auto-hides when complete) + today's follow-ups + hot pipeline + recent deals
- [x] [lib/checklist.ts](lib/checklist.ts) derives all 6 checklist items from real DB facts — no drift, completing the action in the app auto-ticks the box
- [x] [GettingStarted](components/getting-started.tsx) component with progress bar and per-item "why this matters" hover text

### Next-action guidance
- [x] [lib/next-action.ts](lib/next-action.ts) maps every lead and deal stage to a one-tap recommendation: "Call now" / "Schedule visit" / "Send offer" / "Convert to deal" / "Set agreement date" / "Pay commissions"
- [x] Badges rendered on every kanban card, home-page hot-pipeline row, and deals list row

### Toast + undo
- [x] [ToastProvider](components/ui/toast.tsx) mounted in the AppShell — bottom-right stack, success/danger/warn tones, optional `undo` callback with live countdown
- [x] Lead stage transitions on the kanban now show "Moved to {stage} — Undo 5s"; marking lost shows "Marked lost — Undo"
- [x] Reverts the previous stage via the same API; activity log records both the change and the undo

### Visual conversions
- [x] **App shell** [components/app-shell.tsx](components/app-shell.tsx) rebuilt as floating dark panel with top bar (logo + avatar initials + notifications bell + logout) and slimmer sidebar with active-pill rows. Mobile gets a slide-out menu (8 items) + a 4-item bottom nav (Home / Leads / Deals / Properties)
- [x] **Login** [app/(auth)/login/page.tsx](app/(auth)/login/page.tsx) — brand-glyph header, dark Card, large OTP input with letter-spacing, redirect to `/onboarding` for new users
- [x] **Properties list**, **Leads board**, **Deals list**, **Contacts list**, **Settings**, **Notifications bell** — all converted to Nebula Dark with Card primitives, Pills, EmptyStates, and consistent tone language
- [x] **Lead stage colors** in [lib/leads.ts](lib/leads.ts) and **Deal stage colors** in [lib/deals.ts](lib/deals.ts) aligned to the semantic palette (gray=waiting · blue=active · amber=action needed · green=done · red=lost)

### Pending in Phase 9 follow-up
- [ ] Convert remaining detail/form pages: properties/new, properties/[id], leads/new, leads/[id], deals/new, deals/[id], invoices/[id], analytics, reports, whatsapp templates (current focus: list pages + shell — detail pages still render but with mixed slate utilities)
- [ ] **Tier 2 progressive disclosure** on the property form (currently 25 fields in one shot)
- [ ] **Tier 4 mobile polish**: bottom-sheet forms, swipe gestures on lead cards, voice-to-text on requirement notes
- [ ] **Tier 5 soft delete** (`deletedAt` on every model) for full reversibility beyond the toast window
- [ ] **Tier 6 command palette** (Cmd+K) with universal search
- [ ] **Tier 7 full i18n** sweep — every label / button / table header, plus Marathi/Tamil/Telugu/Kannada
- [ ] **Tier 8 video tutorials** + WhatsApp daily digest cron
