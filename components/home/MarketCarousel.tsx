'use client';

import { useState, useRef } from 'react';
import Link from 'next/link';
import { ListingImage } from '@/components/listings/ListingImage';
import { ButtonLink } from '@/components/ui/Button';
import { HouseIcon } from '@/components/ui/Icons';
import styles from './MarketCarousel.module.css';
import type { Photo } from '@/lib/listings/types';

export type MarketData = {
  city: string;
  state: string;
  stateSlug: string;
  slug: string;
  liveCount: number;
  photo: Photo | null;
  seed: string;
};

// Map states to general regions for the tabs
const REGIONS: Record<string, string[]> = {
  West: ['CA', 'OR', 'WA', 'NV', 'AZ', 'ID', 'UT', 'NM', 'CO', 'WY', 'MT'],
  South: ['TX', 'OK', 'AR', 'LA', 'MS', 'AL', 'TN', 'KY', 'GA', 'FL', 'SC', 'NC', 'VA', 'WV'],
  Midwest: ['OH', 'IN', 'IL', 'MI', 'WI', 'MN', 'IA', 'MO', 'ND', 'SD', 'NE', 'KS'],
  // Northeast isn't explicitly in the tabs from screenshot, but we'll include a fallback if needed
  Northeast: ['ME', 'NH', 'VT', 'MA', 'RI', 'CT', 'NY', 'NJ', 'PA', 'DE', 'MD'],
};

function getRegionForState(stateCode: string): string {
  for (const [region, states] of Object.entries(REGIONS)) {
    if (states.includes(stateCode)) return region;
  }
  return 'Other';
}

export function MarketCarousel({ markets }: { markets: MarketData[] }) {
  const [activeTab, setActiveTab] = useState('All');
  const scrollRef = useRef<HTMLUListElement>(null);

  // Group markets by region
  const regionSet = new Set<string>();
  markets.forEach(m => {
    const r = getRegionForState(m.state);
    if (r !== 'Other') regionSet.add(r);
  });
  
  // Only show tabs for regions that actually have markets, ensuring the order matches the design
  const availableTabs = ['All', 'West', 'South', 'Midwest'].filter(t => t === 'All' || regionSet.has(t));

  const filteredMarkets = activeTab === 'All' 
    ? markets 
    : markets.filter(m => getRegionForState(m.state) === activeTab);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const scrollAmount = scrollRef.current.clientWidth * 0.8;
      scrollRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  return (
    <section className={styles.section} aria-labelledby="markets-heading">
      <div className={styles.headerRow}>
        <div className={styles.titleArea}>
          <h2 className={styles.title} id="markets-heading">
            You just want to be you. <span className={styles.titleAccent}>We have a home for that.</span>
          </h2>
          <p className={styles.subtitle}>Search homes for rent by region.</p>
        </div>
        
        {availableTabs.length > 1 && (
          <div className={styles.tabs} role="tablist" aria-label="Filter locations by region">
            {availableTabs.map(tab => (
              <button
                key={tab}
                role="tab"
                aria-selected={activeTab === tab}
                className={styles.tab}
                onClick={() => setActiveTab(tab)}
              >
                {tab}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className={styles.carouselContainer}>
        <ul className={styles.carousel} ref={scrollRef} role="list">
          {filteredMarkets.map(market => (
            <li key={`${market.stateSlug}-${market.slug}`} className={styles.cardWrap}>
              <Link className={styles.marketCard} href={`/rentals/${market.stateSlug}/${market.slug}`}>
                <div className={styles.marketMedia} aria-hidden="true">
                  {market.photo ? (
                    <ListingImage
                      className={styles.marketPhoto}
                      src={market.photo.url}
                      alt=""
                      seed={market.seed}
                      width={market.photo.width}
                      height={market.photo.height}
                    />
                  ) : null}
                </div>
                <div className={styles.marketBody}>
                  <span className={styles.marketName}>{market.city}</span>
                  <span className={styles.marketCount}>
                    <HouseIcon className={styles.marketIcon} />
                    <span className={styles.figure}>{market.liveCount}</span> homes
                  </span>
                </div>
              </Link>
            </li>
          ))}
          
          <li className={styles.cardWrap}>
            <div className={styles.ctaCard}>
              <span className={styles.ctaLead}>Not finding what you need?</span>
              <h3 className={styles.ctaTitle}>View the property search map</h3>
              <ButtonLink href="/homes-for-rent" variant="onBrand">
                Go Now
              </ButtonLink>
            </div>
          </li>
        </ul>
      </div>

      <div className={styles.controls} aria-hidden="true">
        <button 
          className={styles.controlButton} 
          onClick={() => scroll('left')}
          aria-label="Scroll left"
        >
          ←
        </button>
        <button 
          className={styles.controlButton} 
          onClick={() => scroll('right')}
          aria-label="Scroll right"
        >
          →
        </button>
      </div>
    </section>
  );
}
