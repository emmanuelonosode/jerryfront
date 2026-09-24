'use client';

import { useEffect, useLayoutEffect, useRef, type ClipboardEvent, type KeyboardEvent } from 'react';
import styles from './OtpInput.module.css';

export type OtpStatus = 'idle' | 'verifying' | 'success' | 'error';

interface OtpInputProps {
  length?: number;
  value: string;
  onChange: (val: string) => void;
  disabled?: boolean;
  /**
   * What the code is doing. `verifying` runs a neutral light round the slots
   * (the wait is not a verdict); `success` settles them green; `error` shakes
   * them once. Callers that omit it get the plain entry behaviour.
   */
  status?: OtpStatus;
}

const reducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** A hand of cards: each slot's tilt while stacked, spread symmetrically. */
function fanAngles(length: number): number[] {
  const step = 6;
  return Array.from({ length }, (_, i) => (i - (length - 1) / 2) * step);
}

/**
 * One-time code entry, dealt out like a hand of cards.
 *
 * THE DEAL. On mount the slots start stacked in the middle, fanned around one
 * pivot point below the row (`transform-origin: 50% 320%`), and are dealt out
 * into place. Because every slot rotates about a point far beneath it, a single
 * rotation both spreads and lifts them along an arc - a hand of cards, not six
 * boxes tilting on their own centres.
 *
 * THE LAP. Each digit sends a spark once round that slot's edge: an SVG rect
 * with `pathLength=1`, so the dash maths is the same at any size.
 *
 * STILL A ROW OF INPUTS. Separate fields keep the platform behaviour people
 * rely on - SMS autofill on the first field, paste of the whole code, and
 * backspace walking back. All motion is skipped under reduced motion.
 */
export function OtpInput({ length = 6, value, onChange, disabled, status = 'idle' }: OtpInputProps) {
  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);
  const slotsRef = useRef<(HTMLLabelElement | null)[]>([]);
  const sparksRef = useRef<(SVGRectElement | null)[]>([]);
  const rowRef = useRef<HTMLDivElement | null>(null);
  const previous = useRef(value);

  // The deal, once, before first paint so the row never flashes in place first.
  useLayoutEffect(() => {
    if (reducedMotion()) return;
    const slots = slotsRef.current.filter(Boolean) as HTMLElement[];
    if (!slots.length || typeof slots[0].animate !== 'function') return;
    const angles = fanAngles(slots.length);
    const centre = slots.reduce((sum, el) => sum + el.offsetLeft + el.offsetWidth / 2, 0) / slots.length;
    slots.forEach((slot, i) => {
      const dx = centre - (slot.offsetLeft + slot.offsetWidth / 2);
      slot.animate(
        [
          { transform: `translateX(${dx}px) rotate(${angles[i]}deg)`, opacity: 0 },
          { transform: `translateX(${dx * 0.35}px) rotate(${angles[i]}deg)`, opacity: 1, offset: 0.35 },
          { transform: 'translateX(0) rotate(0deg)', opacity: 1 },
        ],
        { duration: 560, delay: i * 45, easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)', fill: 'backwards' },
      );
    });
  }, []);

  // A spark round the edge of every slot that just received a digit.
  useEffect(() => {
    const before = previous.current;
    previous.current = value;
    if (reducedMotion()) return;
    for (let i = 0; i < length; i += 1) {
      if (value[i] && value[i] !== before[i]) {
        sparksRef.current[i]?.animate(
          [{ strokeDashoffset: 0, opacity: 1 }, { strokeDashoffset: -1, opacity: 0.2 }],
          { duration: 520, easing: 'cubic-bezier(0.4, 0, 0.2, 1)' },
        );
        slotsRef.current[i]?.querySelector(`.${styles.digit}`)?.animate(
          [{ transform: 'scale(0.6)', opacity: 0 }, { transform: 'scale(1.08)', offset: 0.6 }, { transform: 'scale(1)', opacity: 1 }],
          { duration: 220, easing: 'ease-out' },
        );
      }
    }
  }, [value, length]);

  // Success: a wave of lifts across the hand. Error: one shake of the row.
  useEffect(() => {
    if (reducedMotion()) return;
    if (status === 'success') {
      slotsRef.current.forEach((slot, i) =>
        slot?.animate(
          [{ transform: 'translateY(0)' }, { transform: 'translateY(-8px)' }, { transform: 'translateY(0)' }],
          { duration: 420, delay: i * 55, easing: 'cubic-bezier(0.3, 0.7, 0.4, 1)' },
        ),
      );
    }
    if (status === 'error') {
      rowRef.current?.animate(
        [0, -10, 9, -7, 5, -3, 0].map((x) => ({ transform: `translateX(${x}px)` })),
        { duration: 420, easing: 'ease-out' },
      );
    }
  }, [status]);

  const focusInput = (index: number) => {
    if (index >= 0 && index < length) {
      inputsRef.current[index]?.focus();
      setTimeout(() => inputsRef.current[index]?.setSelectionRange(1, 1), 0);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e.key === 'Backspace') {
      e.preventDefault();
      const current = value.split('');
      if (current[index]) {
        current[index] = '';
        onChange(current.join(''));
      } else if (index > 0) {
        current[index - 1] = '';
        onChange(current.join(''));
        focusInput(index - 1);
      }
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      focusInput(index - 1);
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      focusInput(index + 1);
    }
  };

  const handleChange = (val: string, index: number) => {
    const digitsOnly = val.replace(/\D/g, '');
    // SMS autofill and some keyboards drop the whole code into one field.
    if (digitsOnly.length > 1) {
      const code = digitsOnly.slice(0, length);
      onChange(code);
      focusInput(Math.min(code.length, length - 1));
      return;
    }
    const next = value.padEnd(length, ' ').split('');
    next[index] = digitsOnly || ' ';
    onChange(next.join('').replace(/\s+$/, '').slice(0, length));
    if (digitsOnly && index < length - 1) focusInput(index + 1);
  };

  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, length);
    if (!pasted) return;
    onChange(pasted);
    focusInput(Math.min(pasted.length, length - 1));
  };

  const digits = value.padEnd(length, ' ').split('');
  const rowClass = [styles.row, styles[status]].filter(Boolean).join(' ');

  return (
    <div className={styles.wrap}>
      <div className={rowClass} ref={rowRef} role="group" aria-label={`${length}-digit code`}>
        {digits.map((digit, index) => (
          <label
            key={index}
            className={styles.slot}
            ref={(el) => {
              slotsRef.current[index] = el;
            }}
            style={{ ['--i' as string]: index }}
          >
            <input
              ref={(el) => {
                inputsRef.current[index] = el;
              }}
              className={styles.input}
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              autoComplete={index === 0 ? 'one-time-code' : 'off'}
              maxLength={index === 0 ? length : 2}
              value={digit.trim()}
              disabled={disabled || status === 'verifying' || status === 'success'}
              onChange={(e) => handleChange(e.target.value, index)}
              onKeyDown={(e) => handleKeyDown(e, index)}
              onPaste={handlePaste}
              onFocus={(e) => e.target.select()}
              aria-label={`Digit ${index + 1} of ${length}`}
            />
            <span className={styles.digit} aria-hidden="true">{digit.trim()}</span>
            {/* Fixed view box sized like the slot; strokes do not scale, so the
                outline stays crisp however wide the slot is on a given phone. */}
            <svg className={styles.spark} viewBox="0 0 48 58" aria-hidden="true" preserveAspectRatio="none">
              <rect
                ref={(el) => {
                  sparksRef.current[index] = el;
                }}
                className={styles.sparkPath}
                x="1" y="1" width="46" height="56" rx="11"
                pathLength={1}
              />
              <rect className={styles.sealPath} x="1" y="1" width="46" height="56" rx="11" pathLength={1} />
            </svg>
          </label>
        ))}
      </div>
      <input type="hidden" name="otp" value={value} />
    </div>
  );
}
