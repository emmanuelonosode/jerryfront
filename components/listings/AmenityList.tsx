import {
  AccessibilityIcon, BedroomIcon, BuildingIcon, CheckIcon, ClimateIcon, ClosetIcon,
  FireplaceIcon, FloorplanIcon, FlooringIcon, GarageIcon, KitchenIcon, LaundryIcon,
  LeaseIcon, LightingIcon, NatureIcon, PetIcon, PoolIcon, SparkleIcon, SportIcon,
  WaterIcon, WindowIcon, YardIcon,
} from '@/components/ui/Icons';
import { groupAmenities, type AmenityIcon } from '@/lib/listings/amenities';
import styles from './AmenityList.module.css';

/**
 * Amenities, grouped with icons.
 *
 * The icon-key to component binding lives here rather than in the taxonomy,
 * because `lib/listings/amenities.ts` is pure data - that is what lets it be
 * tested without a renderer.
 *
 * Icons are decorative and hidden from assistive technology: every one sits
 * beside its label, so a screen reader announcing "image, pool" before the word
 * "Pool" would just be repetition. The label is the content.
 */
const ICONS: Record<AmenityIcon, React.ComponentType<{ className?: string }>> = {
  pool: PoolIcon,
  yard: YardIcon,
  garage: GarageIcon,
  fireplace: FireplaceIcon,
  kitchen: KitchenIcon,
  laundry: LaundryIcon,
  climate: ClimateIcon,
  pet: PetIcon,
  accessibility: AccessibilityIcon,
  building: BuildingIcon,
  sparkle: SparkleIcon,
  flooring: FlooringIcon,
  lighting: LightingIcon,
  closet: ClosetIcon,
  bedroom: BedroomIcon,
  floorplan: FloorplanIcon,
  lease: LeaseIcon,
  nature: NatureIcon,
  water: WaterIcon,
  sport: SportIcon,
  window: WindowIcon,
  // The fallback for amenities with no icon of their own. A tick, not a bare
  // dot: every row here is something the home HAS, and a plain circle reads as
  // a list that ran out of icons rather than as a feature.
  dot: CheckIcon,
};

export function AmenityList({
  amenities,
  accessibilityFeatures = [],
}: {
  amenities: readonly string[];
  accessibilityFeatures?: readonly string[];
}) {
  const sections = groupAmenities(amenities, accessibilityFeatures);
  if (sections.length === 0) return null;

  return (
    <div className={styles.groups}>
      {sections.map((section) => (
        <section key={section.group} className={styles.group}>
          <h3 className={styles.groupTitle}>{section.label}</h3>
          {section.group === 'accessibility' ? (
            /* Stated factually, never as a selling point and never as a
               qualifier on who may apply. */
            <p className={styles.note}>
              Described as built. Ask us if you need something confirmed before you apply.
            </p>
          ) : null}
          <ul className={styles.list} role="list">
            {section.items.map((item) => {
              const Icon = ICONS[item.icon];
              return (
                <li key={item.label} className={styles.item}>
                  <Icon className={styles.icon} />
                  <span>{item.label}</span>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
