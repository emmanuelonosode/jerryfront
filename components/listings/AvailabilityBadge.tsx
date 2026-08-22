import { AVAILABILITY_LABEL, AVAILABILITY_TONE, type Availability } from '@/lib/listings/types';
import { CheckIcon, ClockIcon, AlertIcon } from '@/components/ui/Icons';
import styles from './AvailabilityBadge.module.css';

const ICONS = {
  available: CheckIcon,
  soon: ClockIcon,
  pending: AlertIcon,
  leased: AlertIcon,
} as const;

/**
 * Availability badge - five states.
 *
 * Icon + text label + colour, always all three. The brief requires it, and in
 * this palette it matters more than usual: these badges are the only chromatic
 * elements on the page, so a colourblind user has no surrounding hue to
 * calibrate against. The badge survives a greyscale screenshot.
 *
 * A coming-soon badge shows its date inline. "Coming soon" with no date is an
 * advert for a home that may not exist, which is why the record model refuses
 * to publish one.
 */
export function AvailabilityBadge({
  availability,
  availableFrom,
  size = 'md',
}: {
  availability: Availability;
  availableFrom?: string | null;
  size?: 'sm' | 'md';
}) {
  const tone = AVAILABILITY_TONE[availability];
  const Icon = ICONS[tone];

  const dated =
    availability === 'coming-soon' && availableFrom
      ? new Date(`${availableFrom}T00:00:00`).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
        })
      : null;

  return (
    <span className={[styles.badge, styles[tone], styles[size]].join(' ')}>
      <Icon className={styles.icon} />
      <span>
        {AVAILABILITY_LABEL[availability]}
        {dated ? <span className={styles.date}> · {dated}</span> : null}
      </span>
    </span>
  );
}
