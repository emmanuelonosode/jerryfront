/**
 * Geographic projection and clustering.
 *
 * Deliberately vendor-neutral. The accessibility risk in a map/list search is
 * not the tiles - it is whether a keyboard user can reach a pin that a
 * clustering algorithm has hidden inside a group. That problem is identical
 * whether the basemap is Leaflet, MapLibre, or static imagery, because in all
 * three the markers are DOM overlays rather than pixels painted into a canvas.
 *
 * So this spike proves the layer a vendor cannot supply, and leaves the tile
 * decision to I7 where it belongs.
 */

export type LatLng = { lat: number; lng: number };

export type Viewport = {
  /** Centre in normalised world coordinates. */
  cx: number;
  cy: number;
  /** World width in pixels: 2^zoom * 256. */
  scale: number;
  width: number;
  height: number;
};

/** Web Mercator, normalised to the unit square. */
export function project({ lat, lng }: LatLng): { x: number; y: number } {
  const clampedLat = Math.max(-85.05112878, Math.min(85.05112878, lat));
  const radians = (clampedLat * Math.PI) / 180;
  return {
    x: (lng + 180) / 360,
    y: (1 - Math.log(Math.tan(radians) + 1 / Math.cos(radians)) / Math.PI) / 2,
  };
}

export function toScreen(point: LatLng, vp: Viewport): { left: number; top: number } {
  const { x, y } = project(point);
  return {
    left: (x - vp.cx) * vp.scale + vp.width / 2,
    top: (y - vp.cy) * vp.scale + vp.height / 2,
  };
}

export function zoomToScale(zoom: number): number {
  return 2 ** zoom * 256;
}

/**
 * Zoom bounds for a fitted viewport.
 *
 * MAX matters more than it looks. Fitting a SINGLE point gives a span of
 * effectively zero, so the computed scale is astronomical - zoom ~30, far past
 * where any tile exists. That was invisible while the map drew a grid pattern,
 * because a grid looks the same at every zoom; the moment real tiles went
 * behind the markers it became a blank map. 17 is street level, which is as
 * close as a locator map should ever start.
 *
 * MIN keeps a widely-scattered set from zooming out past the whole world.
 */
export const MIN_ZOOM = 2;
export const MAX_ZOOM = 17;

export function viewportForBounds(
  points: LatLng[],
  width: number,
  height: number,
  paddingPx = 56,
): Viewport {
  if (points.length === 0) {
    return { cx: 0.5, cy: 0.5, scale: zoomToScale(2), width, height };
  }

  const projected = points.map(project);
  const minX = Math.min(...projected.map((p) => p.x));
  const maxX = Math.max(...projected.map((p) => p.x));
  const minY = Math.min(...projected.map((p) => p.y));
  const maxY = Math.max(...projected.map((p) => p.y));

  const spanX = Math.max(maxX - minX, 1e-6);
  const spanY = Math.max(maxY - minY, 1e-6);

  const fitted = Math.min(
    (width - paddingPx * 2) / spanX,
    (height - paddingPx * 2) / spanY,
  );
  const scale = Math.max(
    zoomToScale(MIN_ZOOM),
    Math.min(fitted, zoomToScale(MAX_ZOOM)),
  );

  return { cx: (minX + maxX) / 2, cy: (minY + maxY) / 2, scale, width, height };
}

export type Clusterable = LatLng & { id: string };

export type Cluster<T extends Clusterable> = {
  id: string;
  /** Screen position of the cluster centroid. */
  left: number;
  top: number;
  members: T[];
};

/**
 * Grid clustering in screen space.
 *
 * Screen space rather than geographic space on purpose: what matters is
 * whether two pins would visually collide at the current zoom, which is a
 * pixel question. It also means the cluster set is stable for a given
 * viewport - the same input always produces the same groups, which is what
 * makes the keyboard order below deterministic.
 */
export function clusterByGrid<T extends Clusterable>(
  items: T[],
  vp: Viewport,
  cellPx = 64,
): Cluster<T>[] {
  const cells = new Map<string, T[]>();

  for (const item of items) {
    const { left, top } = toScreen(item, vp);
    const key = `${Math.floor(left / cellPx)}:${Math.floor(top / cellPx)}`;
    const bucket = cells.get(key);
    if (bucket) bucket.push(item);
    else cells.set(key, [item]);
  }

  const clusters: Cluster<T>[] = [];
  for (const [key, members] of cells) {
    const positions = members.map((m) => toScreen(m, vp));
    clusters.push({
      id: key,
      left: positions.reduce((s, p) => s + p.left, 0) / positions.length,
      top: positions.reduce((s, p) => s + p.top, 0) / positions.length,
      members,
    });
  }

  // Reading order: top to bottom, then left to right. This is the sequence
  // arrow keys will follow, so it has to be stable and human-predictable -
  // "next" should mean the pin a sighted user would look at next.
  return clusters.sort((a, b) => (a.top - b.top) || (a.left - b.left));
}
