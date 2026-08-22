# Information Architecture: Skelton Realty Group

**Feature slug:** `skelton-rental-platform`
**Phase:** 3 of design flow
**Reads from:** `DESIGN_BRIEF.md`
**Last updated:** 2026-08-15

---

## Amendments to the locked route list

Three changes to the 26 locked routes. The first is a correctness fix, not a preference.

### 1. `/rentals/[state]` + `/rentals/[city]` → `/rentals/[state]/[city]`

**These two patterns occupy the same URL slot and cannot coexist.** `/rentals/washington` is unresolvable - Washington is a state and a city. So is `/rentals/new-york`. So is `/rentals/oklahoma`, `/rentals/kansas`, `/rentals/indiana`. With a nationwide footprint this is a certainty, and the failure mode is a router resolving one and silently orphaning the other, or a crawler indexing whichever it hit first.

Nesting the city under its state fixes it permanently and buys three things: unambiguous resolution, genuine breadcrumbs (`Home → Tennessee → Memphis`), and a real parent-child relationship for the hub strategy where the state page aggregates its cities.

### 2. Three implied routes added

The brief specifies these behaviours without giving them addresses:

| Route | Why it must exist |
|---|---|
| `/apply/status/[token]` | The brief requires post-submission status "visible without logging in via a tokenised link." That link needs a destination. |
| `/saved` | Property cards have a save action. Saved homes need somewhere to live. |
| `/alerts` | The empty search state offers alert signup. Alerts need a management surface, and one that works from an email link without a password. |

### 3. Error routes

`/404` and `/500`. A 404 on this site is a trust event - someone followed a link to a home and it is gone. It must offer nearest available alternatives, not a dead end. Same doctrine as the empty search state.

**Everything else in the locked list is unchanged.**

---

## Site Map

```
Home                                    /

Inventory
  Search (map + list)                   /homes-for-rent
  Property detail                       /homes-for-rent/[address-slug]        [noindex, follow]
  State hub                             /rentals/[state]
  City hub                              /rentals/[state]/[city]

Qualify  ── the conversion spine
  Screening criteria                    /qualifications
  Fee schedule                          /fees
  Process and timeline                  /how-it-works
  Housing vouchers                      /housing-vouchers
  Second chance leasing                 /second-chance-leasing
  Self-employed renters                 /self-employed-renters

Convert
  Application entry                     /apply
  Application step                      /apply/[step]                          [noindex]
  Application status                    /apply/status/[token]                  [noindex]
  Tour booking                          /schedule-tour

Prospect utilities
  Saved homes                           /saved                                 [noindex]
  Search alerts                         /alerts                                [noindex]

Company
  Team                                  /team
  Contact                               /contact
  Careers                               /careers
  Owner services                        /property-management

Content
  Guides hub                            /guides
  Guide                                 /guides/[slug]

Resident
  Portal                                /portal                                [noindex]  (phase 2)
  Login                                 /login                                 [noindex]

Legal
  Privacy                               /privacy
  Terms                                 /terms
  Accessibility statement               /accessibility
  Fair housing                          /fair-housing

System
  Not found                             /404
  Error                                 /500
```

**29 routes.** 26 locked + 3 implied, with the state/city nesting correction.

---

## The two-front-door problem, resolved

`/rentals/[state]/[city]` and `/homes-for-rent?city=` both show homes in a city. Left alone they compete for the same query and split their own authority. The split is by **job**, and it is absolute:

| | City hub | Search |
|---|---|---|
| **Job** | Acquire - answer "what is renting in Memphis like, and will they take me?" | Convert - filter inventory to what I can get |
| **Content** | Market context, local process, local contact, state licence, local voucher rules, local FAQ, **plus** a preview grid of live homes | Inventory and filters only |
| **Index** | Yes, if it clears the inventory threshold | Yes, unfiltered only |
| **Canonical** | Self | Always `/homes-for-rent`, from every filtered state |
| **Links** | Into pre-filtered search | Back to the hub via breadcrumb |
| **Growth** | Editorially maintained, one per market | Generated |

The hub is the indexed front door. Search is the tool behind it. A filtered search state is never a landing page and never enters the sitemap.

### City hub inventory threshold

Section 9 requires hubs to have live inventory to be indexed. 500+ homes across a nationwide footprint averages single digits per metro, so the rule:

- **≥ 3 live listings** → indexed, in the sitemap
- **1–2 live listings** → renders for visitors, excluded from the sitemap, `noindex, follow`
- **0 live listings** → renders with nearest-market alternatives and an alert signup, `noindex, follow`, never a 404
- **State hub** → indexed only if at least one of its cities is indexed

The page never disappears - someone with the link always lands somewhere useful. Only its index eligibility moves. Thresholds are evaluated at sitemap generation against live data, so this self-corrects as inventory turns.

**A city hub that clears the threshold but has no genuine local content stays out of the sitemap regardless.** Inventory count is necessary, not sufficient. A templated paragraph with the city name substituted is exactly what section 9 forbids.

---

## Navigation Model

### Primary navigation - 5 items plus one action

```
Find a Home     Do I Qualify? ▾     Fees     How It Works     About ▾        [ Apply ]
```

**"Do I Qualify?" is the most important item in this nav.** It is the positioning, stated as a question the audience is already asking, in the highest-traffic element on the site. It carries a dropdown:

```
Do I Qualify? ▾
  Screening criteria          /qualifications
  ────────────────────────
  Housing vouchers            /housing-vouchers
  Past eviction or credit     /second-chance-leasing
  Self-employed income        /self-employed-renters
```

The three differentiator pages are the acquisition engine. Burying them in a footer - the default fate of pages like these - wastes the entire content strategy. They sit one hover from every page.

```
About ▾
  Our team                    /team
  Contact                     /contact
  For property owners         /property-management
  Careers                     /careers
```

`Apply` is a solid ink button, per the token direction. It is the only button in the header and it is present on every page including the application itself, where it becomes a progress affordance instead.

### Utility navigation

Top-right, above or beside the primary nav, at reduced weight: **Resident Login** (`/portal`), **Saved** (count badge when non-zero). Deliberately quiet - residents know where to look and prospects should not be distracted by an account they do not have.

### Secondary navigation

- **Qualify cluster** - the four qualification pages carry a shared in-page sub-nav so someone reading `/housing-vouchers` can see `/second-chance-leasing` exists. These audiences overlap heavily; a voucher holder often also has thin credit.
- **Guides** - category filter plus related-guide links.
- **Property detail** - in-page section anchors on desktop; the sticky action bar handles mobile.
- **Portal** - its own sidebar, phase 2.

### Mobile navigation

Hamburger drawer, plus a **persistent `Apply` button in the header that never collapses into the drawer**. Primary conversion is never one tap deeper than it needs to be.

**No bottom tab bar.** This is deliberate: property detail and the application both specify a sticky bottom action bar, and a tab bar would sit directly beneath or on top of it. Two competing bottom bars on the highest-value screens is a real conflict, and the action bar wins because it is contextual.

Drawer order mirrors the desktop nav, with the Qualify cluster expanded rather than nested - those pages are too important to hide behind a second tap.

### Depth

**Maximum three levels.** `Home → State → City` is the deepest hierarchy on the public site. Everything else is one or two clicks from the header. `/apply/[step]` is a linear flow, not depth.

---

## Content Hierarchy

### Home `/`

1. **Hero with search** - location, beds, price ceiling. The search input *is* the hero, not decoration beneath a slogan.
2. **Approval reassurance strip** - "Voucher holders welcome · Past eviction? We review individually · Decision in 24 hours." Immediately below the fold, above any listing. This is the differentiator and principle 1 says it precedes inventory.
3. **Available homes** - 6–8 real listings with availability badges and total-cost pricing.
4. **How it works** - four steps with realistic timing.
5. **What we look at** - condensed two-tier criteria, linking to `/qualifications`.
6. **Markets served** - real cities, live inventory counts only.
7. **Meet the team** - real photographs, names, direct contact. Does more anti-scam work than any badge, and it carries most of the warmth the interface itself withholds.
8. **Resident stories** - attributed name, city, move-in year.
9. **Guides** - three most useful pieces.
10. **Footer** - full nav, Equal Housing Opportunity mark, per-state licensing, physical address, contact.

### Search `/homes-for-rent`

1. Filter bar - desktop inline, mobile drawer
2. Result count and sort
3. Results grid ↔ map, bidirectionally linked
4. Pagination or progressive load
5. Approval reassurance strip, repeated below results - someone who scrolled all of it without applying is the exact person who needs it

### Property detail `/homes-for-rent/[address-slug]`

1. Gallery, exterior first
2. Header - address, **total monthly cost**, availability badge, beds/baths/sqft, Apply + Tour
3. **Total monthly cost breakdown** - base rent plus every recurring required fee, itemised
4. **Qualification snapshot** - income multiple, credit guidance, explicit individual-review statement. High placement is deliberate: it is the single biggest reducer of application abandonment.
5. Home details - year built, sqft, parking, laundry, HVAC, flooring, appliances, lot
6. Amenities
7. Pet policy with specific fees
8. Location - map, transit, nearby amenities. School data links out to authoritative sources; never editorialised, never ranked in-page.
9. Lease terms - length, deposit, move-in cost, utilities
10. Similar available homes
11. Sticky mobile action bar throughout

### Qualifications `/qualifications`

Designed as a primary landing page. It will out-earn every listing page in traffic and applications.

1. Plain statement that criteria are published and applied consistently
2. **Tier 1 - standard approval.** Exact thresholds.
3. **Tier 2 - individual review.** Exact conditions: eviction recency, income multiple, deposit uplift, co-signer terms, ITIN, voucher income treatment. Written rules, not vibes.
4. What we check, and what we do not
5. Accepted income documentation, alternative paths named
6. Accepted identification, ITIN explicitly
7. **What happens if you fall short** - the entire proposition
8. FAQ → FAQPage structured data
9. Apply CTA

### City hub `/rentals/[state]/[city]`

1. Market context - genuinely local, genuinely written
2. Live inventory preview → filtered search
3. Local process, local contact, named staff for the market
4. State-specific voucher and source-of-income law
5. State licence number and jurisdiction
6. Local FAQ
7. Nearby markets

### Differentiator pages

Shared template across `/housing-vouchers`, `/second-chance-leasing`, `/self-employed-renters`:

1. Acknowledge the specific difficulty, without condescension
2. How Skelton handles it - concrete, rule-level
3. Required documentation
4. Process and timeline
5. Real objections answered
6. Direct route to apply
7. Cross-links to the other two - these audiences overlap

---

## User Flows

### Flow 1 - Declined-elsewhere renter (the primary flow)

```
1. Lands on /qualifications from search, or / from a referral
2. Reads tier 1 → recognises they do not clear it
   → Under the old model this is where they leave
3. Reads tier 2 → finds their situation named explicitly
4. Follows the matching differentiator page
5. Finds required documentation and timeline
6. → /homes-for-rent, filters to their market and budget
7. Opens a property → qualification snapshot confirms tier 2 applies
8. → /apply
9. Step 0 pre-qualification, BEFORE payment
   ├─ Likely approve      → continue, expectation set
   ├─ Likely tier 2       → continue, extra documentation named up front
   └─ Unlikely            → told honestly, no fee taken,
                            offered alerts + alternative markets
10. Steps 1–5, saving continuously
11. Step 6 - fee, amount already known from /fees and step 0
12. Step 7 - confirmation with a specific decision deadline
13. → /apply/status/[token], no login
14. Uploads documents here, post-submission
15. Decision within 24 hours
    ├─ Approved → lease flow
    └─ Declined → FCRA adverse action notice naming the agency
                  and dispute rights, plus what would change the answer
```

Step 9 is the trust hinge of the entire product. Step 15's declined branch is a legal requirement and was absent from the source brief.

### Flow 2 - Browsing renter checking for a scam

```
1. Lands on a property detail page from an external link
2. Immediate scam-check scan: real address? real photos? named people?
3. → /team - real faces, names, direct contact
4. → Footer - licence number, jurisdiction, physical address
5. → /fees - every charge published before any commitment
6. Returns to the property, now reading it as real
7. → Apply or Schedule tour
```

This flow never touches the home page. **Every page needs to survive being someone's first page** - footer credentials and team access are load-bearing everywhere, not just on `/`.

### Flow 3 - Save and return (no account)

```
1. Saves a home from a card → prompted for email or phone, no password
2. Magic link issued; identity is the token
3. Leaves
4. Returns via link → /saved, populated
5. Alerts offered for the same search
```

### Flow 4 - Abandoned application recovery

```
1. Abandons mid-application (high base rate)
2. Progress persisted against the token identity
3. Resume link by email or SMS
4. Returns to the exact step, data intact
5. Completes
```

### Flow 5 - Empty search

```
1. Filters to zero results
2. Sees: nearest available alternatives, alert signup,
   and "apply anyway so we can match you manually"
3. Converts to a lead rather than a bounce
```

---

## Account Model

Three identities, deliberately unequal in weight.

| Identity | Auth | Scope | Phase |
|---|---|---|---|
| **Prospect** | Passwordless - email or SMS magic link | Saved homes, alerts, application save/resume, application status | 1 |
| **Resident** | Full credentials | `/portal` - payments, maintenance, documents | 2 |
| **Staff** | Full credentials + role | Listing management, bulk import | 1 (minimal) |

**Prospects never create an account.** Requiring registration at the moment of highest anxiety - right when someone is deciding whether to trust you with a fee and an SSN - is a conversion tax paid for nothing. Passwordless also matches the tokenised status link the brief already specifies, so there is one identity mechanism rather than two.

**Security constraints on the token**, since it fronts an application containing sensitive personal data: single-purpose, expiring, revocable, rotated on each use, and never exposing full SSN or uploaded documents in the status view - status and next actions only. `/apply/status/[token]`, `/saved`, and `/alerts` are all `noindex` and `Referrer-Policy: no-referrer` so tokens never leak through referer headers.

**Resident accounts are separate from prospect tokens.** An approved applicant is issued a resident account at lease execution; the prospect token expires. Not an upgrade path - a handoff, because the data retention rules differ.

---

## Naming Conventions

Consistency matters more than usual here: this is a low-literacy-tolerance, high-anxiety audience, and the interface has little warmth of its own. **The words are where the humanity lives.**

| Concept | Label in UI | Notes |
|---|---|---|
| A house | **Home** | Never "property," never "unit," never "asset." People rent homes. Warmer at zero design cost. |
| Inventory record | *listing* | Internal and admin only. Never user-facing. |
| Person renting | **Resident** | Never "tenant." Applies before and after move-in. |
| Applying | **Apply** / **Application** | One verb throughout. Never "submit an inquiry," never "get started." |
| Screening rules | **What we look at** (nav/section), **Screening criteria** (page) | Plain language in navigation, precise language on the page. |
| Tier 2 | **Individual review** | Never "second chance" in UI chrome - it is fine as a page topic and URL, but as a label applied to a person it condescends. |
| Total price | **Total monthly cost** | Always. "Rent" alone never appears as the headline figure. |
| Base rent | **Base rent** | Only ever inside a breakdown, never standalone. |
| Availability | **Available now / Coming soon / Application pending / Leased / Off market** | Exactly five. No synonyms anywhere. |
| Tour | **Schedule a tour** | Never "book a showing." |
| Voucher | **Housing voucher** | Never "Section 8" in UI - legally imprecise and carries stigma. Acceptable in body copy and search-facing headings where renters use the term. |
| Decision window | **Decision in 24 hours** | Never "fast," never "quick." A number is a promise; an adjective is marketing. |

---

## Component Reuse Map

| Component | Used on | Behaviour differences |
|---|---|---|
| Root layout | All | Portal and admin swap the header for their own chrome |
| Header + primary nav | All public | Application steps reduce to logo + progress + save state |
| Footer | All public | Full everywhere - credentials are load-bearing on every page per flow 2. Application steps use a minimal legal-only variant. |
| Approval reassurance strip | `/`, search, city hubs, guides | Compact variant below search results |
| Property card | Home, search, city hub, property detail (similar homes), `/saved` | Three densities: grid, list, compact/map-linked |
| Availability badge | Everywhere a home appears | Five states, icon + label + colour |
| Price display | Everywhere a home appears | Collapsed on cards, expanded breakdown on detail |
| Qualify sub-nav | The four qualification pages | Current page marked |
| FAQ accordion | Qualifications, fees, differentiators, city hubs, how-it-works | Feeds FAQPage structured data only where genuinely applicable |
| CTA band | Most public pages | Apply-primary everywhere except `/property-management`, which is owner-facing |
| Staff card | Team, city hubs, contact | City hubs show only that market's staff |
| Sticky action bar | Property detail, application | Apply/Tour vs Back/Continue |
| Skeleton loaders | Every async surface | Shape matches the content it replaces |
| Empty state | Search, saved, alerts, 404, city hubs with no inventory | Always offers a real next action |

---

## Content Growth Plan

| Area | Growth | Accommodation |
|---|---|---|
| Listings | 500+, 30–40% annual turnover, ~150–200 state changes/year | Search with filters and pagination. Leased homes stay reachable for a defined window, then archive. **Manual entry means growth is staffing-bound, not system-bound** - `lastVerified` staleness flags surface drift in admin. |
| City hubs | One per market, grows with footprint | Threshold rule governs index eligibility automatically. Each needs genuine local content, which is an editorial cost per market and the real limit on expansion. |
| State hubs | Bounded by states served | Aggregates its cities |
| Guides | Steady editorial growth | Category filter, then search past ~30. The main organic engine long term, given listings are noindexed. |
| Team | Grows with headcount | Filterable by market once past ~12 people |
| Testimonials | Grows with residents | Rotate by market; a card without name, city and year cannot render |
| Fees | Rare change, high stakes | Versioned with an effective date. A fee change is a legal event, not a content edit. |
| Criteria | Rare change, very high stakes | Versioned with an effective date, and prior versions retained - an applicant declined under the old rules may need to see them. |

---

## URL Strategy

**Pattern:** lowercase, hyphenated, no trailing slash, no stop words, no dates.

| Route | Pattern | Notes |
|---|---|---|
| Property | `/homes-for-rent/[address-slug]` | `1234-elm-st-memphis-tn`. Stable for the life of the home; never regenerated on price or status change. |
| State | `/rentals/[state]` | Full name, not abbreviation - `/rentals/tennessee` |
| City | `/rentals/[state]/[city]` | `/rentals/tennessee/memphis` |
| Guide | `/guides/[slug]` | Topic only, undated |
| Application | `/apply/[step]` | Named steps, not numbers - `/apply/income`, not `/apply/2`. Steps may reorder; URLs should not break. |
| Status | `/apply/status/[token]` | Opaque token, expiring, rotated on use |

### Query parameters

Search only. `?city=`, `?minPrice=`, `?maxPrice=`, `?beds=`, `?baths=`, `?type=`, `?available=`, `?pets=`, `?voucher=`, `?accessible=`, `?sort=`, `?page=`

**Rules:**
- Every filtered state canonicalises to `/homes-for-rent`
- Filtered states are `noindex, follow`, and excluded in `robots.txt`
- Parameters are alphabetically ordered on write so shared links dedupe
- Filter state survives back-button and page refresh
- **No attribute-permutation paths ever** - `/homes-for-rent/memphis-3-bedroom` must not exist in any form

### Index posture

| Indexed | Not indexed |
|---|---|
| `/`, `/qualifications`, `/fees`, `/how-it-works` | All property detail pages (`noindex, follow`) |
| Three differentiator pages | All filtered search states |
| `/guides`, `/guides/[slug]` | `/apply/*`, `/saved`, `/alerts` |
| `/team`, `/contact`, `/property-management`, `/careers` | `/portal`, `/login` |
| `/homes-for-rent` unfiltered | City hubs below the inventory threshold |
| State and city hubs clearing the threshold | |
| Legal pages | |

Sitemap generated from live data with accurate `lastmod`, containing only indexable URLs, regenerated as inventory turns.

---

## Open Items Carried Forward

- [ ] States and cities served - determines how many state and city hubs actually exist
- [ ] Per-state brokerage licence numbers and jurisdictions - footer and city hubs
- [ ] Tier 1 and tier 2 thresholds - `/qualifications` cannot be written without them
- [ ] Fee schedule - `/fees` and every total-cost breakdown
- [ ] Team roster by market - `/team` and city hub staff assignment
- [ ] Screening vendor - determines adverse-action production in flow 1, step 15
- [ ] Property management system - parked, gates phase 2 portal only
