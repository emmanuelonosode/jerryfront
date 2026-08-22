import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { MAX_ZOOM, MIN_ZOOM, viewportForBounds } from './geo.ts';


describe('zoom is bounded', () => {
  test('A SINGLE POINT DOES NOT ZOOM TO INFINITY', () => {
    // One point has no span, so the fitted scale is astronomical - zoom ~30,
    // past where any tile exists. Invisible while the map drew a grid (a grid
    // looks the same at any zoom); a blank map the moment tiles went behind it.
    const viewport = viewportForBounds([{ lat: 35.2271, lng: -80.8431 }], 600, 320);
    const zoom = Math.log2(viewport.scale / 256);
    assert.ok(zoom <= MAX_ZOOM, `expected <= ${MAX_ZOOM}, got ${zoom}`);
    assert.ok(zoom >= MIN_ZOOM);
  });

  test('two very close points are also clamped', () => {
    const viewport = viewportForBounds(
      [{ lat: 35.2271, lng: -80.8431 }, { lat: 35.22711, lng: -80.84311 }], 600, 320,
    );
    assert.ok(Math.log2(viewport.scale / 256) <= MAX_ZOOM);
  });

  test('a scattered set still fits, and does not zoom out past the world', () => {
    const viewport = viewportForBounds(
      [{ lat: 47.6, lng: -122.3 }, { lat: 25.7, lng: -80.1 }], 600, 320,
    );
    const zoom = Math.log2(viewport.scale / 256);
    assert.ok(zoom >= MIN_ZOOM && zoom < MAX_ZOOM);
  });

  test('an empty set is still a valid viewport', () => {
    const viewport = viewportForBounds([], 600, 320);
    assert.ok(Number.isFinite(viewport.scale));
    assert.ok(viewport.scale > 0);
  });
});
