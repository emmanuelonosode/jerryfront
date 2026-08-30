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

/**
 * Basemaps. Esri's public services: free, keyless, and two of them.
 *
 * WHAT THEY REPLACED. Production pointed at CARTO, which now requires an API
 * key, so every tile came back stamped "API KEY REQUIRED" diagonally across
 * the map. A grey canvas was the first replacement and it was too quiet: on a
 * search page the map is the interface, and a near-blank backdrop gives a
 * renter nothing to place a home against. A street map is what people read
 * addresses on, and satellite is what they use to see whether there is a yard.
 *
 * NOTE THE AXIS ORDER: these services are `{z}/{y}/{x}`, not the usual
 * `{z}/{x}/{y}`. Getting it the normal way round returns a perfectly working
 * map of somewhere else entirely.
 *
 * `NEXT_PUBLIC_MAP_TILE_URL` still overrides both, for the day someone buys a
 * paid host - at which point the toggle collapses to that one style.
 */
export type MapStyle = 'map' | 'satellite';

const ESRI = 'https://server.arcgisonline.com/ArcGIS/rest/services';

const TILE_STYLES: Record<MapStyle, { url: string; attribution: string; labels?: string }> = {
  map: {
    url: `${ESRI}/World_Street_Map/MapServer/tile/{z}/{y}/{x}`,
    attribution:
      'Tiles &copy; Esri &mdash; Esri, HERE, Garmin, &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  },
  satellite: {
    url: `${ESRI}/World_Imagery/MapServer/tile/{z}/{y}/{x}`,
    // Imagery alone has no place names, so a renter cannot tell which suburb
    // they are looking at. The reference layer puts boundaries and labels back
    // over the photography.
    labels: `${ESRI}/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}`,
    attribution:
      'Imagery &copy; Esri &mdash; Esri, Maxar, Earthstar Geographics, and the GIS User Community',
  },
};

const DEFAULT_TILE_URL = TILE_STYLES.map.url;
const DEFAULT_ATTRIBUTION = TILE_STYLES.map.attribution;

const TILE_URL = process.env.NEXT_PUBLIC_MAP_TILE_URL || DEFAULT_TILE_URL;
/**
 * A provider-supplied dark style needs no filtering. Set this alongside a dark
 * tile URL so the CSS dimming is skipped rather than applied twice.
 */
const RAW_TILES = process.env.NEXT_PUBLIC_MAP_TILES_ARE_THEMED === 'true';
/**
 * Attribution, as markup.
 *
 * Tile hosts require a specific line with working links - CARTO's terms and
 * the OSM licence both do - so this value is HTML. It was rendered as a text
 * node, which printed the tags and the entities to the page verbatim under the
 * map instead of a sentence with two links in it.
 *
 * The backslash strip is the other half of the same bug. dotenv removes the
 * quotes wrapping a value but does NOT unescape `\"` inside them, so an
 * attribution written the way a shell string is written arrives with its
 * backslashes intact and every href in it broken. Stripping here means the
 * component survives either quoting style rather than depending on whoever
 * edits `.env.local` next knowing the difference.
 */
const ATTRIBUTION = (process.env.NEXT_PUBLIC_MAP_ATTRIBUTION || DEFAULT_ATTRIBUTION)
  .replace(/\\(["'])/g, '$1');

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

/**
 * Hosts the `{s}` placeholder cycles through.
 *
 * Picked from the tile's own coordinates rather than at random, so a given
 * tile always resolves to the same host. A random pick re-points the same
 * tile at a different origin on every render, which misses the browser cache
 * every time and opens connections to four hosts instead of one.
 */
const TILE_SUBDOMAINS = ['a', 'b', 'c', 'd'];

/**
 * Fills every placeholder a tile template can carry.
 *
 * `{s}` and `{r}` are substituted as well as `{z}/{x}/{y}` because tile hosts
 * document their URLs in the Leaflet template dialect - that is the string
 * anyone setting NEXT_PUBLIC_MAP_TILE_URL will paste, and the configured CARTO
 * URL is exactly that shape. Leaving them unhandled does not degrade
 * gracefully: it emits `https://{s}.basemaps.cartocdn.com/.../54622{r}.png`, a
 * hostname that cannot resolve, so every tile fails and the Location section
 * renders as an empty grid with a pin floating on it. That is what shipped.
 *
 * `{r}` resolves to '' rather than '@2x'. These are plain server-rendered
 * <img> tags with no knowledge of the visitor's device pixel ratio, and a
 * retina tile is ~2.3x the bytes on a locator map this component deliberately
 * kept cheap. A deployment that wants them can put a literal @2x in the URL.
 */
function tileUrl(template: string, z: number, x: number, y: number): string {
  return template
    .replace('{s}', TILE_SUBDOMAINS[(x + y) % TILE_SUBDOMAINS.length])
    .replace('{r}', '')
    .replace('{z}', String(z))
    .replace('{x}', String(x))
    .replace('{y}', String(y));
}

/**
 * The tiles covering a viewport.
 *
 * Zoom is floored to an integer because tiles only exist at whole zoom levels;
 * the fractional part becomes a CSS scale so the basemap tracks the markers
 * exactly rather than drifting a few pixels at intermediate zooms - a drift
 * that puts the pin on the wrong street.
 */
export function tilesFor(view: TileView, template: string = DEFAULT_TILE_URL) {
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
        src: tileUrl(template, z, wrappedX, y),
        left: x * TILE_SIZE - (cxAtZ - halfW),
        top: y * TILE_SIZE - (cyAtZ - halfH),
      });
    }
  }
  return { tiles, scale };
}

export function TileLayer({ view, style = 'map' }: { view: TileView; style?: MapStyle }) {
  if (!view.width || !view.height) return null;

  // A configured host wins over both built-in styles: someone who has paid for
  // tiles gets those, and the toggle stops being meaningful.
  const chosen = TILE_STYLES[style];
  const baseUrl = process.env.NEXT_PUBLIC_MAP_TILE_URL || chosen.url;
  const attribution = (
    process.env.NEXT_PUBLIC_MAP_ATTRIBUTION || chosen.attribution
  ).replace(/\\(["'])/g, '$1');

  const { tiles, scale } = tilesFor(view, baseUrl);
  const labelTiles = chosen.labels && !process.env.NEXT_PUBLIC_MAP_TILE_URL
    ? tilesFor(view, chosen.labels).tiles
    : null;

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

      {/* Place names over the photography. Satellite alone cannot tell a
          renter which suburb they are looking at. */}
      {labelTiles ? (
        <div className={styles.layer} aria-hidden style={{ transform: `scale(${scale})` }}>
          {labelTiles.map((tile) => (
            /* eslint-disable-next-line @next/next/no-img-element -- see above */
            <img
              key={`label-${tile.key}`}
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
      ) : null}

      {/* dangerouslySetInnerHTML is safe here in the way it is rarely safe: this
          is a NEXT_PUBLIC_ build-time constant, inlined into the bundle from a
          file only someone who can already deploy can edit. It is code, not
          input, and the tile licence requires the links it contains. */}
      <p
        className={styles.attribution}
        dangerouslySetInnerHTML={{ __html: attribution }}
      />
    </>
  );
}
