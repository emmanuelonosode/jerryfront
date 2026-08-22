# Build Tasks: Skelton Realty Group - Rental Leasing Platform

Generated from: `.design/skelton-rental-platform/DESIGN_BRIEF.md`
Also reads: `INFORMATION_ARCHITECTURE.md`, `DESIGN_TOKENS.css`
Date: 2026-08-15

**Codebase state:** empty. No components, no routes, no config. Every task below creates.
**Stack:** Next.js (App Router) + Postgres.
**Sequencing:** public site first, resident portal second - per phase 1 decision.

---

## How to read this

- **`[CONTENT]`** - cannot be completed without an answer from the Open Items list. Build the structure, mark the copy `[TO CONFIRM]`, do not invent thresholds, fees, licence numbers, or testimonials.
- **`[RISK]`** - deliberately early. If it fails, it invalidates work built on top of it.
- **`[LAUNCH]`** - blocks go-live. Everything unmarked can follow the first deploy.
- Dependencies are named. Anything without a `Depends on` can start immediately.

---

## Foundation

- [x] **F1 · App shell and home hero** `[LAUNCH]` `[RISK]` - **done 2026-08-16**
  Next.js 16.3.1 + TypeScript, App Router, no Tailwind (CSS custom properties, per the tokens artifact). Fonts self-hosted via `next/font`. Verified: build clean, eslint clean, `tsc --noEmit` clean, no horizontal overflow at 375/768/1280 in both themes.
  Also added `scripts/screenshot.mjs` - CDP-driven responsive capture with real device emulation and an automatic horizontal-overflow check. Needed because `chrome --headless --screenshot` clamps its window to ~500px and silently returns a crop, which reads as a phantom overflow bug. Phase 7 design review will use it.

  Scaffold Next.js, wire `DESIGN_TOKENS.css`, load the display and body faces via `next/font`, and build the home hero: the promise statement plus the search input as the hero's primary element, not decoration beneath a slogan. **This task established the visual system** - originally Civic Plainspoken, **retokenised to the Ticketmaster-inspired system on 2026-08-17** (blue on black and white, pill controls, Figtree). The swap touched `app/tokens.css`, `app/layout.tsx`, the header chrome, and the dev placeholder tint; the 49 CSS modules needed no changes, because they consume semantic token names rather than raw colour. That is the payoff of the semantic layer, and it is the reason a whole-palette replacement was a day's work rather than a rebuild. Done when the hero renders correctly in light and dark at 375px and 1280px and the aesthetic reads as intended. _Creates everything. Validate the direction here before building 28 more routes on it._

- [x] **F2 · Header, primary nav, footer** `[LAUNCH]` `[CONTENT]` - **done 2026-08-16**
  Shared nav model in `lib/navigation.ts` feeds header, drawer, and footer so a route cannot appear in one and go missing from another. Verified with a 21-check behavioural suite (disclosure ARIA, Escape, outside-dismiss, drawer focus trap, scroll lock, focus restoration). Company facts render as loud `[TO CONFIRM]` markers - still blocked on address, phone, email, per-state licence numbers, and the official HUD EHO logo asset.

  Primary nav with the five items and the `Do I Qualify?` dropdown carrying the three differentiator pages. Utility: Resident Login, Saved. Mobile drawer with a persistent `Apply` button that never collapses into it. Footer carries full nav, Equal Housing Opportunity mark, **per-state** licence numbers, physical address, contact. Done when both render on every route and the footer survives being someone's first page. _Depends on: F1. Footer needs licence data._

- [x] **F3 · Core primitives** `[LAUNCH]` - **done 2026-08-16**
  Button (4 variants), Field (label/hint/error/required wiring), TextInput, Textarea, Select, Checkbox, Radio, ChoiceGroup, Rule, Skeleton, Toast + provider, Modal. Matrix at `/dev/primitives` (noindex - S1 must keep it out of the sitemap). Overlay behaviour extracted to `hooks/useDialogBehavior.ts` and shared with the nav drawer. Verified by a 24-check suite: real Tab traversal, visible focus on every control, ARIA wiring, modal focus return, live-region timing, dark-mode footer contrast. Nav's 21 checks still pass after the refactor.

  Button (primary ink, secondary outline), input, select, checkbox, radio, link, rule, skeleton, toast, modal, drawer. Every one ships default, hover, focus, active, disabled, loading, and error. Focus uses the two-layer ring from the tokens - never a browser default. Modals and drawers trap focus, handle Escape, lock scroll, and restore focus to the trigger. Done when a states matrix page renders all of them and keyboard-only navigation reaches every control. _Creates the vocabulary every later task consumes._

- [x] **F4 · Layout primitives** - **done 2026-08-16**
  `Container` (page/wide/content/prose), `Prose` (68ch), `Grid` + `Col` (12-column, responsive spans via custom properties), `Section` (vertical rhythm + dividing rule). Harness at `/dev/layout-grid` (noindex). Header, footer, and hero retrofitted onto `Container`, removing three hand-rolled max-width/gutter blocks. Verified: no horizontal overflow on any route at 375/768/1280; nav (21) and primitives (24) suites still green.

  Page container, 12-column responsive grid, prose container at 68ch, section rhythm, breakpoint behaviour at 640/768/1024/1280. Done when a test page holds content correctly at every breakpoint with no horizontal scroll. _Depends on: F1._

---

## Risk spikes - deliberately before the work that depends on them

- [x] **F5 · Total monthly cost model and price display** `[LAUNCH]` `[RISK]` `[CONTENT]` - **done 2026-08-16** (model; real figures still blocked)
  `lib/money.ts` (integer cents), `lib/pricing.ts` (fee model + `computeBreakdown` + `filterablePriceCents`), `PriceCardDisplay` / `PriceBreakdownDisplay` / `PriceInline`. **12 unit tests** via `node --test lib/pricing.test.ts`, including the invariant that itemised lines sum exactly to the headline. Harness at `/dev/pricing` (noindex) proves one home renders the identical total on all three surfaces. Fee data in `lib/fixtures/pricing.ts` is placeholder and flagged - real schedule still blocked (T2).

  The data model for rent plus every recurring required fee, and the component that renders it. Total is the resting state; expanding itemises base rent and each fee. Tabular figures via IBM Plex Mono. **This decision propagates to every surface showing a price** - cards, detail, search, application, hubs - so getting the shape wrong means reworking all of them. Done when one listing's total is correct and identical everywhere it appears. _Needs the real fee schedule._

- [x] **F6 · Accessible map spike** `[RISK]` - **done 2026-08-16 · RISK CLEARED**
  `lib/geo.ts` (Mercator projection + screen-space grid clustering), `components/map/AccessibleMap.tsx`, spike at `/dev/map` (noindex) with 48 fixture homes. **19/19 checks pass, including 48/48 homes reachable by keyboard.** Model: roving tabindex (one Tab stop, not 48), arrow keys in reading order, Enter expands a cluster **in place** so clustered homes are reachable without zooming, Escape exits, live region narrates zoom and expansion. Vendor-neutral by design - markers are DOM overlays, so I7 can pick any tile renderer underneath.
  Two real bugs found and fixed: focus was dropped to `<body>` on every cluster expansion (unmounted trigger - fixed with a layout effect that moves focus to the group's first home), and unrounded sub-pixel marker positions caused a hydration mismatch.

  Narrow spike, not the finished feature: clustered pins, bidirectional hover-and-focus linkage with a list, and **a genuine keyboard path to every pin** - not a token one. This is the hardest accessibility surface in the build and the brief makes it non-negotiable. Done when a keyboard-only user can reach, identify, and activate every pin including inside clusters, verified with a screen reader. _If this cannot be solved, the split-view search needs rethinking before it is built, not after._

- [x] **F7 · Prospect token identity** `[RISK]` - **done 2026-08-16** (Postgres adapter pending)
  `lib/auth/` - opaque 256-bit tokens stored hashed, magic link (single-use, 30 min) exchanged for a rotating httpOnly session (30-day absolute / 7-day idle), purpose scoping, per-contact issuance rate limit, and replay detection that revokes the whole session family. **17 unit tests.** `/magic/[token]` redeems, sets the cookie, and 303s to a clean URL so the token never reaches history, `Referer`, or access logs. Security headers wired in `next.config.ts`; `no-referrer` + `noindex` + `no-store` verified on all credential routes. Store is an interface with an in-memory implementation - swap in Postgres in one file.
  **IA amendment:** `/apply/status/[token]` becomes `/magic/[token]` → `/apply/status`. A token parked in the address bar leaks through history, referrer headers, and CDN logs.

  Passwordless magic-link identity by email or SMS. Backs saved homes, alerts, application save/resume, and status. Tokens are single-purpose, expiring, revocable, and rotated on use. All token routes are `noindex` with `Referrer-Policy: no-referrer` so tokens never leak via referer. Done when a link issues, resolves, expires, and rotates correctly, and a leaked-then-used token cannot be replayed. _Security-sensitive: it fronts applications containing SSNs._

---

## Trust spine - ships without any inventory

These are the acquisition engine and they have zero dependency on listings existing. **This is the first genuinely shippable slice of the site.**

- [x] **T1 · `/qualifications`** `[LAUNCH]` `[CONTENT]` - **done 2026-08-16** (structure; thresholds blocked)
  Two published tiers, income documentation, what-happens-if-you-fall-short, 6-question FAQ with FAQPage structured data. All ten thresholds render as unmissable `[TO CONFIRM]` markers - invented screening criteria would be the one failure worse than an unfinished page.
  The highest-value page on the site - designed as a primary landing page, not a legal appendix. Tier 1 standard criteria with exact thresholds. Tier 2 individual review with its own **written rules**: eviction recency, income multiple, deposit uplift, co-signer terms, ITIN, voucher income treatment. Then what happens if you fall short. FAQ accordion feeding FAQPage structured data. Done when someone can self-assess their odds in fifteen seconds. _Depends on: F2, F3. Cannot be written without real thresholds - do not invent them._

- [x] **T2 · `/fees`** `[LAUNCH]` `[CONTENT]` - **done 2026-08-16** (structure; amounts blocked)
  Grouped by one-time / monthly / conditional, plus a "what we do not charge" section. Downloadable schedule at `/fees/schedule.txt`, generated from the same source. **The schedule reuses the `Fee` model from F5**, so `/fees`, the download, and every listing breakdown cannot diverge. Versioned with an effective date.
  Every charge itemised: application, administrative, deposit range, pet, recurring monthly, late, lease-break. Downloadable summary. Versioned with an effective date, prior versions retained - a fee change is a legal event, not a content edit. Done when no fee anywhere in the funnel appears that is absent from this page. _Depends on: F5._

- [x] **T3 · `/how-it-works`** `[LAUNCH]` - **done 2026-08-16**
  Four steps with realistic timings, plus a section on what the 24-hour promise actually means. Weekend/holiday clock behaviour flagged as pending.
  Four steps - browse, apply, decision in 24 hours, move in - each with realistic timing. Done when the timeline matches what operations can actually honour. _Depends on: F3._

- [x] **T4 · Differentiator page template + all three** `[LAUNCH]` `[CONTENT]` - **done 2026-08-16**
  One template, three routes, driven by `lib/content/differentiators.ts`. Fixed order: name the difficulty, then rule-level handling, documents, timeline, real objections. Shared Qualify sub-nav across all four qualification pages.
  Shared template across `/housing-vouchers`, `/second-chance-leasing`, `/self-employed-renters`: acknowledge the difficulty without condescension, explain the handling at rule level, list required documentation, show process and timeline, answer real objections, route directly to apply, cross-link the other two. Plus the shared Qualify sub-nav. **Tone is the deliverable here as much as layout** - the interface gives these pages little warmth of its own, so the copy carries all of it. Done when someone declined elsewhere reads it and does not feel condescended to. _Depends on: T1._

- [x] **T5 · `/team` and staff card** `[LAUNCH]` `[CONTENT]` - **done 2026-08-16** (deliberately empty)
  Card grid built; roster empty by design. This is the page whose job is being verifiable - invented colleagues here would do more damage than an unfinished page.
  Real photographs, names, roles, markets, direct contact. Institutional competitors structurally cannot replicate this page, and it does more anti-scam work than any badge. Under this aesthetic it also carries most of the site's human warmth. Done when every card has a real face and a real contact route. _Needs the roster. Do not ship placeholder people._

- [x] **T6 · `/contact`** `[LAUNCH]` `[CONTENT]` - **done 2026-08-16**
  Phone, email, address, per-state licensing, plus an anti-fraud notice (we never ask for payment by phone or a deposit before a signed lease). Form destination and spam handling pending - a form that silently drops messages is worse than none.
  Real address, real phone, real people, per-state licence display. Form plus direct routes - a form alone reads as a void to this audience.

- [x] **T7 · Legal set** `[LAUNCH]` `[CONTENT]` - **done 2026-08-16** (two substantive, two structural)
  `/accessibility` and `/fair-housing` are written out - they state policy and build standards, which are ours to state. `/privacy` and `/terms` ship structure plus an accurate inventory of what the product collects, but no drafted legal text: both are binding commitments over SSNs and identity documents and need counsel.
  `/privacy`, `/terms`, `/accessibility`, `/fair-housing`. The accessibility statement is a real commitment, not boilerplate. All copy needs legal review before launch. _Depends on: F4 prose container._

- [x] **T8 · Approval reassurance strip** `[LAUNCH]` - **done 2026-08-16**
  Live on the home page directly below the hero, above any listing. Each point links to the page that backs it, because an unclickable claim is what this brand positions against.
  "Voucher holders welcome · Past eviction? We review individually · Decision in 24 hours." Appears on home, search, city hubs, and guides, in a compact variant below search results. Principle 1 in one component: it precedes inventory everywhere. _Depends on: F3._

---

## Inventory

- [x] **I1 · Listing data model and availability lifecycle** `[LAUNCH]` - **done 2026-08-16**
  `lib/listings/types.ts` + `lifecycle.ts`. Five-state lifecycle with enforced transitions (an application must precede a lease), publish validation, a 45-day grace window so leased homes render with alternatives instead of 404ing, and the `lastVerifiedAt` staleness flag agreed as the manual-entry mitigation. **24 unit tests.**
  Schema for homes, photos, amenities, fees, and status. Lifecycle: Available Now → Coming Soon (dated) → Application Pending → Leased → Off Market. Leased homes stay reachable for a defined window with status and alternatives, never a 404. Includes the **`lastVerified` timestamp and staleness flag** - the agreed mitigation for manual entry against a 500+ portfolio. Done when every transition is enforceable and staleness is queryable. _Depends on: F5._

- [x] **I2 · Admin listing entry and bulk import** `[LAUNCH]` `[RISK]` - **done 2026-08-16 · BOTTLENECK LARGELY CLEARED**
  `lib/listings/csv.ts` (RFC 4180 parser, per-row/per-column errors, template) + `/admin/listings` with a paste-first importer and the staleness queue. **16 unit tests.** Measured: **the full 500-home portfolio parses in 5.6ms from a single paste**; a batch with 6 bad rows out of 100 still imports the other 94 and reports errors at spreadsheet row numbers. The bottleneck is now gathering the data and photos, not entering it. Commit-to-database is honestly disabled pending the Postgres adapter.
  Manual entry per the phase 1 decision, built properly: CSV bulk import to solve the cold start, multi-photo upload with drag-ordering, batch status changes, and a staleness view surfacing listings that have not been verified. **This is the operational bottleneck for the whole launch** - 500 homes and roughly 12,500 photos have to get in through this surface. If it is slow to use, the site has no content. Done when a realistic batch of 25 listings can be entered end to end in a measured sitting. _Depends on: I1._

- [x] **I3 · Image ingest pipeline** `[LAUNCH]` - **partial 2026-08-16** (rules + interface done; storage adapter blocked)
  `lib/images/pipeline.ts` - rendition widths, AVIF/WebP (no JPEG), room ordering, minimum source width, `srcset`/`sizes` builders matching the real grid, and a per-image-set **rights record** with expiry validation. **10 unit tests**, including one asserting output never comes from a partner CDN.
  **Blocked:** the `ImageStore` adapter needs object storage and a transcoder. Writing a fake one would look finished and silently drop images. Also open, and documented in `PropertyCard`: plain `<img>` + `srcset` from this pipeline, or `next/image` with a custom loader pointing at it - either is fine, double-processing is not.
  Self-hosted per the brief - never hotlinked from a partner CDN. Ingest, transcode to AVIF/WebP, generate responsive sizes, serve from infrastructure Skelton controls, enforce exterior-first ordering and minimum resolution. Rights are granted in writing, so record the grant against each image set. Done when a listing gallery ships modern formats at correct dimensions with lazy loading below the fold. _Depends on: I1. Directly gates the LCP budget._

- [x] **I4 · Property card and availability badge** `[LAUNCH]` - **done 2026-08-16**
  Badge in five states, each icon + text label + colour (survives a greyscale screenshot). Card in three densities, whole-card stretched link with the address as its accessible name, explicit image dimensions against the CLS budget.
  Card in three densities (grid, list, compact/map-linked). Badge in five states, each with **icon + text label + colour** - never colour alone, which matters more in a near-monochrome palette because there is no surrounding chroma to disambiguate against. Save and tour quick actions. Done when all five states render correctly in both themes and survive a greyscale screenshot test. _Depends on: F5, I1._

- [x] **I5 · `/homes-for-rent` search** `[LAUNCH]` - **done 2026-08-16**
  `lib/listings/search.ts` with **19 unit tests** covering URL round-trip, alphabetical param ordering, and the rule that price filters compare against total monthly cost rather than base rent. Desktop sidebar, mobile drawer sharing `useDialogBehavior`. Verified live: unfiltered is indexed, every filtered state is `noindex, follow` and canonicalises to the hub.
  Bug found in review: a URL price not in the preset list silently fell back to "No maximum", so the filter vanished from the form while still applied. Fixed by injecting the current value into the option list.
  Filterable list: location, price, beds, baths, home type, availability date, pets, voucher-accepted, accessibility features. URL-persisted state, alphabetically ordered params, canonical always to the unfiltered hub. Skeleton cards, never a spinner. Filter state survives back-button and refresh. Done when a shared filtered link reproduces exactly and degrades gracefully on a throttled connection. _Depends on: I4, F3._

- [x] **I6 · Search empty state** `[LAUNCH]` - **done 2026-08-16**
  Nearest alternatives, alert signup, apply-anyway. The relaxation suggestion is **derived from real inventory** rather than a fixed percentage bump - a guessed +15% could still land below the cheapest matching home and offer a suggestion that returns nothing.
  Nearest available alternatives, alert signup, and apply-anyway so staff can match inventory manually. **An empty search is a lead, not a dead end** - this task earns revenue and should not be treated as an edge case. _Depends on: I5._

- [x] **I7 · Map integrated into search** - **done 2026-08-16**
  F6's spike promoted into `/homes-for-rent`. Desktop shows list and map together with bidirectional linkage on **hover and focus** - focus matters, or a keyboard user gets pins with no correspondence to results. Mobile is a toggle defaulting to list, not a split: two half-height panes give you no usable pane, and the list is the primary interface. **10/10 behavioural checks.**
  Promote the F6 spike into the real split view, with the mobile list/map toggle. Desktop split, mobile toggle defaulting to list. _Depends on: F6, I5._

- [x] **I8 · `/homes-for-rent/[address-slug]` property detail** `[LAUNCH]` - **done 2026-08-16**
  All eleven sections in brief order, with total cost at 3 and the qualification snapshot at 4. Keyboard-navigable gallery with a full-screen viewer on `useDialogBehavior` plus arrow keys; lead photo eager/high-priority as the LCP element. `noindex, follow`. Verified: leased homes inside the grace window render the notice with alternatives and no apply button (HTTP 200), unknown slugs 404.
  All eleven sections in brief order - critically, the **total cost breakdown at position 3 and the qualification snapshot at position 4**, both high, because the snapshot is the single biggest reducer of application abandonment. Gallery exterior-first with keyboard navigation and full-screen viewer. School data links out to authoritative sources, never ranked in-page. Sticky mobile action bar. `noindex, follow`. _Depends on: I3, I4, F5._

- [x] **I9 · State and city hubs** `[LAUNCH]` - **done 2026-08-16**
  Nested `/rentals/[state]/[city]`, fixing the unresolvable state/city slug collision. `lib/listings/hubs.ts` implements the index threshold with **10 unit tests**: ≥3 rentable homes to enter the sitemap, pending homes excluded from the count, a state indexable only if a child city is. `indexableHubPaths()` is ready for S2 to consume.
  `/rentals/[state]` and `/rentals/[state]/[city]` - note the **nested pattern**, which fixes the unresolvable collision between state and city slugs (`/rentals/washington`). Hubs are editorial: market context, local process, local staff, state voucher law, state licence, local FAQ, plus a live inventory preview linking into filtered search. Implements the index threshold: ≥3 live listings to enter the sitemap, 1–2 renders but drops out, 0 renders with nearest-market alternatives. _Depends on: I5. `[CONTENT]` - each hub needs genuinely local writing, which is the real limit on market expansion._

---

## Conversion

- [x] **C1 · `/apply` step 0 - pre-qualification** `[LAUNCH]` `[RISK]` - **done 2026-08-16** (logic + UI; thresholds blocked)
  `lib/apply/prequalify.ts` with **16 unit tests** plus a **17-check UI suite**. Asks only what changes the answer - no SSN, no date of birth, nothing sensitive before someone decides to continue.
  **The fee promise is enforced in code and verified in the UI:** an unlikely read returns `chargeFee: false`, the continue button disappears, and the applicant is shown homes that fit plus what would change the outcome. Voucher income is counted against the applicant's share only - applying a full-rent multiple to a voucher holder makes the requirement impossible by design. Never says "approved"; "likely" is the strongest word available.
  With thresholds still `null` the assessment **refuses to guess** rather than inventing a multiple, and takes no fee while it cannot read. A dev-only preview button exercises the tested logic against sample criteria.
  Income, voucher status, move-in date, pets, prior rental issues - then an **honest indication of likely outcome before any payment is taken**. A weak indication does not block the applicant; it tells them the truth and routes them to the tier-2 path if one applies. This is the trust hinge of the entire product: letting someone pay for a hopeless application is the fastest way to destroy trust in this category. _Depends on: T1, F7._

- [x] **C2 · Multi-step form shell** `[LAUNCH]` - **done 2026-08-16**
  `lib/apply/steps.ts` (named slugs, never numbers), `draft.ts` (per-step validation, resume-point calculation, progress), `store.ts` (merge-patch, contact lookup, read-normalisation for fields added after a record was written). **33 unit tests + 25 browser checks, all green.**
  Saving is a **POST-redirect-GET route handler, not a server action** - the action version failed because React's router intercepted the response and reused the cached payload for the same pathname, so validation errors never reached the screen. The route handler does a real navigation, and the forms now work with JavaScript disabled or still loading.
  **Two validation layers, both tested:** the browser blocks an incomplete submit and identifies the first invalid field (no wasted round trip); the server catches anything that skips that. Acceptance criterion verified - a mid-application return resumes at the exact step with data intact.
  Drafts are created at `/apply/start` rather than on page load, so no row is minted for a bot crawl or a bounce.


- [x] **C3 · Application steps 1–5** `[LAUNCH]` `[CONTENT]` - **done 2026-08-16**
  Details, income, rental history, household, review. **23-check end-to-end suite** walking the whole application in one sitting, all green.
  **History is the delicate page** and is built as such: the eviction question is asked plainly rather than buried in a checkbox someone could miss and later be accused of concealing; the consequence - "routes you to individual review, not an automatic decline" - sits beside the question, readable at the moment of hesitation; filing-versus-judgment is explained inline; and the explanation box is optional, framed as helping their case, because requiring someone to justify a hard year in order to be considered is the condescension the tonal rule forbids.
  **Assistance animals are a field, not a footnote** - so the fee calculation honours the FHA exemption automatically instead of depending on someone reading a comment.
  **Review is the last gate before money:** it re-validates every earlier step, shows every answer back with a Change link, discloses FCRA dispute rights, and **states the $55 fee before the payment step** - never first at checkout, per section 8.
  Remaining `[CONTENT]`: fee refundability terms need counsel.
  Applicant details · income and employment **with alternative documentation paths offered, not buried** · rental history with a non-punitive route for prior evictions · occupants and pets · review and disclosures. Every field labelled, inline validation, plain-language errors, and **a stated reason for every sensitive request**. Mobile: single column, numeric keyboards. Done when the flow completes on a phone in under twelve minutes. _Depends on: C2._

- [x] **C4 · Fee payment and confirmation** `[LAUNCH]` `[CONTENT]` - **done 2026-08-16 · MANUAL PAYMENT**
  **Payment model changed on the client's instruction: manual rails - bank transfer, Zelle, Chime, PayPal, other - reconciled by a person. No card processing, so no PCI scope.** `lib/payments/methods.ts` with 11 unit tests; **26-check browser suite**, all green.
  **The anti-fraud posture is the hard part and drove most decisions.** Zelle and Chime are the rails rental fraud runs on, and this company's whole position is being the real one. So: payment details appear **only on the payment page**, never by email/text/phone, and the page says so - giving the applicant something concrete to measure a later fraudulent message against. The amount is fixed and restated. It states we never ask for a deposit before a signed lease. Irreversible rails carry an extra warning. Unconfigured methods are hidden rather than shown blank, because a blank where an account number belongs pushes people to ask through a channel we do not control.
  **The 24-hour clock starts at verification, not submission**, and the confirmation screen says so. With manual payment there is a real gap between someone sending money and a person confirming it arrived; starting the clock at submission would mean advertising a deadline we begin missing on day one. No deadline is displayed until payment is verified.
  Also built: per-application payment reference (non-sequential, so it cannot be used to probe other applications), submission gated so `submittedAt` is unreachable from the client patch path, and `/admin/payments` with the verification queue that gates every applicant clock.
  **Blocked:** real account details for each method. Dev shows obviously-fake `SAMPLE -` destinations behind a banner; production offers nothing until configured, which correctly means **no application can be completed until you enter them**.
  Step 6 payment with the amount already known from `/fees` and step 0 - never first revealed here. Step 7 confirmation naming **a specific decision deadline**, not "soon." _Depends on: C3, T2._

- [x] **C5 · `/apply/status` and post-submission upload** `[LAUNCH]` - **done 2026-08-16** (storage pending)
  `lib/apply/status.ts` with **13 unit tests**; **24-check browser suite**, all green on a 390px phone viewport.
  **The page is safe to reach without a password because it is worth nothing to anyone else.** Verified: no date of birth anywhere in the markup, no SSN field, no screening-report content, no uploaded documents. It shows progress, next steps, and a payment reference for support calls - and nothing that would help someone holding a forwarded email.
  **No deadline is displayed until payment is verified**, matching C4. Before that it says a person is checking and explains when the clock starts. Past the deadline it admits it rather than going quiet.
  **Document upload** requests only what this applicant actually needs - a voucher holder is asked for the award letter and caseworker contact; someone who declared an eviction is asked for court paperwork **but it is marked optional**, because requiring it to be considered is the barrier individual review exists to remove. `capture="environment"` so a phone camera replaces a scanner, HEIC accepted (what an iPhone actually produces), and validation runs before anything leaves the device so a wrong file is a message in half a second rather than a failed upload on a metered connection.
  **Blocked:** file storage - encrypted at rest, access-logged, retention per the privacy policy. The send button is honestly disabled; silently dropping an applicant's identity document would be far worse.
  Status tracker reachable without login. **Document upload lives here, not in the application** - this is what makes the twelve-minute target reachable and it starts the 24-hour clock sooner. Mobile camera capture, multi-file, progress, retry. Status view never exposes full SSN or uploaded documents. _Depends on: F7, C4._

- [x] **C6 · Adverse action notice** `[LAUNCH]` `[CONTENT]` - **done 2026-08-16** (vendor pending)
  `lib/compliance/adverseAction.ts` encoding 15 U.S.C. § 1681m(a): **28 unit tests + 24 browser checks**, all green. Admin preview at `/admin/notices`.
  **The finding that justifies this task existing:** an adverse action is not only a decline. Approving someone on *less favourable terms* because of a consumer report - a larger deposit, a required co-signer - is adverse action too. **That means the tier-two track generates notices on approvals**, which for this business is a large share of decisions. An operator sending notices only on declines would be non-compliant on nearly every individual-review approval.
  The converse is enforced too: a decline based on what the applicant told us (income below their own stated figure) is **not** an FCRA notice, and gets a plain explanation instead - sending dispute-your-report language for a non-report reason points someone at a document that had no role in the outcome.
  Notices name the agency with address and toll-free number, state the agency did not make the decision, state the right to a free copy within 60 days and the right to dispute, and cite the published rule applied. Content requirements are validated in code, because the failure mode is silent: a notice missing the agency phone number looks fine and is not compliant.
  **Blocked:** screening vendor identity (legal name, address, toll-free number). Until set, no notice can be produced - the code refuses rather than emitting one with a blank where the agency belongs. Wording needs counsel; template is versioned so any notice sent can be reproduced.
  FCRA-required when declining based on a consumer report: names the reporting agency and the applicant's dispute rights, plus what would change the answer. **Absent from the source brief - added in phase 2 as a legal requirement, not a nicety.** Delivered by email and PDF; not a public route. _Depends on: C4. Needs the screening vendor._

- [x] **C7 · `/schedule-tour`** `[LAUNCH]` - **done 2026-08-16** (delivery pending)
  `lib/tours/request.ts` with **17 unit tests**; **23-check browser suite**, all green on a 390px viewport.
  **A request with preferred windows, not a bookable calendar.** A live slot picker promises 2pm Thursday is genuinely held - backing that needs staff calendars and per-market coverage across 500+ homes in several states. A calendar showing slots it cannot hold is the same failure as a listing page for a leased home. Instead: up to three preferred windows, confirmed by a person within a stated **4 hours** - a promise this business can keep.
  **Evening and weekend windows** exist because offering only weekday daytime quietly filters for people who can take time off - a conversion loss and an incidental screen this brand should avoid. **Video walkthrough** is offered as a real option, not a consolation, for the relocating-renter segment. **Email OR phone** is enough; requiring both to look at a house is a barrier with no purpose. Access needs are asked about up front.
  Anti-fraud carries through: no charge to tour ever, touring does not start an application, nobody works on commission, and we never ask for a deposit at a viewing.
  **Timezone bug found and fixed:** `selectableDates` built local midnight then called `toISOString()`, shifting the date across the UTC boundary - so "Today" rendered as yesterday and the validator rejected it as already passed. In some timezones same-day tours were simply unbookable. Now formatted from local components, with a regression test asserting every offered date validates.
  **Blocked:** notification delivery to staff. The form validates and confirms, and says honestly that the request is not yet delivered.
  Booking with availability, confirmation, and reminders. Secondary conversion action across the site. _Depends on: I8._

- [x] **C8 · `/saved` and `/alerts`** - **done 2026-08-16** (delivery pending)
  `lib/saved/list.ts` + `lib/alerts/alert.ts` with **17 unit tests**; **25-check browser suite**, all green at 390px.
  **Saving works before we know who you are.** The list is an opaque `httpOnly` cookie of listing ids - no account, no password, no email prompt at the moment someone taps a heart at eleven at night. Contact details are only asked for when they buy something concrete: keeping the list across devices, or an alert.
  **The save control sits above the card's stretched-link overlay, never inside it.** Nesting a button in a stretched link produces invalid HTML, an unreachable control, and a link whose accessible name swallows the button's. Its own name is the address, not "Save" - a list of twenty identically-named buttons is unusable in a screen reader.
  **An alert is a saved search**, reusing the search filter model outright so an alert cannot match differently from the search that created it. Each home is mentioned **once**, not every day it stays listed. An alert with no filters at all is refused - it is the fastest route to an unsubscribe and to looking like the spam the legitimacy pillar exists to distinguish us from. Unsubscribe is recorded rather than deleted, since CAN-SPAM makes honouring it an obligation and the record is the proof.
  Saved homes that are gone are **shown, not silently removed** - someone who saved five and finds three leased has learned something true about the market, and that is the argument for applying now.
  **Blocked:** email and SMS delivery. Both forms validate and confirm, and say honestly that nothing is sent yet.
  Saved homes and search-alert management, both against the prospect token - no password, reachable from an email link. _Depends on: F7, I4._

---

## Content and remaining pages

- [x] **N1 · `/guides` and `/guides/[slug]`** - **done 2026-08-17**
  Hub with category filter plus **three fully written guides**: what to bring to a rental application, what happens when you are declined (FCRA rights, getting the report free, disputing it, filing-vs-judgment), and renting with a housing voucher (inspections, payment standards, income requirements applied wrongly).
  Written as general renting knowledge rather than claims about this company, so they are accurate now and stay accurate when the business facts land. **Several of them tell someone how to challenge a landlord, including us** - which is what makes the rest of the site's transparency claim credible rather than decorative. Each carries a not-legal-advice note pointing at state and local authorities where rules vary.
  Renter education hub with category filter. **The main long-term organic engine**, since listing pages are noindexed and city hubs are inventory-gated. _Depends on: F4._

- [x] **N2 · `/property-management`** - **done 2026-08-17**
  The only page whose CTA is not Apply, and written for a different reader - an owner cares about occupancy, risk, and who carries it. Frames approving applicants other operators decline as a **commercial position, not a kindness**: a defensible yes on day four beats an automated no plus three more weeks of vacancy. Explains how consistency keeps it defensible, since the fair-housing exposure lands on the home too. Commercial terms and reporting cadence flagged as pending.
  Owner-facing marketing page. The only page on the site whose CTA is not Apply. _Depends on: F3._

- [x] **N3 · `/careers`** - **done 2026-08-17**
  Short and honest that there is nothing to apply for yet. A careers page listing invented roles costs real people's time - not something this company can do. Describes the work truthfully (judgement and returning calls, not sales, nobody paid more for pushing an application) and states equal opportunity.

- [x] **N4 · `/404` and `/500`** `[LAUNCH]` - **done 2026-08-17**
  A 404 here is usually a trust event, not a typo - someone followed a link to a home that is gone. So it explains, then offers the three cheapest available homes, an alert, and routes to criteria/fees/status/contact.
  **Found and fixed:** a `not-found.tsx` inside a route group does not catch unmatched URLs, so those were falling through to Next's bare default. Extracted the body and added a root entry point that renders the site chrome itself - the footer's licence numbers are load-bearing for someone checking whether this company is real.
  The error page leads with **"your answers are saved"**, because the fear on an error screen mid-application is not that the site broke, it is that an hour of work and a fee just vanished.
  A 404 here is a trust event - someone followed a link to a home that is gone. Offers nearest available alternatives, same doctrine as the empty search state. Never a bare dead end. _Depends on: I6._

- [x] **N5 · Home page sections 3–9** `[LAUNCH]` `[CONTENT]` - **done 2026-08-17**
  Available homes (6, real total-cost pricing, save hearts), how it works (4 steps with real timings), what we look at (condensed criteria), markets served (**live counts only** - a market listed with nothing in it is a promise broken on the click), team, resident stories, and guides.
  Team and resident stories are **deliberately empty**. They are the two sections whose whole job is being verifiable, on a site whose audience arrives checking for exactly that; plausible filler there would do more damage than an unfinished page.
  Available homes, how it works, what we look at, markets served with **live counts only**, meet the team, resident stories, guides. Testimonial card refuses to render without name, city, and move-in year. _Depends on: F1, I4, T1, T5._

---

## Search, performance, accessibility

- [x] **S1 · Indexation rules** `[LAUNCH]` - **done 2026-08-17**
  `app/robots.ts` plus `scripts/indexation-audit.mjs` - **57 mechanical checks, all passing**. Verifies posture on every route, canonicals from filtered states, and that the five attribute-permutation shapes the brief forbids all 404.
  **The check that justifies the script: nothing in the sitemap may also carry `noindex`.** That contradiction - the site telling search engines two opposite things about one URL - is trivially easy to create by accident and nothing else in a build would complain. Indexation defects are silent: nothing breaks, no test fails, the site just does not rank, and by the time anyone looks the damage has been compounding for months.
  robots.txt deliberately does **not** block `/homes-for-rent/` detail pages. They are `noindex, follow`, and a crawler must fetch them to see the `follow` and pass value onward to the pages that can rank. Blocking them would strand that.
  `noindex, follow` on all listing detail and all filtered search states. Canonicals from every filtered state to `/homes-for-rent`. `robots.txt` excluding parameter crawling. **No attribute-permutation path may exist in any form.** _Depends on: I5, I8._

- [x] **S2 · Sitemap from live data** `[LAUNCH]` - **done 2026-08-17**
  `app/sitemap.ts`, generated from live inventory. Applies the city-hub threshold automatically, so a market dropping below three rentable homes leaves the sitemap on the next build without anyone remembering, and rejoins when inventory recovers. Guides carry their own review date rather than the build time - claiming everything changed today is how `lastmod` stops being believed.
  **Caught a real omission:** `/schedule-tour` is indexable and searched for directly, and I had left it out. Found by the audit, not by review.
  Only indexable URLs, accurate `lastmod`, regenerated as inventory turns, applying the city-hub threshold automatically so it self-corrects. _Depends on: S1, I9._

- [x] **S3 · Structured data** - **done 2026-08-17**
  `lib/seo/structuredData.ts` - Organization on the home page, FAQPage on qualifications, Article + BreadcrumbList on guides. **Zero blocks on noindexed listing pages**, verified.
  **`localBusinessJsonLd()` returns `null` until there is a real address.** Structured data is a machine-readable assertion of fact; a LocalBusiness with no verifiable address is not a partial answer, it is misinformation with a schema attached - and a business claiming local presence it cannot evidence is the shape of a scam listing, on a site whose whole position is being the real one. Every field is omitted rather than guessed.
  Organization, LocalBusiness, FAQPage where genuinely applicable. **Never on noindexed listings.** _Depends on: S1._

- [~] **S4 · Performance pass** `[LAUNCH]` - **measured and largely fixed 2026-08-17 · final pass depends on I3**
  `scripts/perf-audit.mjs` - production build, CPU 4x, slow 4G (1.6 Mbps / 150ms RTT), cold cache, fresh renderer per measurement.
  **The finding, and the reason this task nearly passed for the wrong reason:** the fixtures serve ~1KB placeholder SVGs, and measuring those reported a comfortable 980ms pass on a site that does not exist. Re-measured with realistic 90KB photo weight, search hit **6,496ms against a 2,500ms budget - 2.6x over**.
  Root cause: **every card image was `loading="lazy"`**. It looks like a straightforward win and is the opposite on a results page - the browser does not begin fetching a lazy image until layout has run, so the one that becomes the LCP element starts late and then queues behind everything else on a slow connection. Fixed by marking the first row above the fold `eager` + `fetchPriority="high"`: **6,496ms → 2,496ms**.
  **CLS is 0.000 on every route** at every scenario - the explicit width/height on every image, set back in I4, is what earned that.
  **Quantified what remains, by measuring it rather than asserting it:**
  | scenario | worst LCP | verdict |
  |---|---|---|
  | ~1KB placeholders | 980ms | meaningless |
  | 90KB, all lazy | 6,496ms | FAIL 2.6x |
  | 90KB, above-fold eager | 2,836ms | FAIL on city hub |
  | 25KB right-sized | **1,096ms** | PASS, 2.3x headroom |
  **So responsive `srcset` is not an optimisation here, it is the difference between passing and failing.** A 390px phone is currently served a 1200px image. The renditions come from I3, which is blocked on object storage. Until then one route sits 336ms over budget with real photography.
  **Corrected in the design review:** the markup carried `sizes` and was commented as "ready for it", which overstated the case - **`sizes` without `srcset` is inert**, because the browser has a single candidate and so no choice for `sizes` to inform. It is not doing work today; `PropertyCard.tsx` now says so.
  INP not measured - needs real interaction under load; the browser suites cover responsiveness functionally but a field number needs RUM.
  LCP < 2.5s, CLS < 0.1, INP < 200ms - measured on **mid-tier mobile over 4G**, not desktop fibre. Image-heavy pages are the risk; I3 largely determines whether this passes. _Depends on: I3, I8._

- [~] **S5 · Accessibility audit** `[LAUNCH]` - **automated portion done 2026-08-17 · screen-reader pass outstanding**
  `scripts/a11y-audit.mjs` - 30 routes × 2 viewports × 2 themes = **120 page loads, zero findings** at every impact level. Checks landmarks, heading order, duplicate ids, image alt, control labels, accessible names, dangling ARIA references, positive tabindex, computed contrast on rendered text, touch targets, and focus indicators.
  Plus `verify-motion` (7 checks): nothing animates under `prefers-reduced-motion`, motion still exists without it, no transition exceeds the 200ms brief ceiling, and no looping animation is fast enough to flash. Token contrast validator re-run: **all pass**.
  **Real fixes:** search results jumped h1→h3 (cards are h3 with no h2 above them - added a visually-hidden results heading); standalone section links, the guides breadcrumb, admin table links, and the skip link were all under the 24px target minimum.
  **Three audit bugs found and fixed, each of which produced convincing false alarms:** `:focus-visible` does not match programmatic `.focus()`, so the first run reported all 258 focusable elements as having no indicator - rewritten to send real Tab keys. A checkbox inside a label is not the target, the row is. And pages occasionally rendered before CSS loaded, reporting browser-default link blue as a contrast failure - added a readiness gate.
  **STILL REQUIRED BEFORE LAUNCH - a person with a screen reader driving the application end to end.** Automation cannot judge whether alternative text is *useful* rather than merely present, whether reading order makes sense, whether an error message tells someone what to actually do, or whether a live region interrupts at a useful moment. The brief asks for driven, not audited. This work makes that person's time count for judgement instead of finding missing labels.
  WCAG 2.1 AA across every flow. Keyboard operability of search, filters, map, gallery, and the full application. Focus visible and designed throughout. Live regions on async surfaces. Landmarks, heading order, skip links. `prefers-reduced-motion` honoured. **The application flow is driven end to end with a real screen reader, not just audited.** Re-run `validate-contrast.py` if any token changed. _Depends on: everything. Housing is a documented ADA litigation area - this is legal exposure, not polish._

- [~] **S6 · Fair Housing copy audit** `[LAUNCH]` `[CONTENT]` - **mechanical pass done 2026-08-17 · three items cannot be closed here**
  Every public string reviewed for language expressing preference or limitation regarding protected classes, including familial status and including neighbourhood descriptions. Photography checked for genuine diversity. Voucher acceptance stated plainly. Then external legal review before launch. _Depends on: all copy complete._

  **Built:** `lib/compliance/fairHousingTerms.ts` - ~40 phrases across seven categories, each with a reason and a `contextMatters` flag, because a page *explaining* fair housing law necessarily contains "familial status" and "no children"; a scanner that flags those has found the compliance page, not a violation. `scripts/fair-housing-audit.mjs` (`npm run audit:fair-housing`) runs it over the rendered text of all 27 public routes and checks the affirmative requirements too - prohibition is only half of compliance, and a site with no bad terms and no Equal Housing Opportunity mark is still short.

  **Result: clean.** No prohibited language, no context-dependent phrases outside the pages that discuss the law, EHO mark and non-discrimination statement present on all 27 pages, voucher acceptance stated on all four pages a voucher holder would check.

  **Two guards, because a compliance report that passes vacuously is worse than none:** 22 unit tests assert the scanner actually catches known-bad copy (it would otherwise be impossible to distinguish "clean site" from "broken scanner"), and the audit fails any page returning under 400 characters rather than reporting a pass on text it never read. A statement whose `scope` maps to no route also aborts the run instead of being silently skipped.

  **Found while reading the copy by hand** - the scanner cannot check whether a promise is kept. `/second-chance-leasing` states that the individual-review rules are "written down: income multiple, deposit, co-signer terms, and how far back a record can be. All of it is on the criteria page." Ten of those thresholds currently render as `[TO CONFIRM]`. The code claimed these placeholders "cannot be shipped by accident", which prevented nothing, so `scripts/launch-gate.mjs` (`npm run launch-gate`) now enumerates all 16 unpublished business facts and exits non-zero. This is a Fair Housing check, not a content chore: published criteria applied consistently is the safe harbour, and a site that advertises individual review while showing a blank where the rule goes has the exposure the two-tier model was designed to remove.

  **Also fixed, found the same way:** the application fee existed as three hand-typed copies of `5500` - the published schedule, `APPLICATION_FEE_CENTS`, and a test asserting the literal. They agreed by coincidence. The day the real fee arrives, whoever edits the published page has no reason to know the payment constant exists, and the site would quote one amount while requesting another - at the one moment the transparency claim is actually tested. `APPLICATION_FEE_CENTS` is now derived from the schedule and throws if it is absent; the test asserts the invariant instead of the placeholder.

  **Cannot be closed here - carry to launch:**
  1. **Photography diversity.** Placeholder plates only, so there is nothing to review yet. Becomes real with I3.
  2. **City-hub and neighbourhood copy.** The local-content slots are empty. This is the single most likely place for steering language to enter the site, because it is where writers reach for shorthand - the scanner covers the known proxies, but new prose needs a person.
  3. **External legal review of all public-facing copy.** Explicitly required by the brief, and not substitutable by any of the above.

---

## Deferred - phase two

- [ ] **P1 · Resident portal** - rent payment, autopay, ledger, maintenance with photo upload, lease documents, renewals, notices. **Blocked on the PM system answer**: whether the portal owns the rent ledger or reflects one. Two sources of truth for what a resident owes surfaces as someone being dunned for rent they already paid. Residents keep using the existing tenant portal until this is genuinely better.
- [ ] **P2 · Ops console** - application review queue with 24-hour SLA countdown, tier-2 decision capture against the specific rule invoked, adverse-action generation. **Until this exists, tier-2 decisions need a written log captured at decision time** - a spreadsheet is fine. It is the audit trail the two-tier model depends on, and it is unreconstructable later.

---

## Review

- [x] **Design review** - **done 2026-08-17** → `DESIGN_REVIEW.md` + 48 screenshots in `screenshots/`
  Reviewed against a **production build**, not dev: dev injects a devtools indicator that reads as a stray UI element in a full-page capture. 8 pages × 3 breakpoints × light and dark, every capture asserting no horizontal overflow.

  **The finding behind the findings: four defects were invisible to a fully green test suite, and every one was obvious the moment I looked at a rendered page.**
  1. **"See all46homes"** - `inline-flex` makes each text run an anonymous flex item and strips its leading/trailing whitespace, so both spaces around `<span>46</span>` ceased to exist. The *accessible name* still computed correctly, because the accessibility tree reads the DOM and not the rendered boxes, so the a11y audit passed it. A regression from S5's own touch-target fix, since `min-height` needs a non-inline display and `inline-flex` is the obvious reach. Fixed, plus `scripts/flex-text-audit.mjs` because that combination will recur.
  2. **Every map pin read "$10"** - the label was `Math.round(total / 100000) * 1000` where `total` is cents, handed back to a formatter expecting cents. Wrong prices on the one surface built for comparing prices, on a site whose position is that its numbers are honest. Extracted to a typed `pinPriceCents()` in `lib/pricing.ts` with tests, because the units convention is the only defence against that class of error.
  3. **The two differentiator filters were the only two hidden.** The sticky sidebar fits nine of eleven controls at 1280×860, and the two below the scroll were vouchers and accessibility - the two no competitor offers, and the two the reassurance strip promises on every page. Every parity filter was visible. Reordered.
  4. **Step 0 pre-answered its own questions** - `voucher=no`, `pets=no`, `issue=none` all pre-checked. A voucher holder left on "No" has their income undercounted and may be told they are unlikely when they would qualify; someone with an eviction left on "None of these" is assessed on tier one, told their odds are good, and pays before meeting the truth. Both are the failures this step exists to prevent. Defaults removed, groups required, and the preview button's bypass of constraint validation closed.

  **A false negative in my own accessibility audit.** The touch-target check exempted any `<a>` inside a `<p>` *or an `<li>*` as "a link in a sentence", which covered every navigation list on the site - the footer's ~30 links at 16px included - so it reported zero findings while most of the site's links went unmeasured, and it never implemented WCAG 2.5.8's spacing exception at all. Both fixed, and **proved live rather than assumed: the same code reports 1,806 occurrences at a 44px bar and zero at 24px.** The site genuinely conforms; now demonstrably.

  **The suites were not reproducible from the repo.** All 12 browser suites behind "280 checks green" lived in a session scratchpad and would have vanished with it. Moved to `scripts/suites/` with a paced `run-all.sh` (`npm run verify:browser`).

  **Left open deliberately, in the review:** footer/nav links meet the 24px WCAG bar but not the 44px platform guideline (57 distinct controls) - raising them changes footer rhythm on 30 routes and is a visual-design call, not a defect. Map keyboard instructions read as an unstyled note rather than a designed affordance.

---

## Blocked on Open Items

These tasks have structure that can be built now and copy that cannot. Do not invent the values.

| Needed | Blocks |
|---|---|
| Tier 1 + tier 2 thresholds | T1, T4, C1, I8 qualification snapshot |
| Complete fee schedule | F5, T2, C4, every price surface |
| States, cities, per-state licence numbers | F2 footer, T6, I9 |
| Team roster and photographs | T5, N5, I9 local staff |
| Attributable testimonials | N5 |
| Screening vendor | C6 |
| Payment account details for at least one rail | C4 - no application can be completed without one |
| Property management system | P1 only |
| Lease-term options on `Listing` | the feed sends `advertised_term` + `terms`; the model has no field, so the lease-terms section cannot state them |
| Market → hub mapping | the feed rolls up by market ("Northern California"), the site by state/city; markets cross city and state lines |
| Voucher acceptance, per home | **not in the partner feed at all** - must be maintained locally for every imported home |
| Lease date for leased homes | not in the feed; the 45-day grace window is measured from it |
| **State coverage per market** | the feed's "Carolinas" spans NC and SC; its slug says NC and its pin is 91km from Charlotte. Wrong here = wrong brokerage licence on a public page |
| Market → hub content | markets are regions, not cities. City hubs come from listing addresses; the market list needs its own editorial treatment |

Run `npm run launch-gate` for the live list. It enumerates all 16 unpublished facts and exits non-zero while any remain, so this table cannot quietly drift out of date against the code.
