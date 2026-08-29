'use client';

import { useCallback, useRef, useState } from 'react';
import Link from 'next/link';
import { PRIMARY_NAV, UTILITY_NAV, isGroup } from '@/lib/navigation';
import { NavDisclosure } from './NavDisclosure';
import { MobileNav } from './MobileNav';
import { MenuIcon, SearchIcon } from '@/components/ui/Icons';
import { Container } from './Container';
import { Logo } from '@/components/brand/Logo';
import styles from './SiteHeader.module.css';

/**
 * Site header.
 *
 * Not sticky, deliberately. "Persistent Apply" in the IA means it never
 * collapses into the drawer - not that the bar pins to the viewport. Property
 * detail and the application already carry sticky bottom action bars, and
 * stacking a pinned header on top of those would spend scarce mobile viewport
 * twice over on an audience that is mostly on phones.
 */
export function SiteHeader() {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  // Stable identity so the drawer's effect does not tear down and re-run -
  // which would unlock scroll and bounce focus on every parent render.
  const closeMenu = useCallback(() => setMenuOpen(false), []);

  return (
    <header className={styles.header}>
      {/* Quiet by design: residents know where to look, and prospects should
          not be distracted by an account they do not have. */}
      <div className={styles.utilityBar}>
        <Container width="page" className={styles.utilityInner}>
          <ul className={styles.utilityList} role="list">
            {UTILITY_NAV.map((link) => (
              <li key={link.href}>
                <Link className={styles.utilityLink} href={link.href}>
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </Container>
      </div>

      <div className={styles.mainBar}>
        <Container width="page" className={styles.mainInner}>
          <Link className={styles.wordmark} href="/" aria-label="Skelton Realty Group home">
            <Logo tone="onDark" />
          </Link>

          {/* Search lives in the bar, as it does in the reference's global
              header. It posts `q` to the search page, which is now real
              free-text: address, street, ZIP, neighbourhood or city, matched
              and ranked in the database. It used to post `city`, matched with
              `iexact` - so this box answered whole city names and nothing
              else, and the placeholder had to promise only that. */}
          <form className={styles.search} action="/homes-for-rent" role="search">
            <label className="visually-hidden" htmlFor="site-search">
              Search homes by address, city, or ZIP
            </label>
            <SearchIcon className={styles.searchIcon} />
            <input
              id="site-search"
              className={styles.searchInput}
              type="search"
              name="q"
              placeholder="Search an address, city, or ZIP"
            />
          </form>

          <nav className={styles.desktopNav} aria-label="Main">
            <ul className={styles.navList} role="list">
              {PRIMARY_NAV.map((item) =>
                isGroup(item) ? (
                  <li key={item.label}>
                    <NavDisclosure group={item} />
                  </li>
                ) : (
                  <li key={item.href}>
                    <Link className={styles.navLink} href={item.href}>
                      {item.label}
                    </Link>
                  </li>
                ),
              )}
            </ul>
          </nav>

          <div className={styles.actions}>
            {/* Tour sits beside Apply at every breakpoint. It was reachable
                only inside the "Find a home" disclosure, which is two taps and
                a guess on a phone - and a tour is the step most of this
                audience takes BEFORE they are ready to apply, so burying it
                behind the harder commitment had the funnel backwards. Styled
                secondary so it supports Apply rather than competing with it. */}
            <Link className={styles.tourButton} href="/schedule-tour">
              Book a tour
            </Link>

            {/* Apply stays in the bar at every breakpoint. Primary conversion
                is never one tap deeper than it has to be. */}
            <Link className={styles.applyButton} href="/apply">
              Apply
            </Link>

            <button
              ref={menuButtonRef}
              type="button"
              className={styles.menuButton}
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen(true)}
            >
              <MenuIcon />
              <span className="visually-hidden">Open menu</span>
            </button>
          </div>
        </Container>
      </div>

      <MobileNav open={menuOpen} onClose={closeMenu} triggerRef={menuButtonRef} />
    </header>
  );
}
