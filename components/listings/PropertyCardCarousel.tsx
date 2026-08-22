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
    <div className={styles.carousel}>
      <div className={styles.scrollContainer} ref={scrollRef}>
        {photos.map((photo, index) => (
          <div key={photo.id} className={styles.slide}>
            <Link href={href} draggable={false} className={styles.imageLink}>
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
