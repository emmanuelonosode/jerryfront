'use client';

import { useMemo, useState } from 'react';
import { AccessibleMap, type MapItem } from '@/components/map/AccessibleMap';
import { PropertyCard } from '@/components/listings/PropertyCard';
import { formatUsd } from '@/lib/money';
import { computeBreakdown } from '@/lib/pricing';
import { AVAILABILITY_LABEL } from '@/lib/listings/types';
import { isSearchable } from '@/lib/listings/lifecycle';
import { SAMPLE_LISTINGS } from '@/lib/fixtures/homes';
import styles from './map.module.css';

export function MapSpike() {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Only homes someone could actually act on. A map pin for a leased home is
  // the "never show a home that cannot be leased" failure in visual form.
  const homes = useMemo(() => SAMPLE_LISTINGS.filter(isSearchable), []);

  const items = useMemo<MapItem[]>(
    () =>
      homes.map((home) => {
        const total = computeBreakdown(home.pricing).totalMonthlyMaxCents;
        return {
          id: home.id,
          lat: home.lat,
          lng: home.lng,
          pin: formatUsd(Math.round(total / 100000) * 1000),
          // The accessible name carries everything a sighted user gets from the
          // pin plus its surroundings.
          label: `${formatUsd(total)} per month total. ${home.beds} bed, ${home.baths} bath, ${home.sqft} square feet. ${home.addressLine}, ${home.city}, ${home.state}. ${AVAILABILITY_LABEL[home.availability]}.`,
        };
      }),
    [homes],
  );

  const selected = homes.find((h) => h.id === selectedId) ?? null;

  return (
    <div className={styles.split}>
      <div className={styles.mapColumn}>
        <AccessibleMap
          items={items}
          activeId={activeId}
          selectedId={selectedId}
          onActiveChange={setActiveId}
          onSelect={setSelectedId}
        />
        <div className={styles.selection} role="status" aria-live="polite">
          {selected ? (
            <p>
              Selected: <strong>{selected.addressLine}</strong>, {selected.city}
            </p>
          ) : (
            <p className={styles.muted}>No home selected.</p>
          )}
        </div>
      </div>

      <div className={styles.listColumn}>
        <h2 className={styles.listTitle} id="results-heading">
          {homes.length} homes
        </h2>
        {/*
          The list is the primary interface, not a fallback. It is fully
          keyboard operable on its own, so someone who never touches the map
          loses nothing - the map adds spatial understanding on top of a
          complete experience rather than being a second-class path beside it.
        */}
        <ul className={styles.list} role="list" aria-labelledby="results-heading">
          {homes.map((home) => (
            <li key={home.id} onMouseEnter={() => setActiveId(home.id)} onMouseLeave={() => setActiveId(null)}>
              <PropertyCard listing={home} density="compact" active={activeId === home.id} />
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
