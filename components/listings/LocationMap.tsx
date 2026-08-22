'use client';

import { useState } from 'react';
import { AccessibleMap, type MapItem } from '@/components/map/AccessibleMap';
import { formatUsd } from '@/lib/money';
import styles from './LocationMap.module.css';

/**
 * The home on a map.
 *
 * Reuses the keyboard-navigable map built for search rather than dropping in a
 * static image or a bare vendor embed. A single-pin map still has to be
 * reachable: a sighted mouse user gets the pin, and everyone else gets the
 * address text above it, which is why the address is rendered outside the map
 * rather than only inside the marker.
 *
 * APPROXIMATE BY DESIGN. The pin marks the property, but the surrounding copy
 * says "approximate" because coordinates arrive from a feed and are sometimes
 * the centroid of a market rather than the building - one partner market pin
 * measured 91km from the city it names. Presenting a possibly-wrong point as
 * exact is worse than saying it is a guide.
 */
export function LocationMap({
  lat,
  lng,
  addressLine,
  city,
  state,
  totalMonthlyCents,
}: {
  lat: number;
  lng: number;
  addressLine: string;
  city: string;
  state: string;
  totalMonthlyCents: number;
}) {
  // The map is interactive even with one pin: selecting it is how a keyboard
  // user confirms which marker has focus, and the component announces the
  // label on selection. Wiring real state rather than passing no-ops keeps
  // that behaviour working.
  const [activeId, setActiveId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const items: MapItem[] = [
    {
      id: 'this-home',
      lat,
      lng,
      pin: formatUsd(Math.round(totalMonthlyCents / 10_000) * 10_000),
      label: `${addressLine}, ${city}, ${state}. ${formatUsd(totalMonthlyCents)} per month total.`,
    },
  ];

  return (
    <div className={styles.wrap}>
      <AccessibleMap
        items={items}
        height={320}
        activeId={activeId}
        selectedId={selectedId}
        onActiveChange={setActiveId}
        onSelect={setSelectedId}
      />
      <p className={styles.caption}>
        Pin location is approximate. Exact address is confirmed when your tour is booked.
      </p>
    </div>
  );
}
