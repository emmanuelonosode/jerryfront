'use client';

import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import styles from './HeroSlideshow.module.css';

/**
 * The photographs behind the hero, crossfading.
 *
 * DECORATIVE, SO `alt=""`. Everything these convey is said in the text on top
 * of them, and the homes they show are not the subject of the page. A screen
 * reader announcing "two-storey house at dusk" here adds nothing and delays
 * reaching the search field, which is the hero's actual job.
 *
 * THE FIRST FRAME IS THE LCP ELEMENT, so it carries `priority` and is the only
 * one fetched eagerly. The second is loaded a beat later, after first paint,
 * rather than competing with it — a crossfade that starts seven seconds in has
 * no reason to slow down the thing a visitor is waiting for.
 *
 * MOTION IS OPTIONAL. Under `prefers-reduced-motion` the rotation does not
 * start at all: this is ambient movement with no informational content, and
 * for a vestibular-sensitive visitor a full-bleed image swap under the
 * headline is exactly the kind of thing that rules the setting out. They get
 * the first photograph, held.
 */

const SLIDES = [
  {
    src: '/images/hero-couple-new-home.jpg',
    /* Faces sit low-centre in this frame; the default 50% crop cuts them off
       on a short viewport. */
    position: '50% 62%',
  },
  {
    src: '/images/hero-home-at-dusk.jpg',
    position: '50% 58%',
  },
];

/** Long enough to look at, short enough that a visitor sees the second one. */
const INTERVAL_MS = 7000;

export function HeroSlideshow() {
  const [active, setActive] = useState(0);
  const [secondReady, setSecondReady] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  // Deferred so the second image never competes with the LCP fetch.
  useEffect(() => {
    const id = setTimeout(() => setSecondReady(true), 1200);
    return () => clearTimeout(id);
  }, []);

  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (reduced.matches) return;

    timer.current = setInterval(
      () => setActive((i) => (i + 1) % SLIDES.length),
      INTERVAL_MS,
    );
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, []);

  function show(index: number) {
    // A manual choice stops the carousel. Someone who has picked a frame is
    // looking at it; sliding it away four seconds later is the single most
    // complained-about behaviour a carousel has.
    if (timer.current) clearInterval(timer.current);
    setActive(index);
  }

  return (
    <div className={styles.frame}>
      {SLIDES.map((slide, index) => (
        <div
          key={slide.src}
          className={styles.slide}
          data-active={index === active ? 'true' : undefined}
          aria-hidden="true"
        >
          {(index === 0 || secondReady) && (
            <Image
              className={styles.photo}
              src={slide.src}
              alt=""
              fill
              sizes="100vw"
              priority={index === 0}
              style={{ objectPosition: slide.position }}
            />
          )}
        </div>
      ))}

      {/* Two thin rules rather than dots: the system uses rules as structural
          marks and has no pill shapes anywhere else. */}
      <div className={styles.dots}>
        {SLIDES.map((slide, index) => (
          <button
            key={slide.src}
            type="button"
            className={styles.dot}
            data-active={index === active ? 'true' : undefined}
            onClick={() => show(index)}
            aria-label={`Show photograph ${index + 1} of ${SLIDES.length}`}
            aria-pressed={index === active}
          />
        ))}
      </div>
    </div>
  );
}
