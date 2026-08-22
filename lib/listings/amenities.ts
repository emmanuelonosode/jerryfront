/**
 * Amenity classification.
 *
 * WHY MATCH ON KEYWORDS RATHER THAN A FIXED LIST.
 *
 * Amenities arrive as free text - from manual entry and from a partner feed
 * whose vocabulary is theirs, not ours ("Pool" vs "Pool on property" vs
 * "Community Pool"). A lookup table keyed on exact strings silently falls
 * through to a default the first time someone types "Fenced yard" instead of
 * "Fenced Yard", and the page quietly loses its grouping. Keyword matching is
 * tolerant of that in the direction that fails safely.
 *
 * THE ICON IS NEVER THE CONTENT. Every amenity renders its label; the glyph is
 * a scanning aid. An unmatched amenity gets a neutral dot rather than a
 * plausible-but-wrong icon - showing a pool next to "Fireplace" is worse than
 * showing nothing, because a reader trusts it.
 *
 * IT RETURNS AN ICON *KEY*, NOT A COMPONENT. This module is pure data so it can
 * be tested without a renderer - and a lib module that imports JSX cannot be
 * loaded by the test runner at all. The key-to-component binding lives with the
 * component that draws it.
 *
 * ACCESSIBILITY FEATURES ARE A SEPARATE GROUP, not an amenity category. The
 * brief requires them described factually rather than sold, and mixing
 * "step-free entry" into a list beside "granite countertops" frames a
 * disability accommodation as a luxury feature.
 */

export type AmenityGroup = 'home' | 'kitchen' | 'outdoor' | 'community' | 'accessibility';

export const GROUP_LABEL: Record<AmenityGroup, string> = {
  home: 'Inside the home',
  kitchen: 'Kitchen',
  outdoor: 'Outside',
  community: 'Community',
  accessibility: 'Accessibility',
};

/**
 * Order groups by what a renter checks first, not alphabetically. Somebody
 * deciding whether to tour cares about the home before the clubhouse.
 */
export const GROUP_ORDER: AmenityGroup[] = ['home', 'kitchen', 'outdoor', 'community', 'accessibility'];

export type AmenityIcon =
  | 'pool' | 'yard' | 'garage' | 'fireplace' | 'kitchen' | 'laundry'
  | 'climate' | 'pet' | 'accessibility' | 'building' | 'sparkle'
  | 'flooring' | 'lighting' | 'closet' | 'bedroom' | 'floorplan'
  | 'lease' | 'nature' | 'water' | 'sport' | 'window' | 'dot';

type Rule = {
  /** Lowercased substrings. First match wins, so order matters. */
  match: string[];
  group: AmenityGroup;
  icon: AmenityIcon;
};

const RULES: Rule[] = [
  // ORDER IS LOAD-BEARING. Two overlaps to keep in mind when editing:
  //   "Community Pool" must not be caught by the pool rule, so community leads.
  //   "Dishwasher" contains "washer", so kitchen must precede laundry.
  { match: ['community', 'clubhouse', 'gym', 'fitness', 'playground'], group: 'community', icon: 'building' },
  { match: ['pool', 'spa', 'hot tub'], group: 'outdoor', icon: 'pool' },
  { match: ['yard', 'fenced', 'patio', 'deck', 'porch', 'lawn', 'garden'], group: 'outdoor', icon: 'yard' },
  { match: ['garage', 'carport', 'parking', 'driveway'], group: 'outdoor', icon: 'garage' },
  { match: ['fireplace'], group: 'home', icon: 'fireplace' },
  {
    match: ['kitchen', 'countertop', 'granite', 'quartz', 'appliance', 'stainless', 'dishwasher', 'range', 'oven', 'microwave', 'nook'],
    group: 'kitchen', icon: 'kitchen',
  },
  // 'w/d' catches "W/D Hookups", which reached the generic tick before.
  { match: ['washer', 'dryer', 'laundry', 'w/d'], group: 'home', icon: 'laundry' },
  { match: ['air conditioning', 'central air', 'hvac', 'heating', 'cooling', 'thermostat'], group: 'home', icon: 'climate' },
  { match: ['pet', 'dog', 'cat'], group: 'home', icon: 'pet' },
  { match: ['new construction', 'renovated', 'updated', 'smart home'], group: 'home', icon: 'sparkle' },

  // Everything below here previously fell through to the tick. These are the
  // labels the partner feeds actually send, checked against live inventory.
  { match: ['closet', 'storage', 'pantry', 'wardrobe'], group: 'home', icon: 'closet' },
  { match: ['lighting', 'recessed', 'ceiling fan', 'chandelier'], group: 'home', icon: 'lighting' },
  {
    match: ['flooring', 'carpet', 'hardwood', 'vinyl', 'laminate', 'plank', 'tile'],
    group: 'home', icon: 'flooring',
  },
  {
    match: ['bedroom on main', 'primary bedroom', 'master bedroom', 'ensuite', 'en-suite'],
    group: 'home', icon: 'bedroom',
  },
  {
    match: ['floorplan', 'floor plan', 'single story', 'single-story', 'open concept', 'two story', 'loft'],
    group: 'home', icon: 'floorplan',
  },
  { match: ['lease', 'rent term', 'month-to-month'], group: 'home', icon: 'lease' },
  {
    match: ['pond', 'lake', 'waterfront', 'creek', 'river', 'beach', 'boat', 'dock', 'jacuzzi', 'marina'],
    group: 'outdoor', icon: 'water',
  },
  {
    match: ['park', 'trail', 'greenbelt', 'green space', 'nature', 'wooded', 'tree'],
    group: 'outdoor', icon: 'nature',
  },
  {
    match: ['court', 'golf', 'tot lot', 'sport', 'soccer', 'baseball', 'pickleball'],
    group: 'community', icon: 'sport',
  },
  { match: ['balcony', 'window', 'vaulted', 'ceiling', 'skylight'], group: 'home', icon: 'window' },
  { match: ['bonus room', 'den', 'office', 'flex room'], group: 'home', icon: 'floorplan' },
];

export type ClassifiedAmenity = {
  label: string;
  group: AmenityGroup;
  icon: AmenityIcon;
};

export function classifyAmenity(label: string): ClassifiedAmenity {
  const needle = label.toLowerCase();
  const rule = RULES.find((r) => r.match.some((m) => needle.includes(m)));
  return { label, group: rule?.group ?? 'home', icon: rule?.icon ?? 'dot' };
}

export type AmenitySection = { group: AmenityGroup; label: string; items: ClassifiedAmenity[] };

/**
 * Group amenities for display.
 *
 * Accessibility features are passed separately and always land in their own
 * group, whatever they are named - see the note above.
 */
export function groupAmenities(
  amenities: readonly string[],
  accessibilityFeatures: readonly string[] = [],
): AmenitySection[] {
  const buckets = new Map<AmenityGroup, ClassifiedAmenity[]>();

  for (const label of amenities) {
    const classified = classifyAmenity(label);
    const list = buckets.get(classified.group) ?? [];
    list.push(classified);
    buckets.set(classified.group, list);
  }

  for (const label of accessibilityFeatures) {
    const list = buckets.get('accessibility') ?? [];
    list.push({ label, group: 'accessibility', icon: 'accessibility' });
    buckets.set('accessibility', list);
  }

  return GROUP_ORDER
    .filter((group) => (buckets.get(group)?.length ?? 0) > 0)
    .map((group) => ({
      group,
      label: GROUP_LABEL[group],
      // Alphabetical inside a group so the same home always reads the same way.
      items: (buckets.get(group) ?? []).slice().sort((a, b) => a.label.localeCompare(b.label)),
    }));
}
