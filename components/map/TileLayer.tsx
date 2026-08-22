import styles from './TileLayer.module.css';

/**
 * Raster basemap tiles behind the markers.
 *
 * WHY A TILE LAYER AT ALL. The map spike deliberately shipped vendor-neutral
 * DOM markers with no basemap, so any renderer could go underneath later. That
 * was the right call for the spike and the wrong thing to ship: a pin floating
 * on an empty grey box tells a renter nothing about where the home is, which is
 * the only question the section exists to answer.
 *
 * WHY PLAIN <img> TILES RATHER THAN A MAPPING LIBRARY. Leaflet or MapLibre is
 * 40-150KB of JavaScript to draw a static, non-panning locator map, on a page
 * measured on a mid-tier phone over 4G. The markers, keyboard model and
 * clustering already exist; all that is missing is the picture underneath, and
 * that is a grid of images.
 *
 * THE TILE SOURCE IS CONFIGURABLE AND ATTRIBUTED. OpenStreetMap's public tiles
 * are the default so this works out of the box, but their usage policy is not
 * built for production traffic - set NEXT_PUBLIC_MAP_TILE_URL to a paid host
 * before launch. Attribution is not optional and is rendered, not buried.
 */

const DEFAULT_TILE_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const DEFAULT_ATTRIBUTION = '© OpenStreetMap contributors';

const TILE_URL = process.env.NEXT_PUBLIC_MAP_TILE_URL || DEFAULT_TILE_URL;
/**
 * A provider-supplied dark style needs no filtering. Set this alongside a dark
 * tile URL so the CSS dimming is skipped rather than applied twice.
 */
const RAW_TILES = process.env.NEXT_PUBLIC_MAP_TILES_ARE_THEMED === 'true';
const ATTRIBUTION = process.env.NEXT_PUBLIC_MAP_ATTRIBUTION || DEFAULT_ATTRIBUTION;

export const TILE_SIZE = 256;

/**
 * The map's own viewport shape, reused verbatim.
 *
 * `cx`/`cy` are normalised Mercator (0..1) and `scale` is the world size in
 * pixels - the same values the markers are positioned from. Converting to some
 * other representation here is how a basemap ends up a few pixels out of step
 * with its pins, which puts the home on the wrong street.
 */
export type TileView = {
  cx: number;
  cy: number;
  scale: number;
  width: number;
  height: number;
};

function tileUrl(z: number, x: number, y: number): string {
  return TILE_URL.replace('{z}', String(z)).replace('{x}', String(x)).replace('{y}', String(y));
}

/**
 * The tiles covering a viewport.
 *
 * Zoom is floored to an integer because tiles only exist at whole zoom levels;
 * the fractional part becomes a CSS scale so the basemap tracks the markers
 * exactly rather than drifting a few pixels at intermediate zooms - a drift
 * that puts the pin on the wrong street.
 */
export function tilesFor(view: TileView) {
  const zoom = Math.log2(view.scale / TILE_SIZE);
  const z = Math.max(0, Math.min(19, Math.floor(zoom)));
  // Fractional zoom becomes a CSS scale, so the basemap tracks the markers
  // exactly at intermediate zooms instead of drifting.
  const scale = 2 ** (zoom - z);
  const worldTiles = 2 ** z;
  const worldPx = TILE_SIZE * worldTiles;

  // Viewport bounds in world pixels at the integer zoom.
  const cxAtZ = view.cx * worldPx;
  const cyAtZ = view.cy * worldPx;
  const halfW = view.width / 2 / scale;
  const halfH = view.height / 2 / scale;

  const minX = Math.floor((cxAtZ - halfW) / TILE_SIZE);
  const maxX = Math.floor((cxAtZ + halfW) / TILE_SIZE);
  const minY = Math.floor((cyAtZ - halfH) / TILE_SIZE);
  const maxY = Math.floor((cyAtZ + halfH) / TILE_SIZE);

  const tiles: { key: string; src: string; left: number; top: number }[] = [];
  for (let x = minX; x <= maxX; x += 1) {
    for (let y = minY; y <= maxY; y += 1) {
      // Y outside the world has no tile; X wraps around the antimeridian.
      if (y < 0 || y >= worldTiles) continue;
      const wrappedX = ((x % worldTiles) + worldTiles) % worldTiles;
      tiles.push({
        key: `${z}/${x}/${y}`,
        src: tileUrl(z, wrappedX, y),
        left: x * TILE_SIZE - (cxAtZ - halfW),
        top: y * TILE_SIZE - (cyAtZ - halfH),
      });
    }
  }
  return { tiles, scale };
}

export function TileLayer({ view }: { view: TileView }) {
  if (!view.width || !view.height) return null;
  const { tiles, scale } = tilesFor(view);

  return (
    <>
      {/* aria-hidden: the tiles are decoration. The map's accessible name, the
          marker labels and the address text carry the meaning - a screen
          reader announcing 30 images called "tile" would be noise. */}
      <div
        className={`${styles.layer}${RAW_TILES ? ` ${styles.rawTiles}` : ''}`}
        aria-hidden
        style={{ transform: `scale(${scale})` }}
      >
        {tiles.map((tile) => (
          /* eslint-disable-next-line @next/next/no-img-element --
             Map tiles are fixed 256px raster from a third-party tile server.
             next/image would proxy and re-encode every one on every pan, which
             is strictly more work for an identical result. */
          <img
            key={tile.key}
            src={tile.src}
            alt=""
            width={TILE_SIZE}
            height={TILE_SIZE}
            loading="lazy"
            decoding="async"
            className={styles.tile}
            style={{ left: tile.left, top: tile.top }}
          />
        ))}
      </div>
      <p className={styles.attribution}>{ATTRIBUTION}</p>
    </>
  );
}
