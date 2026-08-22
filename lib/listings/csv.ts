import { dollars } from '../money.ts';
import type { Availability, Listing } from './types.ts';
import { validateListing } from './lifecycle.ts';

/**
 * CSV bulk import.
 *
 * This is the operational bottleneck for the whole launch. Manual entry was an
 * explicit decision, and 500+ homes at roughly 30 fields each is not a task
 * anyone completes through a web form one home at a time. Most of that data
 * already exists in a spreadsheet or a PM system export, so the fastest path
 * into the site is a paste.
 *
 * Two rules shape the design:
 *
 *   Never partially import. A run either produces valid rows or reports what
 *   is wrong with each one. A half-imported batch leaves someone reconciling
 *   two lists by hand, which is worse than importing nothing.
 *
 *   Report by row and column. "Row 47: availability must be one of…" is
 *   actionable in a spreadsheet; "import failed" is not. With hundreds of rows
 *   the quality of the error messages is the feature.
 */

export const REQUIRED_COLUMNS = [
  'address',
  'city',
  'state',
  'zip',
  'beds',
  'baths',
  'sqft',
  'rent',
  'availability',
] as const;

export const OPTIONAL_COLUMNS = [
  'available_from',
  'year_built',
  'home_type',
  'lat',
  'lng',
  'parking',
  'laundry',
  'hvac',
  'flooring',
  'appliances',
  'amenities',
  'accessibility',
  'pets_allowed',
  'photo_urls',
] as const;

export type RowError = { row: number; column: string; message: string };

export type ImportResult = {
  listings: Listing[];
  errors: RowError[];
  /** Rows that parsed but would not publish - surfaced as warnings, not blockers. */
  warnings: RowError[];
};

/** Minimal RFC 4180 parser: handles quoted fields, embedded commas, and escaped quotes. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];

    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') inQuotes = true;
    else if (char === ',') {
      row.push(field);
      field = '';
    } else if (char === '\n' || char === '\r') {
      if (char === '\r' && text[i + 1] === '\n') i += 1;
      row.push(field);
      // Skip blank lines rather than emitting an empty row that then fails
      // validation with a confusing message.
      if (row.some((c) => c.trim() !== '')) rows.push(row);
      row = [];
      field = '';
    } else {
      field += char;
    }
  }

  row.push(field);
  if (row.some((c) => c.trim() !== '')) rows.push(row);

  return rows;
}

const AVAILABILITY_VALUES: Availability[] = [
  'available',
  'coming-soon',
  'application-pending',
  'leased',
  'off-market',
];

function slugify(address: string, city: string, state: string): string {
  return `${address} ${city} ${state}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function splitList(value: string): string[] {
  return value
    .split(/[;|]/)
    .map((v) => v.trim())
    .filter(Boolean);
}

export function importCsv(text: string, now = new Date()): ImportResult {
  const rows = parseCsv(text);
  const errors: RowError[] = [];
  const warnings: RowError[] = [];
  const listings: Listing[] = [];

  if (rows.length === 0) {
    return { listings, errors: [{ row: 0, column: '', message: 'The file is empty.' }], warnings };
  }

  const header = rows[0].map((h) => h.trim().toLowerCase().replace(/\s+/g, '_'));
  const missing = REQUIRED_COLUMNS.filter((c) => !header.includes(c));
  if (missing.length > 0) {
    return {
      listings,
      errors: [
        {
          row: 1,
          column: missing.join(', '),
          message: `Missing required ${missing.length === 1 ? 'column' : 'columns'}: ${missing.join(', ')}. The first row must be a header.`,
        },
      ],
      warnings,
    };
  }

  const index = (name: string) => header.indexOf(name);
  const seenSlugs = new Set<string>();

  for (let r = 1; r < rows.length; r += 1) {
    // 1-based, and the header is row 1 - so this matches what the spreadsheet
    // shows in its own row gutter.
    const rowNumber = r + 1;
    const cells = rows[r];
    const get = (name: string) => (cells[index(name)] ?? '').trim();
    const rowErrors: RowError[] = [];

    const address = get('address');
    const city = get('city');
    const state = get('state').toUpperCase();
    const zip = get('zip');

    if (!address) rowErrors.push({ row: rowNumber, column: 'address', message: 'Address is required.' });
    if (!city) rowErrors.push({ row: rowNumber, column: 'city', message: 'City is required.' });
    if (state.length !== 2) {
      rowErrors.push({ row: rowNumber, column: 'state', message: 'Use the two-letter state code, e.g. TN.' });
    }

    const num = (name: string, { required = true, min = 0 } = {}) => {
      const raw = get(name).replace(/[$,]/g, '');
      if (raw === '') {
        if (required) rowErrors.push({ row: rowNumber, column: name, message: `${name} is required.` });
        return null;
      }
      const value = Number(raw);
      if (!Number.isFinite(value) || value < min) {
        rowErrors.push({ row: rowNumber, column: name, message: `"${get(name)}" is not a valid number.` });
        return null;
      }
      return value;
    };

    const beds = num('beds');
    const baths = num('baths', { min: 0.5 });
    const sqft = num('sqft', { min: 1 });
    const rent = num('rent', { min: 1 });

    const availabilityRaw = get('availability').toLowerCase().replace(/\s+/g, '-');
    const availability = AVAILABILITY_VALUES.includes(availabilityRaw as Availability)
      ? (availabilityRaw as Availability)
      : null;
    if (!availability) {
      rowErrors.push({
        row: rowNumber,
        column: 'availability',
        message: `"${get('availability')}" is not valid. Use one of: ${AVAILABILITY_VALUES.join(', ')}.`,
      });
    }

    const availableFrom = get('available_from') || null;
    if (availability === 'coming-soon' && !availableFrom) {
      rowErrors.push({
        row: rowNumber,
        column: 'available_from',
        message: 'A coming-soon home needs a date. Without one it advertises a home that may not exist.',
      });
    }

    const slug = slugify(address, city, state);
    if (slug && seenSlugs.has(slug)) {
      rowErrors.push({
        row: rowNumber,
        column: 'address',
        message: `Duplicate of an earlier row in this file (${slug}).`,
      });
    }

    if (rowErrors.length > 0) {
      errors.push(...rowErrors);
      continue;
    }

    seenSlugs.add(slug);
    const photoUrls = splitList(get('photo_urls'));

    const listing: Listing = {
      id: slug,
      slug,
      addressLine: address,
      city,
      state,
      postalCode: zip,
      lat: Number(get('lat')) || 0,
      lng: Number(get('lng')) || 0,
      beds: beds!,
      baths: baths!,
      sqft: sqft!,
      yearBuilt: get('year_built') ? Number(get('year_built')) : null,
      homeType: (['single-family', 'townhome', 'condo', 'apartment'].includes(get('home_type'))
        ? get('home_type')
        : 'single-family') as Listing['homeType'],
      parking: get('parking') || null,
      laundry: get('laundry') || null,
      hvac: get('hvac') || null,
      flooring: get('flooring') || null,
      appliances: splitList(get('appliances')),
      amenities: splitList(get('amenities')),
      accessibilityFeatures: splitList(get('accessibility')),
      petsAllowed: !['no', 'false', '0'].includes(get('pets_allowed').toLowerCase()),
      petPolicy: null,
      voucherAccepted: true,
      availability: availability!,
      availableFrom,
      leasedAt: availability === 'leased' ? now.toISOString() : null,
      tour3dUrl: null,
      tourVideoUrl: null,
      pricing: { baseRentCents: dollars(rent!), fees: [] },
      photos: photoUrls.map((url, i) => ({
        id: `${slug}-${i}`,
        url,
        alt: null,
        isExterior: i === 0,
        width: 1200,
        height: 800,
      })),
      description: null,
      lastVerifiedAt: now.toISOString(),
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    };

    // Publish-readiness is a warning, not an import failure. A home with no
    // photos yet is worth having in the system as a draft - blocking the whole
    // import over it would push someone back to the spreadsheet.
    for (const issue of validateListing(listing)) {
      warnings.push({ row: rowNumber, column: issue.field, message: issue.message });
    }

    listings.push(listing);
  }

  return { listings, errors, warnings };
}

/** Template with the exact header row, so nobody has to guess column names. */
export function csvTemplate(): string {
  const header = [...REQUIRED_COLUMNS, ...OPTIONAL_COLUMNS].join(',');
  const example = [
    '1234 Elm St', 'Memphis', 'TN', '38104', '3', '2', '1450', '1800', 'available',
    '', '1998', 'single-family', '35.1495', '-90.0490',
    'Driveway', 'In unit', 'Central', 'Laminate',
    'Refrigerator;Range;Dishwasher', 'Fenced yard;Covered patio', 'Step-free entry',
    'yes', 'https://example.com/photo-1.avif;https://example.com/photo-2.avif',
  ]
    .map((v) => (v.includes(',') ? `"${v}"` : v))
    .join(',');

  return `${header}\n${example}\n`;
}
