'use client';

import { useCallback, useRef, useState, useEffect } from 'react';
import { useDialogBehavior } from '@/hooks/useDialogBehavior';
import { CloseIcon } from '@/components/ui/Icons';
import type { Photo } from '@/lib/listings/types';
import { cdnSrcSet, GALLERY_SIZES } from '@/lib/images/pipeline';
import styles from './Gallery.module.css';

function GridIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <rect x="1" y="1" width="5.5" height="5.5" rx="1" stroke="currentColor" strokeWidth="1.5" />
      <rect x="9.5" y="1" width="5.5" height="5.5" rx="1" stroke="currentColor" strokeWidth="1.5" />
      <rect x="1" y="9.5" width="5.5" height="5.5" rx="1" stroke="currentColor" strokeWidth="1.5" />
      <rect x="9.5" y="9.5" width="5.5" height="5.5" rx="1" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

function ChevronLeft() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="15 18 9 12 15 6" />
    </svg>
  );
}

function ChevronRight() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}

export function Gallery({
  photos,
  address,
  actions,
}: {
  photos: Photo[];
  address: string;
  /**
   * Controls floated over the top-right of the mosaic - save, share.
   *
   * Passed in rather than built here because they are page concerns: the
   * detail page knows the visitor's saved list, and the search cards already
   * carry their own save control. A slot keeps this component about photographs.
   */
  actions?: React.ReactNode;
}) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLElement | null>(null);
  const thumbListRef = useRef<HTMLDivElement>(null);

  const close = useCallback(() => setOpenIndex(null), []);

  useDialogBehavior({
    open: openIndex !== null,
    onClose: close,
    panelRef,
    triggerRef,
  });

  // Scroll active thumbnail into view in the lightbox
  useEffect(() => {
    if (openIndex !== null && thumbListRef.current) {
      const activeThumb = thumbListRef.current.children[openIndex] as HTMLElement | undefined;
      if (activeThumb) {
        activeThumb.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      }
    }
  }, [openIndex]);

  if (photos.length === 0) return null;

  const lead = photos[0];
  const mosaicPhotos = photos.slice(1, 5);
  const totalCount = photos.length;

  function openAt(index: number, event: React.MouseEvent<HTMLButtonElement>) {
    triggerRef.current = event.currentTarget;
    setOpenIndex(index);
  }

  function step(delta: number) {
    setOpenIndex((current) => {
      if (current === null) return current;
      return (current + delta + photos.length) % photos.length;
    });
  }

  function onViewerKeyDown(event: React.KeyboardEvent) {
    if (event.key === 'ArrowRight') {
      event.preventDefault();
      step(1);
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault();
      step(-1);
    }
  }

  const current = openIndex !== null ? photos[openIndex] : null;

  return (
    <>
      <div className={styles.galleryWrap}>
        <div className={styles.mosaicGrid} data-count={Math.min(photos.length, 5)}>
          {/* Main Hero Photo (Left 50%) */}
          <button
            type="button"
            className={styles.heroButton}
            onClick={(e) => openAt(0, e)}
            aria-label={`Open photo 1 of ${totalCount}: ${lead.alt || address}`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              className={styles.heroImg}
              src={lead.url}
              /* `sizes` alone was doing nothing here - there was no srcset to
                 choose from, so a phone downloaded the 1500px hero (192.6KB)
                 to paint a 375px slot (45.5KB). This is the LCP element. */
              srcSet={cdnSrcSet(lead.url) ?? undefined}
              sizes={GALLERY_SIZES}
              /*
               * The one photo that gets an invented alt, and only because it
               * is not invented.
               *
               * Photo.alt is nullable on purpose - the feed's images arrive
               * without descriptions and we will not make up a claim about a
               * room somebody has not seen. The lead photo is different: the
               * ingest pipeline orders exteriors first, so "the front of this
               * address" is a fact we already know rather than a guess about
               * the contents of the frame. It is also the LCP element and the
               * one image on the page a screen reader user has any reason to
               * be told about, so leaving it decorative dropped the whole
               * gallery out of the accessible page.
               */
              alt={lead.alt ?? `Front of ${address}`}
              width={lead.width}
              height={lead.height}
              loading="eager"
              fetchPriority="high"
              decoding="async"
            />
          </button>

          {/* Right Sub-grid (up to 4 photos) */}
          {mosaicPhotos.length > 0 ? (
            <div className={styles.mosaicSide}>
              {mosaicPhotos.map((photo, i) => (
                <button
                  key={photo.id}
                  type="button"
                  className={styles.mosaicItemButton}
                  onClick={(e) => openAt(i + 1, e)}
                  aria-label={`Open photo ${i + 2} of ${totalCount}`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    className={styles.mosaicImg}
                    src={photo.url}
                    srcSet={cdnSrcSet(photo.url) ?? undefined}
                    /* Quarter-tiles beside the hero, so never more than a
                       third of the shell even on a wide screen. */
                    sizes="(min-width: 768px) 22vw, 45vw"
                    alt=""
                    width={photo.width}
                    height={photo.height}
                    loading="lazy"
                    decoding="async"
                  />
                </button>
              ))}
            </div>
          ) : null}

          {actions ? <div className={styles.actionCluster}>{actions}</div> : null}

          {/* Floating 'View All Photos' Pill Button */}
          <button
            type="button"
            className={styles.viewAllButton}
            onClick={(e) => openAt(0, e)}
          >
            <GridIcon />
            <span>
              View all <strong className={styles.figure}>{totalCount}</strong> photos
            </span>
          </button>
        </div>
      </div>

      {/* Full-Screen Modern Lightbox Modal */}
      {current && openIndex !== null ? (
        <div className={styles.viewer} onKeyDown={onViewerKeyDown}>
          <div className={styles.viewerBackdrop} onClick={close} aria-hidden="true" />
          <div
            className={styles.viewerPanel}
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label={`Photos of ${address}`}
          >
            {/* Top Bar */}
            <div className={styles.viewerBar}>
              <div className={styles.viewerInfo}>
                <span className={styles.viewerAddress}>{address}</span>
                <span className={styles.viewerCount} role="status" aria-live="polite">
                  Photo <strong className={styles.figure}>{openIndex + 1}</strong> of{' '}
                  <span className={styles.figure}>{photos.length}</span>
                </span>
              </div>
              <button
                type="button"
                className={styles.viewerClose}
                onClick={close}
                aria-label="Close photo viewer"
              >
                <CloseIcon />
              </button>
            </div>

            {/* Main Stage with Arrow Controls */}
            <div className={styles.viewerStage}>
              <button
                type="button"
                className={`${styles.navArrow} ${styles.prevArrow}`}
                onClick={() => step(-1)}
                aria-label="Previous photo"
              >
                <ChevronLeft />
              </button>

              <div className={styles.photoContainer}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  className={styles.viewerPhoto}
                  src={current.url}
                  srcSet={cdnSrcSet(current.url) ?? undefined}
                  /* Full-bleed in the lightbox, so this is the one place the
                     large renditions are genuinely wanted. */
                  sizes="100vw"
                  alt={current.alt ?? `Photo ${openIndex + 1} of ${address}`}
                  width={current.width}
                  height={current.height}
                  decoding="async"
                />
              </div>

              <button
                type="button"
                className={`${styles.navArrow} ${styles.nextArrow}`}
                onClick={() => step(1)}
                aria-label="Next photo"
              >
                <ChevronRight />
              </button>
            </div>

            {/* Bottom Interactive Thumbnail Strip */}
            <div className={styles.thumbnailStrip} ref={thumbListRef}>
              {photos.map((photo, index) => (
                <button
                  key={photo.id}
                  type="button"
                  className={`${styles.thumbBtn} ${index === openIndex ? styles.thumbActive : ''}`}
                  onClick={() => setOpenIndex(index)}
                  aria-label={`Go to photo ${index + 1}`}
                  aria-current={index === openIndex ? 'true' : undefined}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    className={styles.thumbStripImg}
                    src={photo.url}
                    srcSet={cdnSrcSet(photo.url) ?? undefined}
                    /* THE WORST OFFENDER ON THE PAGE. Every photograph in the
                       set renders here, and each was pulling its 1500px
                       rendition to paint an 80px thumbnail - on a 24-photo
                       home, ~4.6MB to draw a filmstrip. `80px` pins the
                       browser to the smallest candidate. */
                    sizes="80px"
                    alt=""
                    width={80}
                    height={54}
                    loading="lazy"
                  />
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
