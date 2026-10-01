'use client';

import { TextInput } from '@/components/ui/Controls';
import {
  EARLIEST_TIME,
  LATEST_TIME,
  formatWindow,
  slotsFor,
  windowIssue,
  type SelectableDate,
  type TimeWindow,
} from '@/lib/tours/request';
import styles from './TourTimePicker.module.css';

/**
 * Day and hour for a tour.
 *
 * TAPPABLE CHIPS, NOT SELECTS. A `<select>` of hours on a phone is a wheel the
 * visitor spins blind; a grid of "9am – 10am" buttons shows every option at
 * once and takes one tap. Each chip is still a real radio input, so arrow keys,
 * screen readers and no-JS form posts all behave as a radio group does.
 *
 * CUSTOM IS ONE MORE CHIP. Someone who can only make 12:30 on their lunch break
 * should not have to pick the nearest hour and explain in the notes. Choosing
 * it reveals two time fields, checked as they type against the same rules the
 * API applies.
 */
export function TourTimePicker({
  idPrefix,
  dates,
  date,
  onDateChange,
  window,
  onWindowChange,
  dateError,
  windowError,
}: {
  /** Keeps ids and radio names unique when two pickers share a page. */
  idPrefix: string;
  dates: SelectableDate[];
  date: string;
  onDateChange: (date: string) => void;
  window: TimeWindow | null;
  onWindowChange: (window: TimeWindow | null) => void;
  dateError?: string;
  windowError?: string;
}) {
  const slots = date ? slotsFor(date) : [];
  const custom = window?.custom ?? false;
  const customProblem =
    custom && window && window.start && window.end ? windowIssue(window) : null;

  function pickDate(next: string) {
    onDateChange(next);
    // A slot that has already passed on the new day must not stay selected.
    if (window && !window.custom && !slotsFor(next).some((s) => s.start === window.start)) {
      onWindowChange(null);
    }
  }

  return (
    <div className={styles.picker}>
      <fieldset className={styles.group}>
        <legend className={styles.legend}>Which day?</legend>
        <div className={styles.days} role="presentation">
          {dates.map((d) => (
            <label key={d.value} className={styles.chip}>
              <input
                className={styles.radio}
                type="radio"
                name={`${idPrefix}-date`}
                value={d.value}
                checked={date === d.value}
                onChange={() => pickDate(d.value)}
                aria-label={d.label}
              />
              <span className={styles.dayFace}>
                <span className={styles.dayTop}>{d.weekday}</span>
                <span className={styles.dayBottom}>{d.short}</span>
              </span>
            </label>
          ))}
        </div>
        {dateError ? (
          <p className={styles.error} role="alert">
            {dateError}
          </p>
        ) : null}
      </fieldset>

      <fieldset className={styles.group} disabled={!date}>
        <legend className={styles.legend}>What time?</legend>
        {!date ? <p className={styles.hint}>Pick a day first.</p> : null}
        {date && slots.length === 0 ? (
          <p className={styles.hint}>
            No hourly slots left today. Pick another day, or set a custom time below.
          </p>
        ) : null}

        <div className={styles.slots}>
          {slots.map((slot) => (
            <label key={slot.start} className={styles.chip}>
              <input
                className={styles.radio}
                type="radio"
                name={`${idPrefix}-time`}
                value={`${slot.start}-${slot.end}`}
                checked={!custom && window?.start === slot.start}
                onChange={() => onWindowChange(slot)}
              />
              <span className={styles.slotFace}>{formatWindow(slot)}</span>
            </label>
          ))}
          <label className={`${styles.chip} ${styles.customChip}`}>
            <input
              className={styles.radio}
              type="radio"
              name={`${idPrefix}-time`}
              value="custom"
              checked={custom}
              onChange={() =>
                onWindowChange({ start: window?.start ?? '', end: window?.end ?? '', custom: true })
              }
            />
            <span className={styles.slotFace}>Custom time</span>
          </label>
        </div>

        {custom ? (
          <div className={styles.custom}>
            <div className={styles.customPair}>
              <label className={styles.customField} htmlFor={`${idPrefix}-start`}>
                <span className={styles.customLabel}>From</span>
                <TextInput
                  id={`${idPrefix}-start`}
                  type="time"
                  figure
                  min={EARLIEST_TIME}
                  max={LATEST_TIME}
                  step={900}
                  value={window?.start ?? ''}
                  onChange={(e) =>
                    onWindowChange({ start: e.target.value, end: window?.end ?? '', custom: true })
                  }
                />
              </label>
              <label className={styles.customField} htmlFor={`${idPrefix}-end`}>
                <span className={styles.customLabel}>To</span>
                <TextInput
                  id={`${idPrefix}-end`}
                  type="time"
                  figure
                  min={EARLIEST_TIME}
                  max={LATEST_TIME}
                  step={900}
                  value={window?.end ?? ''}
                  onChange={(e) =>
                    onWindowChange({ start: window?.start ?? '', end: e.target.value, custom: true })
                  }
                />
              </label>
            </div>
            {customProblem ? (
              <p className={styles.error} role="alert">
                {customProblem}
              </p>
            ) : window?.start && window?.end ? (
              <p className={styles.hint}>
                You chose <strong>{formatWindow(window)}</strong>.
              </p>
            ) : (
              <p className={styles.hint}>Any range between 7am and 9pm, up to four hours.</p>
            )}
          </div>
        ) : null}

        {windowError && !customProblem ? (
          <p className={styles.error} role="alert">
            {windowError}
          </p>
        ) : null}
      </fieldset>
    </div>
  );
}
