import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { clusterByGrid, MAX_ZOOM, MIN_ZOOM, viewportForBounds, zoomToScale } from './geo.ts';


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

describe('the whole catalogue fits through the projection', () => {
  /** Nine thousand points scattered across the continental United States. */
  const catalogue = Array.from({ length: 9000 }, (_, i) => ({
    id: String(i),
    lat: 25 + ((i * 7919) % 2400) / 100,
    lng: -125 + ((i * 6271) % 5000) / 100,
  }));

  test('BOUNDS DO NOT BLOW THE ARGUMENT LIMIT', () => {
    // `Math.min(...points)` passes one argument per point. It survives nine
    // thousand and throws RangeError somewhere past it - inside a render,
    // uncaught. The loop has no such ceiling.
    const viewport = viewportForBounds(catalogue, 600, 400);
    assert.ok(Number.isFinite(viewport.scale));
    assert.ok(Number.isFinite(viewport.cx) && Number.isFinite(viewport.cy));
  });

  test('MARKER COUNT IS BOUNDED BY THE VIEWPORT, NOT BY INVENTORY', () => {
    // The point of culling: zoomed to a street, nine thousand homes must not
    // produce nine thousand off-screen buttons. A 600x400 box holds at most
    // (600/64 + 3) * (400/64 + 3) cells once the cull margin is allowed for.
    const fitted = viewportForBounds(catalogue, 600, 400);
    const street = { ...fitted, scale: zoomToScale(15) };
    const clusters = clusterByGrid(catalogue, street, 64);
    assert.ok(clusters.length < 200, `expected a bounded set, got ${clusters.length}`);
  });

  test('a fitted viewport still shows the whole set', () => {
    const fitted = viewportForBounds(catalogue, 600, 400);
    const clusters = clusterByGrid(catalogue, fitted, 64);
    const plotted = clusters.reduce((n, c) => n + c.members.length, 0);
    assert.equal(plotted, catalogue.length);
  });

  test('a point far outside the viewport is culled rather than parked off-screen', () => {
    const vp = { cx: 0.5, cy: 0.5, scale: zoomToScale(10), width: 600, height: 400 };
    const clusters = clusterByGrid(
      [{ id: 'near', lat: 0, lng: 0 }, { id: 'far', lat: 60, lng: 120 }],
      vp,
    );
    assert.deepEqual(clusters.flatMap((c) => c.members.map((m) => m.id)), ['near']);
  });
});
