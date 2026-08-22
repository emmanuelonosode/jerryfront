import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { csvTemplate, importCsv, parseCsv } from './csv.ts';
import { dollars } from '../money.ts';

const HEADER = 'address,city,state,zip,beds,baths,sqft,rent,availability';
const NOW = new Date('2026-08-16T12:00:00Z');

describe('CSV parsing', () => {
  test('handles quoted fields with embedded commas', () => {
    const rows = parseCsv('a,b\n"1234 Elm St, Apt 2",Memphis');
    assert.deepEqual(rows[1], ['1234 Elm St, Apt 2', 'Memphis']);
  });

  test('handles escaped quotes', () => {
    assert.deepEqual(parseCsv('a\n"He said ""hi"""')[1], ['He said "hi"']);
  });

  test('skips blank lines rather than failing on them', () => {
    // Trailing newlines are what every spreadsheet export produces.
    const rows = parseCsv('a,b\n1,2\n\n\n3,4\n');
    assert.equal(rows.length, 3);
  });

  test('handles CRLF from Windows exports', () => {
    assert.equal(parseCsv('a,b\r\n1,2\r\n').length, 2);
  });
});

describe('import', () => {
  test('imports a valid row', () => {
    const csv = `${HEADER}\n1234 Elm St,Memphis,TN,38104,3,2,1450,1800,available`;
    const { listings, errors } = importCsv(csv, NOW);
    assert.equal(errors.length, 0);
    assert.equal(listings.length, 1);
    assert.equal(listings[0].slug, '1234-elm-st-memphis-tn');
    assert.equal(listings[0].pricing.baseRentCents, dollars(1800));
    assert.equal(listings[0].lastVerifiedAt, NOW.toISOString());
  });

  test('strips currency formatting from rent', () => {
    const csv = `${HEADER}\n1 A St,Memphis,TN,38104,3,2,1450,"$1,800",available`;
    const { listings, errors } = importCsv(csv, NOW);
    assert.equal(errors.length, 0);
    assert.equal(listings[0].pricing.baseRentCents, dollars(1800));
  });

  test('rejects a file with missing required columns, naming them', () => {
    const { errors } = importCsv('address,city\n1 A St,Memphis', NOW);
    assert.equal(errors.length, 1);
    assert.match(errors[0].message, /Missing required columns/);
    assert.match(errors[0].message, /state/);
  });

  test('reports errors per row and column, using spreadsheet row numbers', () => {
    const csv = [
      HEADER,
      '1 A St,Memphis,TN,38104,3,2,1450,1800,available',
      '2 B St,Memphis,Tennessee,38104,3,2,1450,1800,available',
      '3 C St,Memphis,TN,38104,three,2,1450,1800,available',
    ].join('\n');
    const { errors, listings } = importCsv(csv, NOW);

    // Row 3 in the file is the second data row - matching the spreadsheet gutter.
    assert.equal(errors.find((e) => e.column === 'state')?.row, 3);
    assert.equal(errors.find((e) => e.column === 'beds')?.row, 4);
    assert.match(errors.find((e) => e.column === 'beds')!.message, /"three" is not a valid number/);
    // Valid rows still import; bad rows are simply excluded.
    assert.equal(listings.length, 1);
  });

  test('rejects an unrecognised availability, listing the valid values', () => {
    const csv = `${HEADER}\n1 A St,Memphis,TN,38104,3,2,1450,1800,rented`;
    const { errors } = importCsv(csv, NOW);
    assert.match(errors[0].message, /not valid/);
    assert.match(errors[0].message, /application-pending/);
  });

  test('coming-soon without a date is rejected at import, not at publish', () => {
    const csv = `${HEADER}\n1 A St,Memphis,TN,38104,3,2,1450,1800,coming-soon`;
    const { errors, listings } = importCsv(csv, NOW);
    assert.equal(listings.length, 0);
    assert.equal(errors[0].column, 'available_from');
  });

  test('catches duplicate addresses within one file', () => {
    const csv = [
      HEADER,
      '1 A St,Memphis,TN,38104,3,2,1450,1800,available',
      '1 A St,Memphis,TN,38104,3,2,1450,1900,available',
    ].join('\n');
    const { errors, listings } = importCsv(csv, NOW);
    assert.equal(listings.length, 1);
    assert.match(errors[0].message, /Duplicate/);
  });

  test('a home with no photos imports as a draft, with a warning', () => {
    // Blocking the whole import over a missing photo would push someone back
    // to the spreadsheet, which is the failure mode this tool exists to avoid.
    const csv = `${HEADER}\n1 A St,Memphis,TN,38104,3,2,1450,1800,available`;
    const { listings, errors, warnings } = importCsv(csv, NOW);
    assert.equal(errors.length, 0);
    assert.equal(listings.length, 1);
    assert.ok(warnings.some((w) => w.column === 'photos'));
  });

  test('parses semicolon-separated lists and photo URLs', () => {
    const csv = [
      `${HEADER},appliances,amenities,photo_urls`,
      '1 A St,Memphis,TN,38104,3,2,1450,1800,available,Refrigerator;Range,Fenced yard;Patio,https://x/1.avif;https://x/2.avif',
    ].join('\n');
    const { listings, warnings } = importCsv(csv, NOW);
    assert.deepEqual(listings[0].appliances, ['Refrigerator', 'Range']);
    assert.deepEqual(listings[0].amenities, ['Fenced yard', 'Patio']);
    assert.equal(listings[0].photos.length, 2);
    assert.equal(listings[0].photos[0].isExterior, true);
    assert.equal(warnings.length, 0);
  });

  test('an empty file says so plainly', () => {
    assert.match(importCsv('', NOW).errors[0].message, /empty/);
  });
});

describe('template', () => {
  test('the template round-trips through the importer cleanly', () => {
    // If the template we hand people does not import, nothing else matters.
    const { errors, listings } = importCsv(csvTemplate(), NOW);
    assert.deepEqual(errors, []);
    assert.equal(listings.length, 1);
    assert.equal(listings[0].city, 'Memphis');
    assert.equal(listings[0].photos.length, 2);
  });
});
