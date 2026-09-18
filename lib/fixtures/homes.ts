import { dollars } from '../money.ts';
import type { Fee } from '../pricing.ts';
import type { Availability, Listing, Photo } from '../listings/types.ts';

/**
 * PLACEHOLDER INVENTORY - NOT REAL HOMES.
 *
 * Deterministic, so clustering, search ordering, and screenshots reproduce
 * exactly between runs. Addresses and coordinates are synthetic; photographs
 * are obvious placeholder plates rather than stock imagery.
 *
 * Real inventory is hand-entered through the admin tooling in I2.
 */
export const PLACEHOLDER_HOMES = false;

export const SAMPLE_LISTINGS: Listing[] = [];

export function findListing(slug: string): Listing | undefined {
  return undefined;
}
