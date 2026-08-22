import { COMPANY_FACTS } from './content/business.ts';
/**
 * Single source of truth for site navigation.
 *
 * Header, mobile drawer, and footer all read from here so a route can never
 * appear in one and go missing from another. Labels follow the naming glossary
 * in INFORMATION_ARCHITECTURE.md - "home" not property, plain language in
 * navigation, precise language on the page itself.
 */

export type NavLink = {
  label: string;
  href: string;
  /** Short gloss shown in dropdowns and the mobile drawer. */
  description?: string;
};

export type NavGroup = {
  label: string;
  /** Present when the group's own label is also a destination. */
  href?: string;
  links: NavLink[];
};

export type NavItem = NavLink | NavGroup;

export function isGroup(item: NavItem): item is NavGroup {
  return 'links' in item;
}

/**
 * Nav for a letting business, not a screening service.
 *
 * "Do I qualify?" used to sit here, one click from every page, with the
 * published income multiples behind it. It has gone: putting that question in
 * the main navigation tells every visitor the first thing to worry about is
 * whether they will be allowed, when the actual first step is finding a house
 * they want. Homes, fees, how it works, who we are.
 */
export const PRIMARY_NAV: NavItem[] = [
  {
    label: 'Find a home',
    href: '/homes-for-rent',
    links: [
      {
        label: 'Search all homes',
        href: '/homes-for-rent',
        description: 'Every home we have, with the full monthly cost',
      },
      {
        label: 'We find one for you',
        href: '/home-finding',
        description: 'Tell us what you need and we do the searching',
      },
      {
        label: 'Request a tour',
        href: '/schedule-tour',
        description: 'Walk through a home before you apply',
      },
    ],
  },
  { label: 'Fees', href: '/fees' },
  { label: 'How it works', href: '/how-it-works' },
  {
    label: 'About',
    links: [
      { label: 'Our team', href: '/team' },
      { label: 'Contact', href: '/contact' },
      { label: 'For property owners', href: '/property-management' },
      { label: 'Careers', href: '/careers' },
    ],
  },
];

export const UTILITY_NAV: NavLink[] = [
  { label: 'Saved', href: '/saved' },
  { label: 'Resident login', href: '/portal' },
];

export const FOOTER_NAV: NavGroup[] = [
  {
    label: 'Find a home',
    links: [
      { label: 'Search all homes', href: '/homes-for-rent' },
      { label: 'We find one for you', href: '/home-finding' },
      { label: 'Schedule a tour', href: '/schedule-tour' },
      { label: 'Saved homes', href: '/saved' },
    ],
  },
  {
    label: 'Renting with us',
    links: [
      { label: 'Fees', href: '/fees' },
      { label: 'How it works', href: '/how-it-works' },
      { label: 'Request a tour', href: '/schedule-tour' },
    ],
  },
  {
    label: 'Company',
    links: [
      { label: 'Our team', href: '/team' },
      { label: 'Contact', href: '/contact' },
      { label: 'For property owners', href: '/property-management' },
      { label: 'Careers', href: '/careers' },
      { label: 'Renter guides', href: '/guides' },
    ],
  },
  {
    label: 'Legal',
    links: [
      { label: 'Privacy', href: '/privacy' },
      { label: 'Terms', href: '/terms' },
      { label: 'Accessibility', href: '/accessibility' },
      { label: 'Fair housing', href: '/fair-housing' },
    ],
  },
];

/**
 * Company facts shown in the footer on every page.
 *
 * Deliberately unfilled. Flow 2 in the IA - the renter checking whether this
 * is a scam - depends on these being real and verifiable, so inventing them
 * would attack the exact pillar the footer exists to support. `null` renders a
 * visible [TO CONFIRM] marker that cannot be shipped by accident.
 */
export type { Jurisdiction } from './content/business.ts';

/**
 * Supplied through `.env` now, not edited here. Still `null` until it is set,
 * which is what keeps the visible TO CONFIRM marker honest.
 */
export const COMPANY = COMPANY_FACTS;
