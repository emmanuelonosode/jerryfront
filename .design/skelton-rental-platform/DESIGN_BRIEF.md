# Design Brief: Skelton Realty Group - Single-Family Rental Leasing Platform

**Company:** Skelton Realty Group
**Domain:** skeltonrealtygroup.com *(registered 2026-08-15; no DNS, no hosting yet)*
**Status:** Operating business, no existing web presence
**Feature slug:** `skelton-rental-platform`
**Phase:** 2 of design flow - written after `/grill-me`
**Last updated:** 2026-08-15

---

## Problem

Someone needs a house. They have been declined already - maybe for a credit score, maybe an eviction filing from four years ago, maybe because their income arrives as 1099s instead of pay stubs, maybe because they hold a housing voucher and the last three places stopped returning calls once they mentioned it.

They are now doing the worst version of apartment hunting: applying into silence. Every application costs money they do not have spare. Every listing site looks the same, and half of them are scams - the photos are stolen, the address is real, the person emailing back is not. They cannot tell which. They have been asked for a deposit by someone who did not own the house.

So they arrive at a rental site carrying three questions at once, and no site answers them:

1. **Will I be declined again?** Criteria are never published. They find out after paying.
2. **What will this actually cost?** The listing says $1,800. The real number is $1,995 once mandatory fees appear - usually at checkout, sometimes at lease signing.
3. **Are these people real?** No names, no faces, no address, no licence number. A contact form into a void.

They are stressed, often on a phone, often on a limited data plan, often at night after work. The interface they are given is a photo gallery optimised for browsing when what they need is an answer.

## Solution

A site that answers all three questions before it asks for anything.

The core move is inversion: **most rental sites are a catalogue with an application bolted on. This is an approval engine with listings attached.** Every surface leads with whether you can get approved, what it costs, and who you are dealing with - and the homes are how you act on that.

Concretely, that means the qualification criteria are a landing page rather than a legal appendix. The fee schedule is published in full and downloadable, before an application exists. Prices show the total a resident actually pays. Real staff appear with names, faces, markets, and direct contact. And a pre-qualification step gives an honest read on likely outcome *before* taking a fee, because letting someone pay for a hopeless application is the fastest way to destroy trust in a category this saturated with fraud.

The differentiator is a human who can say yes - and to make that both credible and legally defensible, discretion is published as a **second track with its own written rules** rather than left as an unstated "we look at everything." Tier 1 is standard approval. Tier 2 names exactly what it takes: eviction recency, income multiple, deposit uplift, co-signer terms, ITIN and voucher handling. An anxious applicant can self-assess in fifteen seconds. Every approval traces to a rule applied consistently.

## Experience Principles

Three principles. Each resolves a real tension in this build.

**1. Answers before inventory - resolves *browse* vs *qualify***
The instinct in real estate is to lead with photos. This audience needs to know if they qualify before they let themselves want a house. The approval reassurance strip sits above every listing grid. The qualification snapshot appears on every property detail page. No surface shows homes without showing the terms of getting one.

**2. Honest numbers over competitive numbers - resolves *conversion* vs *trust***
Total monthly cost is the primary figure everywhere a price appears, even in a search grid where competitors show a lower base rent for a comparable home and win the click. We accept a measurable click-through cost as the price of the positioning. What we will not accept is invisibility - base rent and the fee delta appear *on the card*, so the comparison is legible rather than merely unfavourable.

**3. Proof over polish - resolves *designed* vs *believed***
In a category dense with scams, a beautifully art-directed page from an unnamed company reads as more suspicious, not less. Real photographs, real names, real licence numbers and real addresses do more conversion work than any visual treatment. Where proof does not exist, the section does not ship - we never substitute stock imagery, unattributed testimonials, or fabricated trust badges.

## Aesthetic Direction

- **Philosophy: Ticketmaster-inspired** *(replaced Civic Plainspoken on 2026-08-17)* - electric blue on black and white. Black chrome carrying the header and footer, a solid blue accent bar across the top, white content surfaces on a neutral grey page, full-pill buttons and filter chips, uppercase labels, and one geometric sans (Figtree, standing in for the licensed Averta) distinguished by weight rather than by a second family. **The visual language is borrowed; the brand is not** - no wordmark, logo, or brand mark of the reference site appears here, because Skelton Realty Group is a real company and wearing another company's identity is impersonation rather than influence.
  **Two things deliberately not adopted.** The reference system is engineered for urgency and scarcity; the brief forbids countdown timers, "3 people viewing", and pressure language outright, and that rule survives the reskin intact. And spacing stays generous rather than matching the reference's density, because on a rental site dense layout reads as a scam signal - the audience has been trained by exactly those sites.
  *Superseded: Civic Plainspoken - near-monochrome ink on warm paper, Rams functionalism, rules instead of shadows. Its structural decisions survive: colour is information rather than decoration, every status ships icon + label + colour, and no meaning is carried by hue alone.*

  **Chosen over the warmer alternatives deliberately.** The trade is charm for unimpeachability - this direction is weaker on the humanity pillar and strongest on transparency and legitimacy. Warmth has to come from the *writing* and from the team photography, because it will not come from the interface. That raises the stakes on copy: plain does not mean cold, and an official-record aesthetic paired with bureaucratic prose would land exactly wrong for someone who has already been declined three times.

  **Departure from the source brief, recorded:** section 4 asks for "a characterful but readable display face." Public Sans is deliberately uncharacterful - that plainness is the point of this direction, but it is a conscious override, not an oversight.

- **Tone:** Direct, unhurried, and matter-of-fact. Plain-spoken authority. States numbers and rules without hedging. Writes to someone who has been turned down as a capable adult with a solvable administrative problem - never as a risk being tolerated, never with congratulatory second-chance language that implies charity.

- **Reference points:** The structural discipline of institutional SFR portals (photo-forward cards, map-plus-list search, generous whitespace, strict component reuse). Government and civic service design at its best - USWDS, GOV.UK - where clarity is the entire aesthetic and the interface visibly refuses to sell. The plain-numbers transparency of consumer finance products that publish their rates up front.

- **Anti-references:**
  - Corporate real estate neutrality - polished, automated, accountable to no one
  - Generic real-estate visual language: skyline silhouettes, house-outline icons, handshakes, keys on a table
  - Stock photography of models in empty rooms
  - Fake urgency: countdown timers, "3 people are viewing this home"
  - Unattributed testimonials and undocumentable trust badges
  - Charity framing or condescension toward imperfect credit histories

### Type direction

Two families maximum, per constraint. Both load from Google Fonts.

| Role | Face | Why |
|---|---|---|
| Display + body | **Public Sans** | The USWDS workhorse. Neutral, highly legible, wide weight range, built for dense civic interfaces and long legal copy. Carries headlines at scale and body at 16px without a second sans. |
| Figures | **IBM Plex Mono** | Every number in the product - rents, fee tables, sqft, application numerics, licence numbers, dates. Monospace makes tabular alignment structural rather than an opt-in `tnum` feature, and reinforces the official-record register. |

Two families, satisfying the constraint. The figure/text split also solves the tabular-figures requirement outright: **all numeric display routes through Plex Mono**, so columns align by construction.

**All-caps needs a rule.** The direction leans on all-caps headlines and labels. Set them with CSS `text-transform`, never as literal capitals in content, so screen readers and copy edits stay sane. Cap them at short headlines and labels - never body copy, never anything over a line and a half. All-caps at length measurably slows reading, and the audience most affected is the one already under stress.

Scale runs 12 → 64 as specified, and nothing outside it ships.

### Colour direction

Near-monochrome. Colour appears **only** where it carries meaning, which resolves an inherited conflict rather than creating one.

- **Ink** - warm near-black. Text, rules, and **primary buttons**. In a monochrome system a solid ink button is the highest-contrast affordance available and needs no accent colour to read as the primary action.
- **Paper** - warm off-white surface scale with a faint ochre undertone. No pure white, no pure black.
- **Semantic set** - the only chromatic colour in the entire system, covering five availability states plus error and success. Restrained and desaturated so it reads as annotation on a document, not decoration.

**Conflict resolved.** The concept named signal red as the single accent, but the source brief also requires an error state and a full availability set. A red CTA sitting beside a red error message is the exact failure mode flagged in phase 2 - and near-monochrome cannot simultaneously host seven meaningful semantic colours *and* a decorative accent. Resolution: **primary actions are ink, and the red family is reserved exclusively for error and destructive actions.** Nothing else in the interface may use it. This is more Rams than the original concept, not less - colour becomes purely informational, and the one hue a stressed applicant must never misread is unambiguous.

**Non-negotiable:** every pairing clears WCAG AA, and meaning is never encoded in colour alone - every availability state carries an icon and a text label alongside its colour. In a near-monochrome system this matters more, not less: the semantic colours are the only ones present, so a colourblind user has no surrounding chromatic context to disambiguate against.

**Phase 4 must resolve:** five availability states plus error and success is seven distinguishable meanings in a deliberately desaturated palette. Separation needs measured hue distance and contrast math, validated in both themes - not chosen by eye.

## Existing Patterns

**None. This is greenfield.** Scanned and confirmed empty: no `tokens.css`, `variables.css`, `theme.*`, `globals.css`, no Tailwind config, no `components.json`, no `package.json`, no component or `ui` directories, no Storybook, no font loading, no route files. The only file present is `.claude/settings.local.json`.

This brief therefore *establishes* the vocabulary rather than extending one.

- **Typography:** none - establishing Public Sans (text) + IBM Plex Mono (all figures)
- **Colours:** none - establishing warm ink, warm paper scale, and a 7-value semantic set as the only chromatic colour
- **Spacing:** none - establishing 4px base unit, 12-column responsive grid, minimal radii
- **Components:** none - full library is new build

**Stack:** Next.js (App Router) + Postgres. Chosen because the indexation strategy requires server-rendered public pages, the product carries three distinct identities (prospect, resident, staff), and document upload plus payments rule out a static approach.

## Component Inventory

Everything is new. Status column retained for downstream phases to update.

| Component | Status | Notes |
| --- | --- | --- |
| Property card | New | Three density variants (grid, list, compact/map-linked). Total-cost primary, base rent + fee delta secondary, on the card. |
| Availability badge | New | Five states: Available Now, Coming Soon (with date), Application Pending, Leased, Off Market. Icon + label + colour - never colour alone. |
| Price display | New | Total-cost disclosure component. Tabular figures. Expandable breakdown. |
| Search filter bar | New | Desktop inline; mobile drawer. Filters: location, price, beds, baths, home type, availability date, pets, voucher-accepted, accessibility features. |
| Map with clustered pins | New | Bidirectional hover linkage with list. Keyboard operable - non-negotiable, and the hardest a11y surface in the build. |
| Image gallery + lightbox | New | Exterior-first ordering, keyboard navigable, full-screen viewer, virtual tour embed slot. |
| Multi-step form shell | New | Progress indicator, save-and-resume state, step validation. Powers the application flow. |
| Document upload | New | Mobile camera capture, multi-file, progress, retry, format validation. |
| Status tracker | New | Post-submission, reachable via tokenised link without login. Shows 24-hour decision deadline. |
| Staff card | New | Photo, name, role, markets, direct contact. Highest-converting component on the site. |
| Testimonial card | New | Requires name, city, move-in year. Component refuses to render without attribution. |
| FAQ accordion | New | Used across differentiator pages and qualification. Feeds FAQPage structured data. |
| CTA band | New | Section-level conversion prompt. |
| Sticky mobile action bar | New | Apply / Schedule tour. Property detail and application. |
| Skeleton loaders | New | Every async surface. No spinners anywhere. |
| Empty states | New | Must offer real next actions - nearest alternatives, alert signup, apply-anyway. An empty search is a lead. |
| Toast notifications | New | Non-blocking feedback, screen-reader announced. |
| Modal + drawer primitives | New | Focus trap, escape handling, scroll lock, restore focus on close. |
| Fee table | New | Tabular figures, downloadable summary, used on `/fees` and in listing breakdowns. |
| Qualification tier panel | New | Renders the two-track model. Self-assessment is the point. |
| Bulk listing import | New | CSV import, multi-photo upload with drag-ordering, batch status change. Required by the manual-entry decision. |

**All components ship with:** default, hover, focus, active, disabled, loading, and error states. Focus states are designed, never browser defaults.

## Key Interactions

**Search → results.** Filter changes write to the URL for shareability; the canonical always points to the unfiltered hub. Results transition through skeleton cards, never a spinner. Filter state persists across navigation and back-button. Slow connections degrade gracefully - this audience is frequently on constrained data.

**Card ↔ map.** Hovering a card raises its pin; hovering a pin raises its card. Keyboard focus does the same thing, because this linkage is otherwise mouse-only and that fails AA.

**Empty search.** Does real work: nearest available alternatives, alert signup, and a prompt to apply so staff can match inventory manually. Never a dead end.

**Gallery.** Opens to exterior. Arrow keys navigate, Escape closes, focus returns to the trigger. Full-screen viewer traps focus. Images lazy-load below the fold in modern formats at correct dimensions.

**Price disclosure.** Total is the resting state. Expanding reveals base rent plus each recurring required fee itemised. No fee ever appears for the first time later in the funnel.

**Pre-qualification (Step 0).** Collects income, voucher status, move-in date, pets, prior rental issues - then returns an honest indication of likely outcome *before* any payment. A weak indication does not block the applicant; it tells them the truth and offers the tier-2 path if one applies.

**Application progression.** Each step validates inline with plain-language errors. Every sensitive request states its reason. Progress saves continuously; resume by email or SMS. The fee amount is stated before the payment step is reached, never revealed at it.

**Post-submission.** Confirmation names a specific decision deadline, not "soon." Status tracker is reachable via tokenised link without login. Document upload continues here rather than blocking submission - see Responsive Behavior for why.

**Availability transitions.** Available Now → Coming Soon (dated) → Application Pending → Leased. Leased homes remain reachable for a defined window showing status plus alternatives, never a 404.

## Responsive Behavior

**Mobile-first, non-negotiable.** The majority of this audience searches for housing on a phone, frequently on limited data.

Breakpoints: `sm` 640 / `md` 768 / `lg` 1024 / `xl` 1280.

Components that change *behaviour*, not merely size:

| Component | Mobile behaviour |
|---|---|
| Search | Map and list become a toggle, not a split view. List is the default. |
| Filters | Full-height drawer with apply/clear footer, not an inline bar. |
| Property detail | Sticky bottom action bar (Apply / Schedule tour) replaces pinned header CTAs. |
| Gallery | Swipe-driven, full-bleed, with count indicator. |
| Fee and spec tables | Reflow to stacked label/value pairs. Never horizontal scroll. |
| Application | Strictly single column. Numeric inputs get numeric keyboards. Camera capture replaces file picker. |
| Navigation | Drawer. Apply remains reachable without opening it. |

**The twelve-minute constraint reshapes the application.** Success criteria demand a phone application under twelve minutes; the specified flow runs steps 0–7 including document upload. Those do not reconcile. Resolution: **decision-relevant data submits in under twelve minutes, and document upload moves to the post-submission status tracker as a named task.** Faster submission, higher completion, and the 24-hour clock starts sooner.

## Accessibility Requirements

**WCAG 2.1 AA minimum across every flow.** Housing is a documented ADA litigation area - this is legal exposure, not polish.

- **Contrast:** 4.5:1 body text, 3:1 large text and UI components. Every token pairing validated numerically, in both themes, before it ships.
- **Never colour alone:** all five availability states, plus error and success, carry icon + text label.
- **Keyboard:** full operability of search, filters, map, gallery, and the entire application flow. The map is the known-hard surface and needs a genuine non-pointer path to every pin, not a token one.
- **Focus:** visible and designed on every interactive element. Focus trapped in modals and drawers, restored to the trigger on close.
- **Forms:** every field labelled; errors associated via `aria-describedby`; messages in plain language; sensitive requests state their reason inline.
- **Async:** loading and result changes announced via live regions. Skeletons carry accessible loading state.
- **Structure:** landmark regions, logical heading order, skip link on every page.
- **Motion:** `prefers-reduced-motion` honoured throughout. All transitions under 200ms.
- **Screen reader:** the application flow is tested end to end with a real screen reader before launch. Not audited - driven.

### Performance budgets

LCP < 2.5s · CLS < 0.1 · INP < 200ms - measured on mid-tier mobile hardware over 4G, not desktop fibre. Images ship responsive, in modern formats, at correct dimensions, lazy below the fold.

### Compliance surface

- Equal Housing Opportunity mark in the footer of **every** page
- No language expressing preference or limitation regarding protected classes, including familial status - audit all copy, including neighbourhood descriptions
- Genuine diversity across all photography
- Screening criteria published and applied consistently - this is what makes the tier-2 track defensible
- Voucher acceptance stated plainly; source-of-income discrimination is prohibited in many jurisdictions
- Accessibility features described factually
- School information links to authoritative sources rather than editorialising - rating prominence carries Fair Housing implications
- **FCRA adverse action notices** - required when declining based on a consumer report, naming the agency and dispute rights. *Absent from the source brief; added here as a required flow.*
- Licence number and jurisdiction displayed **per state** - the nationwide footprint means this is not one licence
- Legal review of all public-facing copy before launch

### Indexation

`noindex, follow` on all listing detail pages - they duplicate higher-authority inventory and will not outrank the source; they exist to convert, not acquire.

Indexed: home, state and city hubs **with live inventory**, qualifications, fees, how-it-works, the three differentiator pages, guides, team, contact.

No attribute-permutation URLs. Filtered views are query-parameter states canonicalised to the hub and excluded from crawling. Sitemap contains only indexable URLs with accurate `lastmod`. Structured data: Organization, LocalBusiness, FAQPage where genuinely applicable - never on noindexed listings.

**Nationwide thinning - resolved in phase 3.** 500+ homes spread across many states averages single-digit inventory per metro. City hubs must clear a live-inventory threshold to enter the sitemap; below it the page still renders for visitors but drops out of the index. Phase 3 sets the threshold.

## Scope

### In scope - phase one (public site)

All 26 routes, locked:

```
Public         /  ·  /how-it-works  ·  /qualifications  ·  /fees
               /team  ·  /contact  ·  /careers  ·  /property-management
Inventory      /homes-for-rent  ·  /homes-for-rent/[address-slug]
               /rentals/[state]  ·  /rentals/[city]
Conversion     /apply  ·  /apply/[step]  ·  /schedule-tour
Differentiator /housing-vouchers  ·  /second-chance-leasing  ·  /self-employed-renters
Content        /guides  ·  /guides/[slug]
Auth           /portal  ·  /login
Legal          /privacy  ·  /terms  ·  /accessibility  ·  /fair-housing
```

Plus the listing-management tooling the manual-entry decision requires: CSV bulk import, multi-photo upload with drag-ordering, batch status changes.

### Deferred to phase two

- **Resident portal functionality** - rent payment, autopay, ledger, maintenance requests, lease documents, renewals. The `/portal` and `/login` routes are built in phase one; the authenticated feature set follows. Residents continue using the existing PM system's tenant portal until the replacement is genuinely better.
- **Internal ops console** - application review queue, 24-hour SLA countdown, tier-2 decision capture, adverse-action generation. The PM system carries the application queue for now.

### Out of scope

- **Automated inventory sync.** Entry is manual by explicit decision, after the drift and cold-start costs were raised and the decision reaffirmed. Consequence recorded below.
- Attribute-permutation pages (`/city/1-bedroom`, `/city/pet-friendly`) - filtered search states only
- Native mobile applications
- Owner-facing portal - `/property-management` is a marketing page, not an application
- Multi-language - English only at launch
- Live chat
- Payment processing on the marketing site - the application fee is the only transaction in phase one

## Open Items

**Content inputs needed** - the brief is written to absorb these without restructuring:

- [ ] States and cities served; **brokerage licence number and jurisdiction per state**
- [ ] Real screening thresholds: income multiple, credit floor, eviction recency cutoff
- [ ] Tier-2 conditions: deposit uplift, co-signer terms, ITIN handling, voucher income treatment
- [ ] Complete fee schedule, every line
- [ ] Team roster: names, roles, markets, contact, photographs
- [ ] Attributable testimonials: name, city, move-in year
- [ ] Screening vendor in use - determines the application's back half and adverse-action production
- [ ] **Which property management system** - parked; does not block phase one, determines how the phase-two portal wraps the existing tenant portal

**Recorded consequences of the manual-entry decision:**

Section 8 of the source brief requires *"never showing a home that cannot be leased."* With manual entry against a 500+ home portfolio turning over 30–40% annually, nothing enforces that rule systematically - it becomes a staffing commitment rather than a system guarantee. Mitigation built in: a `lastVerified` timestamp per listing and a staleness flag surfaced in the admin view, so drift is at least visible to whoever maintains it.

**Residual audit gap:** the PM system almost certainly has no field recording *which tier-2 rule justified a discretionary approval*. Until the ops console exists, that needs a written decision log captured at decision time. It is the audit trail the two-tier model depends on - cheap to keep now, unreconstructable later.
