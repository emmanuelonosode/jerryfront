/**
 * Functional icons only, single stroke weight, one consistent set.
 *
 * Hand-rolled rather than pulled from a library: the brief allows a handful of
 * purely functional glyphs, and a whole icon package would be dead weight
 * against the mobile performance budget. All are decorative - every one sits
 * beside a real text label - so they are hidden from assistive technology.
 */

type IconProps = { className?: string };

const base = {
  width: 20,
  height: 20,
  viewBox: '0 0 20 20',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.5,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
  focusable: false,
};

export function ChevronDown({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M5 7.5 10 12.5 15 7.5" />
    </svg>
  );
}

export function MenuIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M3 5.5h14M3 10h14M3 14.5h14" />
    </svg>
  );
}

export function CloseIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M5 5l10 10M15 5L5 15" />
    </svg>
  );
}

export function SearchIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <circle cx="8.5" cy="8.5" r="5.5" />
      <path d="m12.5 12.5 4.5 4.5" />
    </svg>
  );
}

export function AlertIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M10 2.5 18.5 17.5H1.5L10 2.5Z" />
      <path d="M10 8v3.5" />
      <path d="M10 14.5h.01" />
    </svg>
  );
}

export function CheckIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M4 10.5 8 14.5 16 6" />
    </svg>
  );
}

export function ClockIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <circle cx="10" cy="10" r="7.5" />
      <path d="M10 5.5V10l3 2" />
    </svg>
  );
}

/* ---------------------------------------------------------------------------
   Amenity glyphs.

   Same rules as above: single stroke weight, decorative, always beside a text
   label. An amenity list where the icon carries meaning on its own would fail
   for anyone who cannot resolve a 20px glyph - the label is the content, the
   icon is a scanning aid.

   Deliberately a small set. A distinct icon per amenity produces forty glyphs
   nobody recognises; these cover the categories the feed actually sends, and
   anything unmatched falls back to a neutral mark rather than a wrong one.
   --------------------------------------------------------------------------- */

export function PoolIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M2.5 14.5c1.2 0 1.2 1 2.5 1s1.3-1 2.5-1 1.2 1 2.5 1 1.3-1 2.5-1 1.2 1 2.5 1 1.3-1 2.5-1" />
      <path d="M6.5 12V5a1.5 1.5 0 0 1 3 0M13 12V5a1.5 1.5 0 0 0-3 0" />
      <path d="M6.5 8.5h3.5" />
    </svg>
  );
}

export function YardIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M2.5 16.5V7l7.5-4.5L17.5 7v9.5" />
      <path d="M2.5 16.5h15M7 16.5v-4h6v4" />
    </svg>
  );
}

export function GarageIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M2.5 17V7.5L10 3.5l7.5 4V17" />
      <path d="M5.5 17v-6h9v6M5.5 14h9" />
    </svg>
  );
}

export function FireplaceIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M10 3c2 2.5 1 4 0 5-1-1-1.5-2-1-3" />
      <path d="M10 8c2.5 1 3.5 3 3.5 4.5a3.5 3.5 0 0 1-7 0C6.5 11 7.5 9 10 8Z" />
      <path d="M3.5 17h13" />
    </svg>
  );
}

export function KitchenIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M3.5 3.5h13v13h-13z" />
      <path d="M3.5 8.5h13M7 6h1M7 11.5h1" />
    </svg>
  );
}

export function LaundryIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <rect x="4" y="2.5" width="12" height="15" rx="1.5" />
      <circle cx="10" cy="11.5" r="3.5" />
      <path d="M6.5 5.5h1.5" />
    </svg>
  );
}

export function ClimateIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M10 2.5v15M4.5 6l11 8M15.5 6l-11 8" />
    </svg>
  );
}

export function PetIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <ellipse cx="6" cy="7" rx="1.6" ry="2.1" />
      <ellipse cx="10" cy="5.5" rx="1.6" ry="2.1" />
      <ellipse cx="14" cy="7" rx="1.6" ry="2.1" />
      <path d="M10 10c2.5 0 4.5 1.8 4.5 3.7S12.5 17 10 17s-4.5-1.4-4.5-3.3S7.5 10 10 10Z" />
    </svg>
  );
}

export function AccessibilityIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <circle cx="10" cy="4" r="1.75" />
      <path d="M6.5 7.5h7M10 7.5v5M10 12.5H7l-1.5 4M10 12.5h3l1.5 4" />
    </svg>
  );
}

export function BuildingIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M4 17V4.5h8V17M12 9h4v8M4 17h12" />
      <path d="M6.5 7.5h3M6.5 11h3" />
    </svg>
  );
}

export function SparkleIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M10 2.5 11.6 7 16 8.5 11.6 10 10 14.5 8.4 10 4 8.5 8.4 7Z" />
      <path d="M15.5 13.5 16 15l1.5.5-1.5.5-.5 1.5-.5-1.5L13.5 15l1.5-.5Z" />
    </svg>
  );
}

/** Fallback. A neutral mark beats a wrong one. */
export function DotIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <circle cx="10" cy="10" r="3" />
    </svg>
  );
}

export function MapPinIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M10 17.5s5.5-5 5.5-9a5.5 5.5 0 1 0-11 0c0 4 5.5 9 5.5 9Z" />
      <circle cx="10" cy="8.5" r="2" />
    </svg>
  );
}

export function CubeIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M10 2.5 17 6.25v7.5L10 17.5 3 13.75v-7.5Z" />
      <path d="M3 6.25 10 10l7-3.75M10 10v7.5" />
    </svg>
  );
}

/* ---- Portal navigation --------------------------------------------------
   Same 20px grid and 1.5px stroke as the set above, so the sidebar does not
   read as a different icon family bolted onto the same product.
   ----------------------------------------------------------------------- */

export function DashboardIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M3 8.6 10 3l7 5.6V16a1 1 0 0 1-1 1h-3.5v-4.5h-5V17H4a1 1 0 0 1-1-1Z" />
    </svg>
  );
}

export function PaymentsIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <rect x="2.5" y="4.5" width="15" height="11" rx="1.75" />
      <path d="M2.5 8.5h15" />
    </svg>
  );
}

export function WrenchIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M12.6 3.4a4 4 0 0 0-4.9 5.1l-4.3 4.3a1.6 1.6 0 0 0 0 2.3l1.5 1.5a1.6 1.6 0 0 0 2.3 0l4.3-4.3a4 4 0 0 0 5.1-4.9L14.3 10 10 5.7Z" />
    </svg>
  );
}

export function DocumentIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M11.5 2.5H6a1.5 1.5 0 0 0-1.5 1.5v12A1.5 1.5 0 0 0 6 17.5h8a1.5 1.5 0 0 0 1.5-1.5V6.5Z" />
      <path d="M11.5 2.5v4h4M7.5 11h5M7.5 14h3" />
    </svg>
  );
}

export function UserIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <circle cx="10" cy="7" r="3.25" />
      <path d="M3.75 17a6.25 6.25 0 0 1 12.5 0" />
    </svg>
  );
}

export function SettingsIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <circle cx="10" cy="10" r="2.75" />
      <path d="M10 2.5v2M10 15.5v2M17.5 10h-2M4.5 10h-2M15.3 4.7l-1.4 1.4M6.1 13.9l-1.4 1.4M15.3 15.3l-1.4-1.4M6.1 6.1 4.7 4.7" />
    </svg>
  );
}

export function BriefcaseIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <rect x="2.5" y="6" width="15" height="10.5" rx="1.5" />
      <path d="M7 6V4.5A1.5 1.5 0 0 1 8.5 3h3A1.5 1.5 0 0 1 13 4.5V6" />
    </svg>
  );
}

export function SignOutIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M12.5 14.5v1.5a1.5 1.5 0 0 1-1.5 1.5H5a1.5 1.5 0 0 1-1.5-1.5V4A1.5 1.5 0 0 1 5 2.5h6a1.5 1.5 0 0 1 1.5 1.5v1.5" />
      <path d="M8.5 10h9M15 7.5 17.5 10 15 12.5" />
    </svg>
  );
}

/* ---- Property specifications --------------------------------------------
   These replace emoji. An emoji is a different typeface at every size, renders
   differently on every platform, is announced by screen readers as its unicode
   name ("bed", "shower", "triangular ruler"), and cannot take the brand colour
   - so a spec row built from them reads as decoration pasted into a product
   rather than as part of it.
   ----------------------------------------------------------------------- */

export function BedIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M2.5 15.5v-9M2.5 12h15v3.5M17.5 12v-1.5a2 2 0 0 0-2-2H9.5V12" />
      <circle cx="6.25" cy="10.25" r="1.75" />
    </svg>
  );
}

export function BathIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M2.5 10.5h15v2a3.5 3.5 0 0 1-3.5 3.5H6a3.5 3.5 0 0 1-3.5-3.5Z" />
      <path d="M5 10.5V5.25A1.75 1.75 0 0 1 6.75 3.5c.9 0 1.6.66 1.73 1.5" />
      <path d="M5.5 16v1.5M14.5 16v1.5" />
    </svg>
  );
}

export function AreaIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <rect x="3" y="3" width="14" height="14" rx="1.5" />
      <path d="M3 7.5h2M15 7.5h2M7.5 3v2M7.5 15v2" />
    </svg>
  );
}

export function HouseIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M3 8.75 10 3.5l7 5.25V16a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1Z" />
      <path d="M8 17v-5h4v5" />
    </svg>
  );
}

export function CalendarIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <rect x="3" y="4.5" width="14" height="12.5" rx="1.5" />
      <path d="M3 8.5h14M7 2.75v3.5M13 2.75v3.5" />
    </svg>
  );
}

export function ShieldCheckIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M10 2.75 16 5v5c0 3.4-2.4 6.4-6 7.25C6.4 16.4 4 13.4 4 10V5Z" />
      <path d="M7.5 9.75 9.25 11.5 12.75 8" />
    </svg>
  );
}

export function BoltIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M11 2.5 4.5 11.25h4.25L9 17.5l6.5-8.75H11.25Z" />
    </svg>
  );
}

export function KeyIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <circle cx="7" cy="7" r="3.75" />
      <path d="M9.75 9.75 17 17M14.5 14.5l1.75-1.75M12.5 12.5l1.75-1.75" />
    </svg>
  );
}

/* ---------------------------------------------------------------------------
 * Amenity glyphs.
 *
 * Added because the amenity list fell back to a generic tick for most rows:
 * "Long Lease Terms", "Recessed Lighting", "Walk in Closet", "Open Floorplan",
 * "Walking Trails" and "W/D Hookups" all rendered the same check, so the
 * column read as a list that had run out of icons rather than as a set of
 * distinct features. Same 20px box and 1.5 stroke as the rest of the set.
 * ------------------------------------------------------------------------- */

/** Plank flooring - vinyl, hardwood, tile, carpet. */
export function FlooringIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M2.5 5h15v10h-15z" />
      <path d="M2.5 8.3h15M2.5 11.7h15M7 5v3.3M12.5 8.3v3.4M7 11.7V15" />
    </svg>
  );
}

/** A ceiling downlight throwing a cone - recessed and general lighting. */
export function LightingIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M6 3.5h8" />
      <path d="M7.2 3.5 4 11h12L12.8 3.5" />
      <path d="M8 14.2h4M8.8 16.5h2.4" />
    </svg>
  );
}

/** A wardrobe with a hanging rail - walk-in closets and storage. */
export function ClosetIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M3.5 3h13v14h-13z" />
      <path d="M10 3v14" />
      <path d="M8.4 8.2h.01M11.6 8.2h.01" />
    </svg>
  );
}

/** A bed - bedroom placement, primary on main. */
export function BedroomIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M2.5 15v-4.5a2 2 0 0 1 2-2h11a2 2 0 0 1 2 2V15" />
      <path d="M2.5 12.8h15M2.5 15v1.5M17.5 15v1.5" />
      <path d="M5.5 8.5V6a1.5 1.5 0 0 1 1.5-1.5h6A1.5 1.5 0 0 1 14.5 6v2.5" />
    </svg>
  );
}

/** A room outline with an opening - open floorplans and single-storey layouts. */
export function FloorplanIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M3 3.5h14v13H3z" />
      <path d="M8 3.5v5M8 12v4.5M3 12h5" />
      <path d="M12.5 8.5h4.5" />
    </svg>
  );
}

/** A signed document - lease terms and lease length. */
export function LeaseIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M5 2.5h7l3.5 3.5v11.5H5z" />
      <path d="M11.5 2.5V6H15" />
      <path d="M7.5 11.5c1.2-1.6 2-1.6 2.6 0 .5 1.4 1.3 1.4 2.4-.4" />
    </svg>
  );
}

/** A tree - parks, walking trails, green space. */
export function NatureIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M10 2.5 5.5 9h9L10 2.5z" />
      <path d="M10 7 6.5 13h7L10 7z" />
      <path d="M10 13v4.5" />
    </svg>
  );
}

/** Ripples - ponds, lakes, waterfront. */
export function WaterIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M2.5 6.5c1.9-1.7 3.7-1.7 5.6 0s3.7 1.7 5.6 0 3.7-1.7 3.8 0" />
      <path d="M2.5 11c1.9-1.7 3.7-1.7 5.6 0s3.7 1.7 5.6 0 3.7-1.7 3.8 0" />
      <path d="M2.5 15.5c1.9-1.7 3.7-1.7 5.6 0s3.7 1.7 5.6 0 3.7-1.7 3.8 0" />
    </svg>
  );
}

/** A court with a centre line - tennis, basketball, volleyball, golf, tot lot. */
export function SportIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M2.5 4.5h15v11h-15z" />
      <path d="M10 4.5v11" />
      <circle cx="10" cy="10" r="2.4" />
    </svg>
  );
}

/** A window with a sill - bay windows, vaulted ceilings, balconies. */
export function WindowIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M4 3h12v11H4z" />
      <path d="M10 3v11M4 8.5h12" />
      <path d="M2.5 14h15M6.5 17h7" />
    </svg>
  );
}

/** Two offset sheets - copy to clipboard. */
export function CopyIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <rect x="7" y="7" width="10" height="11" rx="1.6" />
      <path d="M13 4.5H4.6A1.6 1.6 0 0 0 3 6.1v8.4" />
    </svg>
  );
}
