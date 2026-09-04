'use client';

import Link from 'next/link';
import { useRef, useState, useEffect } from 'react';
import type { Photo } from '@/lib/listings/types';
import { ListingImage } from './ListingImage';
import styles from './PropertyCardCarousel.module.css';

export function PropertyCardCarousel({
  photos,
  slug,
  href,
  sizes,
  priority = false,
}: {
  photos: Photo[];
  slug: string;
  href: string;
  sizes?: string;
  priority?: boolean;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  /**
   * ONE PHOTOGRAPH PER CARD UNTIL SOMEBODY ASKS FOR MORE.
   *
   * Every photo of every home used to be in the DOM on first paint. A page of
   * 24 cards averaging 17 photos each is over 400 `<img>` elements, each with
   * a srcset the browser must parse and a layout box it must reserve - before
   * anyone has swiped anything. Lazy loading defers the BYTES; it does nothing
   * about the elements, and on a mid-tier phone the parse and layout cost is
   * what makes the list feel heavy.
   *
   * So the card renders its lead image, which is the only one visible, and
   * mounts the rest the moment there is any sign of intent: a pointer over the
   * card, a focus, or a touch. By the time the arrows can be pressed the
   * slides are there.
   */
  const [expanded, setExpanded] = useState(false);
  const shown = expanded ? photos : photos.slice(0, 1);
  const reveal = () => setExpanded(true);

  const scroll = (e: React.MouseEvent, direction: 'left' | 'right') => {
    // Prevent the click from navigating the card link
    e.preventDefault();
    e.stopPropagation();

    if (scrollRef.current) {
      const width = scrollRef.current.clientWidth;
      const newIndex = direction === 'left' 
        ? Math.max(0, currentIndex - 1)
        : Math.min(photos.length - 1, currentIndex + 1);
        
      scrollRef.current.scrollTo({
        left: width * newIndex,
        behavior: 'smooth'
      });
      setCurrentIndex(newIndex);
    }
  };

  // Sync scroll position with state if swiped manually
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const handleScroll = () => {
      const index = Math.round(el.scrollLeft / el.clientWidth);
      if (index !== currentIndex) {
        setCurrentIndex(index);
      }
    };

    // Passive listener for scroll snap updates
    el.addEventListener('scroll', handleScroll, { passive: true });
    return () => el.removeEventListener('scroll', handleScroll);
  }, [currentIndex]);

  if (photos.length === 0) {
    return null;
  }

  return (
    <div
      className={styles.carousel}
      onPointerEnter={reveal}
      onTouchStart={reveal}
      onFocusCapture={reveal}
    >
      <div className={styles.scrollContainer} ref={scrollRef}>
        {shown.map((photo, index) => (
          <div key={photo.id} className={styles.slide}>
            {/*
              HIDDEN FROM ASSISTIVE TECH, ON PURPOSE.

              The photo is wrapped in a link to the same home the card's
              address link already points at, and the feed supplies no alt
              text for most images - so a screen reader met a link with no
              accessible name, once per visible slide, per card. The a11y
              audit reported 20 serious findings on a page of 24 homes for
              exactly this.

              It is not removed, because a mouse user expects to click the
              picture. It is taken out of the accessibility tree and out of
              the tab order instead: the named link on the address goes to
              the identical URL, so nothing is lost, and a keyboard user
              stops having to tab past five nameless links to reach the next
              card. `aria-hidden` without `tabIndex={-1}` would be the worse
              bug - a focusable element that announces nothing.
            */}
            <Link
              href={href}
              draggable={false}
              className={styles.imageLink}
              aria-hidden
              tabIndex={-1}
            >
              <ListingImage
                className={styles.photo}
                src={photo.url}
                alt={photo.alt}
                seed={slug}
                width={photo.width}
                height={photo.height}
                sizes={sizes}
                // Only eager load the very first image if priority is true
                priority={priority && index === 0}
              />
            </Link>
          </div>
        ))}
      </div>

      {photos.length > 1 && (
        <div className={styles.controls}>
          <button 
            className={styles.arrow} 
            onClick={(e) => scroll(e, 'left')}
            disabled={currentIndex === 0}
            aria-label="Previous photo"
          >
            ←
          </button>
          <button 
            className={styles.arrow} 
            onClick={(e) => scroll(e, 'right')}
            disabled={currentIndex === photos.length - 1}
            aria-label="Next photo"
          >
            →
          </button>
        </div>
      )}

      {photos.length > 1 && (
        <span className={styles.photoCount}>
          <span className={styles.figure}>{currentIndex + 1}</span> / {photos.length}
        </span>
      )}
    </div>
  );
}
