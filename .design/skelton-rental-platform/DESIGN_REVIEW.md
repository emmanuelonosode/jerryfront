# Design Review: Skelton Realty Group - Rental Leasing Platform

Reviewed against: `DESIGN_BRIEF.md`
Philosophy: **Civic Plainspoken** - *note: the palette was replaced with the Ticketmaster-inspired system on 2026-08-17, after this review. The findings below are about structure, copy, and behaviour and all still stand; the colour descriptions describe the superseded palette.*
Date: 2026-08-17
Reviewed at: production build (`next build` + `next start`), not dev - dev mode injects a devtools indicator that reads as a stray UI element in a full-page capture, and ships unminified bundles.

## Screenshots Captured

48 captures: 8 pages × 3 breakpoints × light and dark. All in `.design/skelton-rental-platform/screenshots/`.

| Page | Files | What it shows |
|---|---|---|
| Home | `review-home-{mobile-375,tablet-768,desktop-1280}-{light,dark}.png` | Full section order, hero search, reassurance strip |
| Search | `review-search-*` | Split list + map, filter sidebar, pagination |
| Property detail | `review-property-*` | Gallery, cost breakdown, qualification snapshot |
| Qualifications | `review-qualifications-*` | Two-tier criteria, FAQ, income documentation |
| Second chance | `review-second-chance-*` | Differentiator template |
| Pre-qualification | `review-apply-*` | Step 0 form, full mobile flow |
| Fees | `review-fees-*` | Itemised schedule |
| City hub | `review-city-hub-*` | Local content slots |

Captured with `scripts/screenshot.mjs`, which drives Chrome over CDP rather than `--headless --screenshot`, because the latter clamps its window to ~500px and silently returns a crop of a wider layout - which reads as a phantom overflow bug. Every capture asserts `scrollWidth === innerWidth`; **no horizontal overflow at any breakpoint on any page.**

## Summary

The build is a faithful and disciplined execution of the brief - section order on the home page matches the spec exactly, total-cost-first pricing holds on every surface, and the two-tier criteria model is rendered as published structure rather than prose. The aesthetic reads as intended: warm ink on warm paper, rules instead of shadows, and a dark mode that is a genuine warm-dark palette rather than an inversion.

The biggest finding is that **four defects were invisible to a green test suite**, and each was visible the moment I actually looked at a rendered page. Two were straightforwardly wrong output (words fused together, every map pin showing the wrong price). Two were design decisions that quietly inverted the brief's intent (the differentiator filters hidden below a scroll, and the pre-qualification form pre-answering its own questions). A fifth was a false negative in my own accessibility audit that left most of the site's links unmeasured.

All five are fixed. What remains is dominated by inputs the business has not supplied, plus two checks that need a human.

## Must Fix - all fixed during this review

1. **Words fused together by flex layout.** `See all <span>46</span> homes` rendered as **"See all46homes"** on the home page, and "See all9 homes in Memphis" on the city hub. `display: inline-flex` makes each contiguous text run an anonymous flex item and strips that item's leading and trailing whitespace, so both spaces ceased to exist. The HTML was correct, the CSS valid, nothing errored.

   It was invisible to every existing check: the *accessible name* still computed as "See all 46 homes", because the accessibility tree reads the DOM rather than the rendered boxes - so the a11y audit passed it. It was also a regression introduced by S5's touch-target fix, since `min-height: 24px` needs a non-inline display and `inline-flex` is the obvious reach.

   _Fixed:_ `inline-block` + `line-height` gets the same 24px target while leaving text as text. Added `scripts/flex-text-audit.mjs` (`npm run audit:flex-text`) because that combination will recur - **28 routes × 2 widths, now clean**.

2. **Every map pin displayed the wrong price.** `SearchResults.tsx` computed the pin label as `Math.round(total / 100000) * 1000`, where `total` is in **cents**. A $1,211.75 home produced `1000`, handed to a formatter expecting cents: **"$10"**. Every pin on the map read $10 or $20 - on the surface whose only job is comparing prices across a city, on a site whose entire position is that its numbers are the honest ones. See `screenshots/review-search-desktop-light.png` before, `review-search-desktop-dark.png` after (now `$1,200`).

   _Fixed:_ extracted to `pinPriceCents()` in `lib/pricing.ts` - typed `Cents → Cents`, where the units convention that guards this class of error actually lives - plus 3 unit tests. Rounds to the nearest $100, not $1,000, because at these rents thousands collapses most of the catalogue onto two labels and a map of identical pins cannot be compared.

3. **The two differentiator filters were the only two hidden.** The desktop filter sidebar is a sticky panel that scrolls internally. Measured at 1280×860 it fits nine of eleven controls - and the two that fell below the scroll were **housing vouchers** and **accessibility features**: precisely the two no competitor offers, and the two the reassurance strip promises on every page. City, state, price, bedrooms, bathrooms, home type and availability date - every parity feature - were visible.

   _Fixed:_ the toggle group now sits above home type and availability date, and vouchers leads it. Re-measured: vouchers and accessibility visible, the parity refinements fall below instead. That is the correct trade.

4. **The pre-qualification form pre-answered its own questions.** `voucher=no`, `pets=no`, and `issue=none` all shipped `defaultChecked`, and the parse compounded it (`data.get('voucher') === 'yes'` reads absent as "no"). The step exists to give an honest read before anyone pays, and a default answers on the applicant's behalf with the majority case - which is by definition not this audience.

   Both directions do damage. A voucher holder left on "No" has their voucher income uncounted, so their income multiple looks worse than it is and they may be told they are unlikely to qualify when they would - the exact false discouragement the page exists to prevent. Someone with an eviction left on "None of these" is assessed against tier one, told their odds are good, pays the fee, and then meets the truth - the fee-for-a-hopeless-application failure the step exists to prevent. The hint text reads "Answering honestly here helps you" while a default had already answered for them.

   _Fixed:_ no pre-selection anywhere in the form; all three groups `required`; and the dev preview button now calls `reportValidity()` first, since invoking the handler from a click bypasses constraint validation and was a second path to the same bug. Added 2 checks to `verify-prequal.mjs` - the existing 17 all selected radios explicitly, so they would not have caught the defaults returning.

5. **My accessibility audit had an exemption broad enough to cover the thing it was testing.** The touch-target check exempted any `<a>` with an inline display inside a `<p>` **or an `<li>`**, labelled "links inside a sentence". That swept in every navigation list on the site - including the footer's ~30 links at 16px tall - so the audit reported zero touch-target findings while most of the site's links went unmeasured. It also never implemented WCAG 2.5.8's **spacing** exception at all.

   _Fixed:_ the inline exception now tests what the criterion actually says - whether the link's parent contains text outside the link, which a bare `<li><a>Fees</a></li>` does not - and the spacing exception is measured (24px-diameter circles, centre distance). **Verified live rather than assumed: at a 44px bar the same code reports 1,806 occurrences; at 24px, zero.** So the site genuinely conforms, and now demonstrably so.

## Should Fix

1. **Touch targets meet the legal bar but not the platform one.** With the corrected audit: **zero** violations of WCAG 2.5.8's 24px AA requirement. Against the 44px figure in this review's checklist (and Apple HIG's 44pt / Material's 48dp), **57 distinct controls** on mobile fall short across 9 pages, dominated by footer and utility navigation links at 16px tall. They conform via the spacing exception, so this is comfort rather than compliance - but housing is a stressed, one-handed, on-a-phone task, and the brief names mobile-first as a constraint. _Fix: raise footer and utility nav links to a 44px row target._ Deliberately not done unilaterally: it changes footer rhythm across 30 routes and is a visual-design call, not a defect.

2. **`sizes` on card images is currently inert.** `sizes` without `srcset` does nothing - the browser has one candidate, so there is no choice to inform. The markup was commented as "ready for it", which overstated things. _Now documented accurately in `PropertyCard.tsx`._ The real fix is `srcSet` from `buildSrcSet()`, which needs I3's `ImageStore`; emitting a one-entry srcset would change nothing while looking like it had. **This is the 336ms that one route is over the LCP budget by** with realistic photo weight.

3. **The behavioural suites were not reproducible from the repo.** The 12 browser suites backing "280 checks green" lived in a session scratchpad, not the tree - they would have vanished with the session, and nothing committed could re-verify launch-blocking behaviour. _Fixed: moved to `scripts/suites/` with a paced `run-all.sh` (`npm run verify:browser`). All 12 pass, 280 checks._ The pacing is deliberate: run concurrently, each suite's own Chrome competes for CPU, pages miss fixed settle timeouts, and the resulting failures look like real defects.

## Could Improve

1. **The map's keyboard instructions sit as unstyled body text** above the zoom controls in the right rail, wrapping to five narrow lines (`review-search-desktop-light.png`). The content is right and the behaviour is verified - it just reads as a note left in the layout rather than designed affordance. _Suggestion: a bordered help row beneath the map, or a disclosure._

2. **Placeholder plates dominate every capture.** Not a defect, but it means the photography specification in the brief is entirely unexercised - aspect ratio discipline, exterior-first ordering, and the colour-grade standard that makes a mixed-source gallery read as one brand are all unverified. In dark mode the light placeholder plates read as bright rectangles where photographs will sit.

3. **City hub local-content slots are empty.** The brief requires hubs to earn index inclusion with genuinely local content. They are structurally present and unfilled, and this is also the likeliest place for steering language to enter the site - it is where writers reach for shorthand.

## What Works Well

- **Section order on the home page matches the brief exactly**, all ten, including the reassurance strip immediately below the fold where the differentiator belongs.
- **Total-cost-first pricing holds everywhere.** Every card, the search list, and the detail page lead with `/mo total` and itemise `rent + required fees` beneath. No surface shows a base rent alone. This is the practice the brand positions against and it has not leaked in anywhere.
- **The two-tier criteria render as published structure**, not prose - label, threshold, and a plain-language note per row, with tier two given equal visual weight rather than framed as an exception. That structure is what converts discretion into a Fair Housing safe harbour, and it survived contact with the layout.
- **Dark mode is a designed palette, not an inversion.** Warm dark surfaces, badges that stay legible in all five availability states, amber `[TO CONFIRM]` markers still visible against dark.
- **CLS is 0.000 on every route** at every measured scenario - earned by explicit width/height on every image back in I4.
- **Availability badges survive greyscale**: icon plus text label plus colour, never colour alone, which matters more in a near-monochrome palette with no surrounding chroma to disambiguate against.
- **The qualification snapshot is promoted** to fourth on the property detail page rather than ninth as the brief lists it. Better: it is the differentiator, and the success criterion is fifteen seconds to know whether you have a chance.
- **No horizontal overflow anywhere**, asserted mechanically on all 48 captures rather than eyeballed.

## Verification After Changes

| Check | Result |
|---|---|
| `npm test` | 266 passed, 0 failed |
| `npm run lint` | clean |
| `tsc --noEmit` | clean |
| `npm run build` | clean, 47 route entries |
| `npm run verify:browser` | 12 suites, 280 checks, 0 failed |
| `scripts/a11y-audit.mjs` | 120 page loads, 0 findings |
| `scripts/audit:flex-text` | 28 routes × 2 widths, 0 fused |
| `scripts/fair-housing-audit.mjs` | 27 pages, 0 prohibited, statements present |
| `scripts/indexation-audit.mjs` | 57/57 |
| `scripts/launch-gate.mjs` | **16 blockers - correctly failing** |

## Still Blocking Launch

Not design findings - inputs and judgement that cannot be produced here.

1. **16 unpublished business facts** (`npm run launch-gate`): tier-one and tier-two thresholds, the real fee schedule, address, phone, per-state licence numbers, and account details for at least one payment rail. Without the last, no application can be completed at all.
2. **A person with a screen reader** driving the application end to end. Automation cannot judge whether alternative text is useful rather than merely present, whether reading order makes sense, or whether a live region interrupts at a useful moment.
3. **External legal review** of all public-facing copy, explicitly required by the brief.
4. **Real photography** through I3, which also determines whether the LCP budget passes.
