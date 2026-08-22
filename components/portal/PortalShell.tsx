'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Logo } from '@/components/brand/Logo';
import {
  BriefcaseIcon,
  DashboardIcon,
  DocumentIcon,
  PaymentsIcon,
  SettingsIcon,
  SignOutIcon,
  UserIcon,
  WrenchIcon,
} from '@/components/ui/Icons';
import { apiFetch, logout, type PortalUser } from '@/lib/portal/api';
import styles from './PortalShell.module.css';

/**
 * The portal chrome: sidebar on desktop, top bar plus bottom tabs on mobile.
 *
 * WHO IT ASKS ABOUT THE SESSION. The proxy has already checked that a cookie
 * exists, but a cookie is not a session - it is forgeable and it can be stale.
 * The shell therefore fetches `/auth/me/` and treats the API's answer as the
 * truth. A forged cookie renders this frame once and then bounces to login on
 * the first 401, which is the correct outcome and costs nobody anything real.
 *
 * The staff module is gated on the role the API returns, not on anything the
 * client asserted. Hiding the link is a courtesy; the endpoint behind it does
 * its own check.
 */

type NavItem = {
  href: string;
  label: string;
  Icon: (props: { className?: string }) => React.ReactElement;
  /** Shown in the four-item mobile bar. */
  primary?: boolean;
};

const NAV: NavItem[] = [
  { href: '/portal/dashboard', label: 'Dashboard', Icon: DashboardIcon, primary: true },
  { href: '/portal/payments', label: 'Payments', Icon: PaymentsIcon, primary: true },
  { href: '/portal/maintenance', label: 'Maintenance', Icon: WrenchIcon, primary: true },
  { href: '/portal/documents', label: 'Documents', Icon: DocumentIcon, primary: true },
  { href: '/portal/profile', label: 'Profile', Icon: UserIcon },
  { href: '/portal/settings', label: 'Settings', Icon: SettingsIcon },
];

const STAFF_NAV: NavItem = { href: '/portal/hiring', label: 'Hiring', Icon: BriefcaseIcon };
const STAFF_ROLES = new Set(['ADMIN', 'MANAGER']);

function initialsOf(user: PortalUser): string {
  const first = user.first_name?.[0] ?? '';
  const last = user.last_name?.[0] ?? '';
  return (first + last).toUpperCase() || user.email[0]?.toUpperCase() || '?';
}

export function PortalShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [user, setUser] = useState<PortalUser | null>(null);

  useEffect(() => {
    let cancelled = false;
    apiFetch<PortalUser>('/auth/me/')
      .then((me) => {
        if (!cancelled) setUser(me);
      })
      // apiFetch already redirects to login on an unrecoverable 401. Anything
      // else leaves the frame in place with the pages free to show their own
      // error, rather than blanking the whole portal over one failed call.
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  const items = user && STAFF_ROLES.has(user.role) ? [...NAV, STAFF_NAV] : NAV;
  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  return (
    <div className={styles.shell}>
      {/* ---- Desktop sidebar ---- */}
      <aside className={styles.sidebar}>
        <div className={styles.brand}>
          <Link href="/" className={styles.brandLink} aria-label="Skelton Realty Group main site">
            <Logo size="sm" />
          </Link>
        </div>

        <div className={styles.resident}>
          <span className={styles.avatar} aria-hidden="true">
            {user ? initialsOf(user) : '-'}
          </span>
          <span className={styles.residentText}>
            <span className={styles.residentName}>{user?.full_name ?? 'Signed in'}</span>
            <span className={styles.residentEmail}>{user?.email ?? ''}</span>
          </span>
        </div>

        <nav className={styles.nav} aria-label="Portal">
          <ul className={styles.navList} role="list">
            {items.map(({ href, label, Icon }) => (
              <li key={href}>
                <Link
                  href={href}
                  className={isActive(href) ? styles.navLinkActive : styles.navLink}
                  aria-current={isActive(href) ? 'page' : undefined}
                >
                  <Icon className={styles.navIcon} />
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className={styles.sidebarFooter}>
          <Link href="/portal/payments" className={styles.payButton}>
            Make a payment
          </Link>
          <Link href="/" className={styles.footerLink}>
            Main site
          </Link>
          <button type="button" className={styles.signOut} onClick={logout}>
            <SignOutIcon className={styles.navIcon} />
            Sign out
          </button>
        </div>
      </aside>

      {/* ---- Mobile top bar ---- */}
      <header className={styles.mobileTop}>
        <Link href="/" className={styles.brandLink} aria-label="Skelton Realty Group main site">
          <Logo tone="onDark" size="sm" />
        </Link>
        <div className={styles.mobileActions}>
          <Link href="/portal/settings" className={styles.mobileIconLink} aria-label="Settings">
            <SettingsIcon />
          </Link>
          <button
            type="button"
            className={styles.mobileIconButton}
            onClick={logout}
            aria-label="Sign out"
          >
            <SignOutIcon />
          </button>
        </div>
      </header>

      <main id="main" className={styles.main}>
        {children}
      </main>

      {/* ---- Mobile bottom tabs ---- */}
      <nav className={styles.bottomNav} aria-label="Portal sections">
        <ul className={styles.bottomList} role="list">
          {items
            .filter((item) => item.primary)
            .map(({ href, label, Icon }) => (
              <li key={href}>
                <Link
                  href={href}
                  className={isActive(href) ? styles.bottomLinkActive : styles.bottomLink}
                  aria-current={isActive(href) ? 'page' : undefined}
                >
                  <Icon className={styles.bottomIcon} />
                  <span className={styles.bottomLabel}>{label}</span>
                </Link>
              </li>
            ))}
        </ul>
      </nav>
    </div>
  );
}
