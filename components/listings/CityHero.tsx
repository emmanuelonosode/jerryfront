import Link from 'next/link';
import styles from './CityHero.module.css';

/**
 * The top of a city page.
 *
 * WHAT IT REPLACES. A text header on a white page: eyebrow, heading, one
 * sentence. Correct, and completely unpersuasive on the page that receives
 * every "houses for rent in <city>" search we win. Somebody arriving from
 * that query is deciding in about two seconds whether this is a real letting
 * business with real houses, and a wall of grey text is not the evidence.
 *
 * THE PHOTOGRAPH IS A HOME WE ACTUALLY LIST IN THIS CITY. Not stock, not a
 * skyline, not an illustration - the lead exterior of a real property from
 * this market, which is the one image on the page that is both attractive and
 * true. It is served through our own image proxy, so the URL is on our
 * domain, which is what makes it eligible to be indexed as ours rather than
 * as a partner's.
 *
 * LEGIBILITY IS NOT LEFT TO THE PHOTOGRAPH. Text over an arbitrary image is
 * a contrast bug waiting for the one listing shot with a white sky in it, so
 * the overlay is opaque enough to guarantee the ratio regardless of what is
 * underneath, and the type sits on the darkest part of it.
 *
 * THE SEARCH IS A PLAIN GET FORM. No JavaScript, no client state, and no
 * `searchParams` read in the page - which matters more than it sounds:
 * reading search params would opt this route out of the static cache and
 * undo the revalidate window that got these pages crawled in the first place.
 * It posts to the full search tool with the city already applied, so a
 * renter who types a ZIP or a street lands in a scoped search with the map
 * rather than back at the national catalogue.
 */

type Props = {
  city: string;
  state: string;
  stateSlug: string;
  /** Lead photo of a real home in this market. Empty renders the plain field. */
  imageUrl: string;
  imageAlt: string;
  headline: string;
  lead: string;
  /** Short factual stats, each already formatted. */
  facts: { label: string; value: string }[];
};

export function CityHero({
  city,
  state,
  stateSlug,
  imageUrl,
  imageAlt,
  headline,
  lead,
  facts,
}: Props) {
  return (
    <header className={styles.hero}>
      {imageUrl ? (
        <div className={styles.media}>
          {/*
            A plain <img>, matching PropertyCard: the feed already serves
            correctly sized images through the proxy, and next/image would
            re-encode every one of them on a route that renders per city.

            `fetchpriority="high"` because this IS the Largest Contentful
            Paint on the page - it is the whole top of the viewport - and
            leaving the browser to discover that costs the metric Google
            actually ranks on.
          */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            className={styles.image}
            src={imageUrl}
            alt={imageAlt}
            width={1600}
            height={900}
            fetchPriority="high"
            decoding="async"
          />
          <div className={styles.scrim} aria-hidden />
        </div>
      ) : null}

      <div className={styles.inner}>
        <nav className={styles.breadcrumb} aria-label="Breadcrumb">
          <ol className={styles.breadcrumbList} role="list">
            <li>
              <Link href="/homes-for-rent">All homes</Link>
            </li>
            <li aria-hidden="true">/</li>
            <li>
              <Link href={`/rentals/${stateSlug}`}>{state}</Link>
            </li>
            <li aria-hidden="true">/</li>
            <li aria-current="page">{city}</li>
          </ol>
        </nav>

        <h1 className={styles.title}>{headline}</h1>
        <p className={styles.lead}>{lead}</p>

        {facts.length > 0 ? (
          <dl className={styles.facts}>
            {facts.map((fact) => (
              <div key={fact.label} className={styles.fact}>
                <dt className={styles.factLabel}>{fact.label}</dt>
                <dd className={styles.factValue}>{fact.value}</dd>
              </div>
            ))}
          </dl>
        ) : null}

        {/*
          `action` is the search page and the city travels as a hidden field,
          so the query is scoped to this market from the first keystroke a
          renter makes. GET, so the result is a shareable, cacheable URL.
        */}
        <form className={styles.search} action="/homes-for-rent" method="get" role="search">
          <input type="hidden" name="city" value={city} />
          <input type="hidden" name="state" value={state} />
          <label className="visually-hidden" htmlFor="city-hero-q">
            Search homes in {city} by street, ZIP or area
          </label>
          <input
            id="city-hero-q"
            className={styles.searchInput}
            type="search"
            name="q"
            placeholder={`Street, ZIP or area in ${city}`}
            autoComplete="off"
          />
          <button type="submit" className={styles.searchButton}>
            Search {city}
          </button>
        </form>
      </div>
    </header>
  );
}
