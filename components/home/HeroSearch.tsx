'use client';

import { useRouter } from 'next/navigation';
import type { FormEvent } from 'react';
import Link from 'next/link';
import { SearchIcon, MapPinIcon } from '@/components/ui/Icons';
import styles from './HeroSearch.module.css';

const BEDROOMS = ['1', '2', '3', '4', '5'];
const MAX_PRICE = [1000, 1250, 1500, 1750, 2000, 2500, 3000, 4000];

const POPULAR_TAGS = [
  { label: 'Housing Vouchers', href: '/housing-vouchers' },
  { label: 'Second Chance Friendly', href: '/second-chance-leasing' },
  { label: 'Under $1,500/mo', href: '/homes-for-rent?maxPrice=1500' },
  { label: '3+ Bedrooms', href: '/homes-for-rent?beds=3' },
];

export function HeroSearch() {
  const router = useRouter();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);

    const params = new URLSearchParams();
    // `q`, not `city`: this field has always offered "Dallas, TX or 75201"
    // while submitting an exact city match, so the ZIP it advertised could
    // never return anything.
    for (const key of ['beds', 'q', 'maxPrice'] as const) {
      const value = data.get(key);
      if (typeof value === 'string' && value.trim() !== '') {
        params.set(key, value.trim());
      }
    }
    params.sort();

    const query = params.toString();
    router.push(query ? `/homes-for-rent?${query}` : '/homes-for-rent');
  }

  return (
    <div className={styles.container}>
      <form
        className={styles.search}
        method="get"
        action="/homes-for-rent"
        onSubmit={handleSubmit}
        aria-label="Search available homes"
      >
        <div className={`${styles.field} ${styles.fieldLocation}`}>
          <label className={styles.label} htmlFor="search-q">
            Address, city, or ZIP
          </label>
          <div className={styles.inputWrapper}>
            <MapPinIcon className={styles.inputIcon} />
            <input
              className={styles.input}
              id="search-q"
              name="q"
              type="search"
              placeholder="e.g. Dallas TX, 75201, or Lake Lucerne Rd"
              enterKeyHint="search"
            />
          </div>
        </div>

        <div className={styles.field}>
          <label className={styles.label} htmlFor="search-beds">
            Bedrooms
          </label>
          <select className={styles.input} id="search-beds" name="beds" defaultValue="">
            <option value="">Any Beds</option>
            {BEDROOMS.map((n) => (
              <option key={n} value={n}>
                {n}+ Beds
              </option>
            ))}
          </select>
        </div>

        <div className={styles.field}>
          <label className={styles.label} htmlFor="search-price">
            Max Total Monthly
          </label>
          <select
            className={`${styles.input} ${styles.inputFigure}`}
            id="search-price"
            name="maxPrice"
            defaultValue=""
          >
            <option value="">Any Price</option>
            {MAX_PRICE.map((p) => (
              <option key={p} value={p}>
                Up to ${p.toLocaleString('en-US')}/mo
              </option>
            ))}
          </select>
        </div>

        <div className={styles.submitWrap}>
          <button className={styles.submit} type="submit">
            <SearchIcon className={styles.searchIcon} />
            <span>Search Homes</span>
          </button>
        </div>
      </form>

      {/* Popular Quick-Search Tags */}
      <div className={styles.popularTagsRow}>
        <span className={styles.popularLabel}>Popular:</span>
        <div className={styles.tagsList}>
          {POPULAR_TAGS.map((tag) => (
            <Link key={tag.label} href={tag.href} className={styles.tagLink}>
              {tag.label}
            </Link>
          ))}
        </div>
      </div>

      <p className={styles.note}>
        <strong>Transparent Pricing:</strong> Every price listed is the total monthly cost - base rent plus required fees.{' '}
        <a href="/qualifications">See what we look at</a> before you apply.
      </p>
    </div>
  );
}
