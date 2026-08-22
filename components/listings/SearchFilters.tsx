'use client';

import { useRouter } from 'next/navigation';
import { useRef, useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/Button';
import { Field } from '@/components/ui/Field';
import { Checkbox, Select, TextInput } from '@/components/ui/Controls';
import { useDialogBehavior } from '@/hooks/useDialogBehavior';
import { CloseIcon, SearchIcon } from '@/components/ui/Icons';
import { serialiseFilters, type SearchFilters } from '@/lib/listings/search';
import styles from './SearchFilters.module.css';

const BEDS = [1, 2, 3, 4, 5];
const BATHS = [1, 2, 3];
const PRICES = [1000, 1250, 1500, 1750, 2000, 2500, 3000, 4000];

/** The differentiator filters, as toggle pills in the bar. */
const TOGGLES = [
  { name: 'voucher', label: 'Housing vouchers', checked: (f: SearchFilters) => f.voucher },
  { name: 'accessible', label: 'Accessibility features', checked: (f: SearchFilters) => f.accessible },
  { name: 'pets', label: 'Pets allowed', checked: (f: SearchFilters) => f.pets },
] as const;

/**
 * Preset options plus the value currently in the URL, if it is not already one
 * of them.
 *
 * Without this a select silently falls back to its first option whenever the
 * URL carries a value the presets do not contain - so the filter vanishes from
 * the form while still being applied, and the next submit drops it. That
 * happens routinely here: URLs get shared and hand-edited, and the empty-state
 * relaxation derives its suggestion from real inventory, so it can produce any
 * multiple of fifty.
 */
function optionsWith(presets: number[], current: number | null): number[] {
  if (current === null || presets.includes(current)) return presets;
  return [...presets, current].sort((a, b) => a - b);
}

/**
 * Search filters.
 *
 * A real `<form method="get">` with a submit button. Filters do not apply on
 * change: a page that re-runs a search on every keystroke is unusable on a
 * slow connection, and this audience is disproportionately on constrained
 * mobile data. Explicit submission also means the URL changes once per search
 * rather than eight times, so the back button steps through searches a person
 * actually made.
 *
 * Desktop renders inline; mobile renders a drawer sharing the same behaviour
 * hook as the nav - scroll lock, focus trap, Escape, focus return.
 */
const HOME_TYPE_LABELS: Record<string, string> = {
  'single-family': 'Single-family',
  townhome: 'Townhome',
  condo: 'Condo',
  apartment: 'Apartment',
};

export function SearchFiltersForm({
  filters,
  resultCount,
  activeCount,
}: {
  filters: SearchFilters;
  resultCount: number;
  activeCount: number;
}) {
  const router = useRouter();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useDialogBehavior({
    open: drawerOpen,
    onClose: () => setDrawerOpen(false),
    panelRef,
    triggerRef,
  });

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const next: SearchFilters = {
      q: (data.get('q') as string)?.trim() || null,
      city: (data.get('city') as string)?.trim() || null,
      state: (data.get('state') as string)?.trim() || null,
      minPrice: data.get('minPrice') ? Number(data.get('minPrice')) : null,
      maxPrice: data.get('maxPrice') ? Number(data.get('maxPrice')) : null,
      beds: data.get('beds') ? Number(data.get('beds')) : null,
      baths: data.get('baths') ? Number(data.get('baths')) : null,
      homeType: (data.get('type') as string) || null,
      availableBy: (data.get('available') as string) || null,
      pets: data.get('pets') === '1',
      voucher: data.get('voucher') === '1',
      accessible: data.get('accessible') === '1',
      sort: filters.sort,
      // Any filter change returns to page one. Landing on page 4 of a
      // different result set is disorienting and usually empty.
      page: 1,
    };
    const query = serialiseFilters(next);
    router.push(query ? `/homes-for-rent?${query}` : '/homes-for-rent');
    setDrawerOpen(false);
  }

  /**
   * Navigate with SOME filters changed, keeping the rest.
   *
   * `submit` rebuilds the whole filter set from one form's FormData, which is
   * right for a form that contains every field and wrong for anything that
   * does not: the mobile search box would silently clear the beds, price and
   * pet filters set in the drawer a moment earlier.
   */
  function apply(patch: Partial<SearchFilters>) {
    const query = serialiseFilters({ ...filters, ...patch, page: 1 });
    router.push(query ? `/homes-for-rent?${query}` : '/homes-for-rent');
  }

  /**
   * What is currently narrowing the results, and how to drop each one.
   *
   * A count alone ("Filters 3") tells someone that something is hidden without
   * telling them what, so the way to widen a disappointing result set is to
   * open the drawer and audit six fields. Naming each filter makes removing
   * the wrong one a single tap.
   */
  const chips: { key: string; label: string; clear: Partial<SearchFilters> }[] = [];
  if (filters.q) chips.push({ key: 'q', label: `"${filters.q}"`, clear: { q: null } });
  if (filters.city) chips.push({ key: 'city', label: filters.city, clear: { city: null } });
  if (filters.state) chips.push({ key: 'state', label: filters.state, clear: { state: null } });
  if (filters.minPrice !== null)
    chips.push({ key: 'min', label: `From $${filters.minPrice.toLocaleString('en-US')}`, clear: { minPrice: null } });
  if (filters.maxPrice !== null)
    chips.push({ key: 'max', label: `Up to $${filters.maxPrice.toLocaleString('en-US')}`, clear: { maxPrice: null } });
  if (filters.beds !== null)
    chips.push({ key: 'beds', label: `${filters.beds}+ bed`, clear: { beds: null } });
  if (filters.baths !== null)
    chips.push({ key: 'baths', label: `${filters.baths}+ bath`, clear: { baths: null } });
  if (filters.homeType)
    chips.push({ key: 'type', label: HOME_TYPE_LABELS[filters.homeType] ?? filters.homeType, clear: { homeType: null } });
  if (filters.availableBy)
    chips.push({ key: 'available', label: `By ${filters.availableBy}`, clear: { availableBy: null } });
  if (filters.pets) chips.push({ key: 'pets', label: 'Pets allowed', clear: { pets: false } });
  if (filters.voucher) chips.push({ key: 'voucher', label: 'Vouchers accepted', clear: { voucher: false } });
  if (filters.accessible)
    chips.push({ key: 'accessible', label: 'Accessible', clear: { accessible: false } });

  const fields = (
    <>
      <Field name="city" label="City">
        {(p) => <TextInput {...p} name="city" defaultValue={filters.city ?? ''} placeholder="Any city" />}
      </Field>

      <Field name="state" label="State">
        {(p) => (
          <TextInput
            {...p}
            name="state"
            defaultValue={filters.state ?? ''}
            placeholder="Any"
            maxLength={2}
          />
        )}
      </Field>

      <Field name="minPrice" label="Min monthly" hint="Total cost, including required fees.">
        {(p) => (
          <Select {...p} figure name="minPrice" defaultValue={filters.minPrice ?? ''}>
            <option value="">No minimum</option>
            {optionsWith(PRICES, filters.minPrice).map((v) => (
              <option key={v} value={v}>
                ${v.toLocaleString('en-US')}
              </option>
            ))}
          </Select>
        )}
      </Field>

      <Field name="maxPrice" label="Max monthly">
        {(p) => (
          <Select {...p} figure name="maxPrice" defaultValue={filters.maxPrice ?? ''}>
            <option value="">No maximum</option>
            {optionsWith(PRICES, filters.maxPrice).map((v) => (
              <option key={v} value={v}>
                ${v.toLocaleString('en-US')}
              </option>
            ))}
          </Select>
        )}
      </Field>

      <Field name="beds" label="Bedrooms">
        {(p) => (
          <Select {...p} name="beds" defaultValue={filters.beds ?? ''}>
            <option value="">Any</option>
            {optionsWith(BEDS, filters.beds).map((v) => (
              <option key={v} value={v}>
                {v}+
              </option>
            ))}
          </Select>
        )}
      </Field>

      <Field name="baths" label="Bathrooms">
        {(p) => (
          <Select {...p} name="baths" defaultValue={filters.baths ?? ''}>
            <option value="">Any</option>
            {optionsWith(BATHS, filters.baths).map((v) => (
              <option key={v} value={v}>
                {v}+
              </option>
            ))}
          </Select>
        )}
      </Field>

      {/*
        These sit above home type and availability date, and vouchers leads.

        Ordered by what this company does differently, not by convention. The
        desktop sidebar is a sticky panel that scrolls internally, and measured
        at 1280x860 it fits nine controls: with the conventional ordering the two
        that fell below the scroll were vouchers and accessibility - precisely
        the two no competitor offers, and the two the reassurance strip promises
        on every page. City, state, price, beds and baths are parity features
        every portal has; putting them first and burying the differentiator is
        exactly backwards for the audience this site is built for.

        Vouchers is first within the group for the same reason: a voucher holder
        arrives already expecting to be turned away, and the brief's first job is
        to answer that in fifteen seconds.
      */}
      <div className={styles.toggles}>
        <Checkbox
          id="f-voucher"
          name="voucher"
          value="1"
          label="Accepts housing vouchers"
          defaultChecked={filters.voucher}
        />
        <Checkbox
          id="f-accessible"
          name="accessible"
          value="1"
          label="Accessibility features"
          description="Step-free entry, wide doorways, and similar"
          defaultChecked={filters.accessible}
        />
        <Checkbox id="f-pets" name="pets" value="1" label="Pets allowed" defaultChecked={filters.pets} />
      </div>

      <Field name="type" label="Home type">
        {(p) => (
          <Select {...p} name="type" defaultValue={filters.homeType ?? ''}>
            <option value="">Any</option>
            <option value="single-family">Single-family</option>
            <option value="townhome">Townhome</option>
            <option value="condo">Condo</option>
            <option value="apartment">Apartment</option>
          </Select>
        )}
      </Field>

      <Field name="available" label="Available by">
        {(p) => <TextInput {...p} figure type="date" name="available" defaultValue={filters.availableBy ?? ''} />}
      </Field>
    </>
  );

  return (
    <>
      <div className={styles.mobileBar}>
        {/* Location is the filter almost everyone sets and the only one worth
            a permanent slot on a phone. Behind the drawer it cost two taps to
            reach the thing people came to type. */}
        <form
          className={styles.mobileSearch}
          method="get"
          action="/homes-for-rent"
          onSubmit={(event) => {
            event.preventDefault();
            apply({ q: (new FormData(event.currentTarget).get('q') as string)?.trim() || null });
          }}
        >
          <label className="visually-hidden" htmlFor="mobile-q">
            Search by address, city, or ZIP
          </label>
          <input
            className={styles.mobileInput}
            id="mobile-q"
            name="q"
            type="search"
            enterKeyHint="search"
            autoComplete="address-level2"
            defaultValue={filters.q ?? ''}
            placeholder="Address, city, or ZIP"
          />
          <button className={styles.mobileGo} type="submit">
            <span className="visually-hidden">Search</span>
            <SearchIcon />
          </button>
        </form>

        <button
          ref={triggerRef}
          type="button"
          className={styles.filterButton}
          aria-expanded={drawerOpen}
          onClick={() => setDrawerOpen(true)}
        >
          Filters
          {activeCount > 0 ? <span className={styles.count}>{activeCount}</span> : null}
        </button>
        {/* No count here.

            The results header now sits at the top of the results column at
            every width, so a count beside the Filters button restated the same
            number a few pixels above itself. When there are none, the empty
            state says so in its own heading. `resultCount` is still used - the
            drawer's submit button reads "Show N homes". */}
      </div>

      {chips.length > 0 ? (
        <div className={styles.activeChips}>
          <h2 className="visually-hidden">Filters applied</h2>
          <ul className={styles.activeList}>
            {chips.map((chip) => (
              <li key={chip.key}>
                <button
                  type="button"
                  className={styles.activeChip}
                  onClick={() => apply(chip.clear)}
                >
                  <span className={styles.activeChipLabel}>{chip.label}</span>
                  <CloseIcon />
                  <span className="visually-hidden">Remove this filter</span>
                </button>
              </li>
            ))}
          </ul>
          <button type="button" className={styles.clearAll} onClick={() => router.push('/homes-for-rent')}>
            Clear all
          </button>
        </div>
      ) : null}

      {/*
        Desktop: one horizontal bar, not a sidebar column.

        The bar buys the results grid the full width of the page, which is what
        makes a two-up card grid beside a large map possible at all. It costs
        the vertical room the sidebar had, so the controls have to be compact -
        hence the pills, each of which is a real labelled control rather than a
        button that opens a popover. A popover per filter would be four extra
        interactions to set two filters, and it hides the current value behind
        a click, which is the thing a filter bar exists to show.

        Still one <form method="get"> with an explicit submit. Filters do not
        apply on change; see the note on the component.
      */}
      <form className={styles.bar} method="get" action="/homes-for-rent" onSubmit={submit}>
        <div className={styles.searchRow}>
          <div className={styles.searchField}>
            <label className="visually-hidden" htmlFor="bar-q">
              Search by address, city, or ZIP
            </label>
            <input
              className={styles.searchInput}
              id="bar-q"
              name="q"
              type="search"
              enterKeyHint="search"
              defaultValue={filters.q ?? ''}
              placeholder="Try an address, a street, a ZIP, or a city"
            />
          </div>
          <Button type="submit">Search</Button>
        </div>

        <div className={styles.chipRow}>
          {/* A fieldset, because "min" and "max" are meaningless apart - a
              screen reader reading either select alone gets a bare number. */}
          <fieldset className={`${styles.chip} ${styles.chipWide}`}>
            <legend className={styles.chipLabel}>Monthly cost</legend>
            <div className={styles.chipControls}>
              <select
                className={styles.chipSelect}
                name="minPrice"
                defaultValue={filters.minPrice ?? ''}
                aria-label="Minimum monthly cost"
              >
                <option value="">No min</option>
                {optionsWith(PRICES, filters.minPrice).map((v) => (
                  <option key={v} value={v}>
                    ${v.toLocaleString('en-US')}
                  </option>
                ))}
              </select>
              <span className={styles.chipDash} aria-hidden="true">
                –
              </span>
              <select
                className={styles.chipSelect}
                name="maxPrice"
                defaultValue={filters.maxPrice ?? ''}
                aria-label="Maximum monthly cost"
              >
                <option value="">No max</option>
                {optionsWith(PRICES, filters.maxPrice).map((v) => (
                  <option key={v} value={v}>
                    ${v.toLocaleString('en-US')}
                  </option>
                ))}
              </select>
            </div>
          </fieldset>

          <div className={styles.chip}>
            <label className={styles.chipLabel} htmlFor="bar-beds">
              Beds
            </label>
            <select
              className={styles.chipSelect}
              id="bar-beds"
              name="beds"
              defaultValue={filters.beds ?? ''}
            >
              <option value="">Any</option>
              {optionsWith(BEDS, filters.beds).map((v) => (
                <option key={v} value={v}>
                  {v}+
                </option>
              ))}
            </select>
          </div>

          <div className={styles.chip}>
            <label className={styles.chipLabel} htmlFor="bar-baths">
              Baths
            </label>
            <select
              className={styles.chipSelect}
              id="bar-baths"
              name="baths"
              defaultValue={filters.baths ?? ''}
            >
              <option value="">Any</option>
              {optionsWith(BATHS, filters.baths).map((v) => (
                <option key={v} value={v}>
                  {v}+
                </option>
              ))}
            </select>
          </div>

          <div className={styles.chip}>
            <label className={styles.chipLabel} htmlFor="bar-type">
              Type
            </label>
            <select
              className={styles.chipSelect}
              id="bar-type"
              name="type"
              defaultValue={filters.homeType ?? ''}
            >
              <option value="">Any</option>
              <option value="single-family">Single-family</option>
              <option value="townhome">Townhome</option>
              <option value="condo">Condo</option>
              <option value="apartment">Apartment</option>
            </select>
          </div>

          <div className={styles.chip}>
            <label className={styles.chipLabel} htmlFor="bar-available">
              Available by
            </label>
            <input
              className={`${styles.chipSelect} ${styles.chipDate}`}
              id="bar-available"
              type="date"
              name="available"
              defaultValue={filters.availableBy ?? ''}
            />
          </div>

          <div className={styles.chip}>
            <label className={styles.chipLabel} htmlFor="bar-state">
              State
            </label>
            <input
              className={`${styles.chipSelect} ${styles.chipState}`}
              id="bar-state"
              type="text"
              name="state"
              maxLength={2}
              placeholder="Any"
              defaultValue={filters.state ?? ''}
            />
          </div>

          {/*
            The three that matter most, kept in the bar rather than behind a
            "more filters" control.

            Ordered by what this company does differently. Vouchers leads: a
            voucher holder arrives already expecting to be turned away, and the
            brief's first job is to answer that in fifteen seconds. Hiding it
            behind a disclosure would bury the one filter no competitor offers.
          */}
          {TOGGLES.map((toggle) => (
            <label key={toggle.name} className={styles.toggleChip}>
              <input
                className={styles.toggleInput}
                type="checkbox"
                name={toggle.name}
                value="1"
                defaultChecked={toggle.checked(filters)}
              />
              <span className={styles.toggleBody}>{toggle.label}</span>
            </label>
          ))}

          {activeCount > 0 ? (
            <button
              type="button"
              className={styles.clear}
              onClick={() => router.push('/homes-for-rent')}
            >
              Clear all
            </button>
          ) : null}
        </div>
      </form>

      {drawerOpen ? (
        <div className={styles.overlay}>
          <div className={styles.backdrop} onClick={() => setDrawerOpen(false)} aria-hidden="true" />
          <div
            className={styles.drawer}
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label="Filter homes"
          >
            <div className={styles.drawerHeader}>
              <h2 className={styles.drawerTitle}>Filters</h2>
              <button type="button" className={styles.close} onClick={() => setDrawerOpen(false)}>
                <CloseIcon />
                <span className="visually-hidden">Close filters</span>
              </button>
            </div>

            <form className={styles.drawerForm} method="get" action="/homes-for-rent" onSubmit={submit}>
              <div className={styles.drawerFields}>{fields}</div>
              <div className={styles.drawerActions}>
                {activeCount > 0 ? (
                  <Button variant="secondary" type="button" onClick={() => router.push('/homes-for-rent')}>
                    Clear all
                  </Button>
                ) : null}
                <Button type="submit" size="lg" fullWidth>
                  Show {resultCount} homes
                </Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
