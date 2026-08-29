'use client';

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  clusterByGrid,
  toScreen,
  viewportForBounds,
  zoomToScale,
  type Cluster,
  type Clusterable,
} from '@/lib/geo';
import { TileLayer } from './TileLayer';
import styles from './AccessibleMap.module.css';

export type MapItem = Clusterable & {
  /** Full sentence read to a screen reader when the marker takes focus. */
  label: string;
  /** Short text painted inside the pin. Unused by dots, which carry no text. */
  pin: string;
  /**
   * How much of the home this marker knows about.
   *
   *   result  a home on the current page of results. Drawn as a labelled
   *           price pin, and linked to its card by hover and focus.
   *   dot     a home that matched the search but is not on this page. Drawn
   *           as a plain point: it has coordinates, a price and a slug, and
   *           nothing else was fetched for it.
   *
   * The distinction is what lets the map show a whole catalogue without
   * pretending it has a card's worth of data for every home on it.
   */
  kind?: 'result' | 'dot';
};

type Props = {
  items: MapItem[];
  /**
   * The subset the opening view is framed around. Defaults to everything.
   *
   * WHY THE MAP IS NOT FRAMED ON ALL OF ITS PINS. Once the map carries the
   * whole catalogue, fitting every pin means every search opens zoomed out to
   * the entire country - so a renter who searched one city gets a map of
   * America with their twelve homes as a speck. Framing on the results and
   * drawing the rest as context keeps the opening view about the search, and
   * the wider inventory is one zoom-out away.
   *
   * It also stops the map jumping: the pins arrive after the results do, and
   * a viewport derived from them would re-frame under the reader's cursor.
   */
  fitItems?: MapItem[];
  selectedId: string | null;
  /** Hover or focus moved to this item - drives linkage with the list. */
  onActiveChange: (id: string | null) => void;
  activeId: string | null;
  onSelect: (id: string) => void;
  /**
   * Any CSS length, not just pixels.
   *
   * The projection needs real pixel dimensions, but it already gets them from
   * the ResizeObserver below rather than from this prop - this only sets the
   * box. Allowing a string lets the search page give the map a viewport-height
   * value so it fills the column, without the component having to know
   * anything about the layout it sits in.
   */
  height?: number | string;
};

const MIN_ZOOM = 3;
const MAX_ZOOM = 14;

/**
 * The largest group that expands into individual markers in place.
 *
 * Expansion exists so a keyboard user can reach a home a cluster is hiding.
 * That reasoning holds for a group of eight and breaks for a group of nine
 * hundred: painting nine hundred overlapping buttons into one cell reaches
 * nothing and makes the arrow-key order meaningless. Above the cap the map
 * zooms toward the group instead, which is the same destination by the route
 * that still works - and it is offered to keyboard and pointer alike, so no
 * one is left with a group they cannot open.
 */
const MAX_EXPAND = 24;

/**
 * Marker positions, rounded before they reach the DOM.
 *
 * React's server renderer serialises style numbers at lower precision than the
 * client does, so an unrounded `559.2462245880258` arrives as `559.246` from
 * the server and mismatches on hydration. Two decimals is well past the point
 * of visible difference and makes both sides produce the same string.
 */
const px = (n: number) => `${Math.round(n * 100) / 100}px`;

/**
 * Accessible map marker layer.
 *
 * THE PROBLEM THIS SOLVES
 * Clustering hides pins. A sighted user zooms in to reveal them; a keyboard
 * user, given the usual implementation, simply cannot reach them - the cluster
 * is one button and its members exist only as a count. That is the failure
 * this spike exists to rule out, because the brief makes keyboard operability
 * of search non-negotiable and housing is a documented ADA litigation area.
 *
 * THE MODEL
 * The marker layer is a single composite widget with roving tabindex, not 500
 * tab stops. One Tab enters it; arrow keys move between markers in reading
 * order (top-to-bottom, then left-to-right, matching what a sighted user
 * scans); Enter selects; Escape leaves. Home and End jump to the first and
 * last marker.
 *
 * A cluster is a marker too. Activating one expands it *in place* into its
 * member markers rather than only zooming, so every home is reachable at any
 * zoom level. Zooming is still offered, but it is no longer the only way in.
 *
 * Everything the widget does is narrated through a live region, because pan
 * and zoom produce no announcement of their own.
 *
 * NOT IN SCOPE FOR THE SPIKE
 * Tiles and basemap vendor. Markers are DOM overlays in every mainstream map
 * library, so this layer sits on top of whichever one I7 picks.
 */
export function AccessibleMap({
  items,
  fitItems,
  selectedId,
  activeId,
  onActiveChange,
  onSelect,
  height = 520,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  // Seeded with a plausible box only until the ResizeObserver reports the real
  // one on mount; a CSS `height` has no pixel value to seed from, so it falls
  // back to the old default for that single first render.
  const [size, setSize] = useState({
    width: 800,
    height: typeof height === 'number' ? height : 520,
  });
  const [zoom, setZoom] = useState<number | null>(null);
  const [center, setCenter] = useState<{ cx: number; cy: number } | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [focusedIndex, setFocusedIndex] = useState(0);
  const [announcement, setAnnouncement] = useState('');
  const pendingFocusRef = useRef<number | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => {
      setSize({ width: entry.contentRect.width, height: entry.contentRect.height });
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const framed = fitItems && fitItems.length > 0 ? fitItems : items;
  const baseViewport = useMemo(
    () => viewportForBounds(framed, size.width, size.height),
    [framed, size.width, size.height],
  );

  const viewport = useMemo(() => {
    if (zoom === null || center === null) return baseViewport;
    return { ...baseViewport, cx: center.cx, cy: center.cy, scale: zoomToScale(zoom) };
  }, [baseViewport, zoom, center]);

  const clusters = useMemo(
    () => clusterByGrid(items, viewport, 64),
    [items, viewport],
  );

  /**
   * Flatten clusters into the ordered list of focusable markers.
   *
   * A collapsed multi-home cluster contributes one entry; an expanded one
   * contributes its members. This array *is* the keyboard order, so it stays
   * in the same reading order the clustering produced.
   */
  type Marker =
    | { kind: 'home'; key: string; item: MapItem; left: number; top: number }
    | { kind: 'cluster'; key: string; cluster: Cluster<MapItem>; left: number; top: number };

  const markers = useMemo<Marker[]>(() => {
    const out: Marker[] = [];
    for (const cluster of clusters) {
      const isSingle = cluster.members.length === 1;
      if (isSingle || expanded.has(cluster.id)) {
        for (const item of cluster.members) {
          const { left, top } = toScreen(item, viewport);
          out.push({ kind: 'home', key: item.id, item, left, top });
        }
      } else {
        out.push({ kind: 'cluster', key: cluster.id, cluster, left: cluster.left, top: cluster.top });
      }
    }
    return out;
  }, [clusters, expanded, viewport]);

  // Clamped on read rather than corrected in an effect. Zooming and expanding
  // change the marker count underneath the roving index, and writing state in
  // an effect to fix that causes a second render pass every time - deriving it
  // is both simpler and always correct.
  const safeIndex = Math.min(focusedIndex, Math.max(markers.length - 1, 0));

  const focusMarker = useCallback((index: number) => {
    setFocusedIndex(index);
    const el = containerRef.current?.querySelector<HTMLElement>(`[data-marker-index="${index}"]`);
    el?.focus();
  }, []);

  /**
   * Restore focus after the marker set changes underneath it.
   *
   * Expanding a cluster unmounts the very button that was activated - it is
   * replaced by its member markers - so without this the browser drops focus
   * to <body> and a keyboard user is thrown to the top of the document on
   * every expansion. Caught by the F6 verification, which is the whole reason
   * this spike ran before the split-view search was built.
   *
   * Layout effect, not a passive one: focus must land before paint, or a
   * screen reader can announce the document root first.
   */
  useLayoutEffect(() => {
    const index = pendingFocusRef.current;
    if (index === null) return;
    pendingFocusRef.current = null;
    containerRef.current
      ?.querySelector<HTMLElement>(`[data-marker-index="${index}"]`)
      ?.focus();
  });

  /**
   * Zoom in ON A POINT rather than on the current centre.
   *
   * Used when a group is too large to expand. Zooming on the centre would
   * magnify wherever the map happened to be looking, which is usually not the
   * group that was just activated - the reader presses Enter and the thing
   * they aimed at slides off the edge.
   */
  const zoomToward = useCallback(
    (cx: number, cy: number, delta: number) => {
      setZoom((current) => {
        const from = current ?? Math.log2(baseViewport.scale / 256);
        return Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, from + delta));
      });
      setCenter({ cx, cy });
      setExpanded(new Set());
    },
    [baseViewport.scale],
  );

  const openCluster = useCallback(
    (cluster: Cluster<MapItem>, index: number) => {
      const count = cluster.members.length;

      if (count > MAX_EXPAND) {
        // Convert the cluster's screen centroid back to world coordinates so
        // the zoom lands on the group rather than near it.
        const cx = viewport.cx + (cluster.left - viewport.width / 2) / viewport.scale;
        const cy = viewport.cy + (cluster.top - viewport.height / 2) / viewport.scale;
        zoomToward(cx, cy, 2);
        setAnnouncement(
          `${count} homes here - too many to list at once. Zoomed in on them; `
          + 'activate a group again to keep going, or use the arrow keys.',
        );
        return;
      }

      // Members take this cluster's slot in reading order, so the marker now
      // at the same index is the group's first home.
      pendingFocusRef.current = index;
      setFocusedIndex(index);
      setExpanded((prev) => new Set(prev).add(cluster.id));
      setAnnouncement(
        `Expanded group of ${count} homes. Showing the first one. Use the arrow keys to move through them.`,
      );
    },
    [viewport, zoomToward],
  );

  function onKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    const last = markers.length - 1;
    let next: number | null = null;

    switch (event.key) {
      case 'ArrowRight':
      case 'ArrowDown':
        next = safeIndex >= last ? 0 : safeIndex + 1;
        break;
      case 'ArrowLeft':
      case 'ArrowUp':
        next = safeIndex <= 0 ? last : safeIndex - 1;
        break;
      case 'Home':
        next = 0;
        break;
      case 'End':
        next = last;
        break;
      case 'Escape': {
        // Leave the widget rather than trapping the user inside it. A map is
        // not a dialog; Escape should return them to the page.
        event.preventDefault();
        setAnnouncement('Left the map.');
        containerRef.current?.focus();
        return;
      }
      default:
        return;
    }

    event.preventDefault();
    if (next !== null) focusMarker(next);
  }

  const currentZoom = zoom ?? Math.log2(baseViewport.scale / 256);

  function changeZoom(delta: number) {
    const nextZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, currentZoom + delta));
    zoomToward(viewport.cx, viewport.cy, nextZoom - currentZoom);
    setAnnouncement(
      `Zoom level ${nextZoom.toFixed(0)}. ${markers.length} markers shown.`,
    );
  }

  return (
    <div className={styles.wrap} style={height === '100%' ? { height: '100%' } : undefined}>
      <div className={styles.toolbar}>
        <p className={styles.instructions} id="map-instructions">
          Tab into the map, then use the arrow keys to move between markers. Enter opens a
          home or expands a group. Escape leaves the map.
        </p>
        <div className={styles.zoomButtons}>
          <button type="button" className={styles.zoomButton} onClick={() => changeZoom(1)} aria-label="Zoom in">
            +
          </button>
          <button type="button" className={styles.zoomButton} onClick={() => changeZoom(-1)} aria-label="Zoom out">
            −
          </button>
        </div>
      </div>

      <div
        ref={containerRef}
        className={styles.map}
        style={{ height: height === '100%' ? '100%' : height }}
        role="group"
        aria-label={`Map of ${items.length.toLocaleString('en-US')} homes`}
        aria-describedby="map-instructions"
        tabIndex={-1}
        onKeyDown={onKeyDown}
      >
        {/* Basemap behind the markers. Purely decorative - the markers, their
            labels and the address text carry every bit of the meaning. */}
        <TileLayer view={viewport} />

        {markers.map((marker, index) => {
          const isFocusTarget = index === safeIndex;
          const common = {
            'data-marker-index': index,
            // Roving tabindex: exactly one marker is in the tab order, so the
            // map costs a single Tab stop no matter how many homes it holds.
            tabIndex: isFocusTarget ? 0 : -1,
            style: { left: px(marker.left), top: px(marker.top) },
            onFocus: () => {
              setFocusedIndex(index);
              if (marker.kind === 'home') onActiveChange(marker.item.id);
            },
            onMouseEnter: () =>
              onActiveChange(marker.kind === 'home' ? marker.item.id : null),
            onMouseLeave: () => onActiveChange(null),
          };

          if (marker.kind === 'cluster') {
            const count = marker.cluster.members.length;
            /* A group holding a home from the current page of results is
               drawn as a results group: it is one of the twelve the reader is
               actually looking at, and it should not recede into the
               surrounding inventory. */
            const holdsResult = marker.cluster.members.some((m) => m.kind !== 'dot');
            const tooMany = count > MAX_EXPAND;
            return (
              <button
                {...common}
                key={marker.key}
                type="button"
                className={[styles.cluster, holdsResult ? '' : styles.clusterQuiet]
                  .filter(Boolean)
                  .join(' ')}
                aria-label={
                  tooMany
                    ? `Group of ${count} homes. Activate to zoom in on them.`
                    : `Group of ${count} homes. Activate to list them individually.`
                }
                onClick={() => openCluster(marker.cluster, index)}
              >
                <span aria-hidden="true">{count > 999 ? '999+' : count}</span>
              </button>
            );
          }

          const isActive = activeId === marker.item.id;
          const isSelected = selectedId === marker.item.id;

          /* A DOT, NOT A PRICE PIN.
             Nine thousand price labels is unreadable at any zoom - they
             overlap into a wall of numbers and hide the map they are drawn
             on. A dot says "a home is here" and nothing more, which is
             exactly what is known about it, and the label a screen reader
             hears still carries the price and the address.
             The button keeps a full-size hit area with only its centre
             painted: clustering guarantees one marker per 64px cell, so a
             44px target never overlaps its neighbour. */
          if (marker.item.kind === 'dot') {
            return (
              <button
                {...common}
                key={marker.key}
                type="button"
                className={[
                  styles.dot,
                  isActive ? styles.dotActive : '',
                  isSelected ? styles.dotSelected : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                aria-label={marker.item.label}
                aria-current={isSelected ? 'true' : undefined}
                onClick={() => {
                  onSelect(marker.item.id);
                  setAnnouncement(`Selected ${marker.item.label}`);
                }}
              >
                <span className={styles.dotCore} aria-hidden="true" />
              </button>
            );
          }

          return (
            <button
              {...common}
              key={marker.key}
              type="button"
              className={[
                styles.pin,
                isActive ? styles.pinActive : '',
                isSelected ? styles.pinSelected : '',
              ]
                .filter(Boolean)
                .join(' ')}
              aria-label={marker.item.label}
              aria-current={isSelected ? 'true' : undefined}
              onClick={() => {
                onSelect(marker.item.id);
                setAnnouncement(`Selected ${marker.item.label}`);
              }}
            >
              <span aria-hidden="true">{marker.item.pin}</span>
            </button>
          );
        })}
      </div>

      {/* Pan, zoom, and cluster expansion are silent to assistive technology
          unless narrated. */}
      <p className={styles.status} role="status" aria-live="polite">
        {announcement}
      </p>

      {/* WAS VISIBLE DEBUG OUTPUT. This read "1 markers · 1 homes · zoom 2.0"
          under the property map - developer vocabulary and an internal zoom
          figure, printed to renters. The state it describes is still worth
          exposing to a screen reader, which cannot see the pins, so it stays
          in the accessibility tree and leaves the layout. */}
      <p className="visually-hidden">
        {items.length === 1
          ? 'One home shown on the map.'
          : `${items.length.toLocaleString('en-US')} homes shown on the map in ${
              markers.length
            } ${markers.length === 1 ? 'marker' : 'markers'} at this zoom level.`}
      </p>
    </div>
  );
}
