'use client';

import { useRef, useState } from 'react';
import { AlertIcon, CheckIcon, DocumentIcon } from '@/components/ui/Icons';
import styles from './ProofUpload.module.css';

/** Kept in step with the server allowlist in app/(site)/apply/actions.ts. */
const ACCEPTED = 'image/png,image/jpeg,image/webp,image/heic,image/heif,application/pdf';
const MAX_BYTES = 10 * 1024 * 1024;

function readableSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

/**
 * Proof of payment.
 *
 * WHY THIS IS A COMPONENT AND NOT AN `<input type="file">`. It was the bare
 * control, unstyled, sitting between two other fields: a grey "Choose File"
 * button roughly 90px wide and the words "No file chosen". On a phone - which
 * is where nearly all of this audience is, and where the receipt actually
 * lives, in the banking app they just used - that is a 90px target for the one
 * action the whole step exists to collect, with no way to tell afterwards
 * whether the right file was picked.
 *
 * So: a full-width target well past the 44px floor, the chosen file named back
 * with its size, and a thumbnail for images. The preview is the part that
 * earns its keep - people photograph the wrong screen, and seeing it is the
 * only way they find out before we do.
 *
 * IT IS STILL A REAL FILE INPUT. The visible surface is a `<label>` bound to
 * it, so with no JavaScript this degrades to the browser's own picker inside
 * our styling rather than to nothing. The size and type checks below are a
 * courtesy that saves a round trip; `applyStepUpdate` re-checks both, because
 * anything the client asserts about a file is a suggestion.
 */
export function ProofUpload({
  name = 'paymentProof',
  savedFilename,
  error,
}: {
  name?: string;
  /** Set once a file has been stored for this draft. */
  savedFilename?: string | null;
  /** Server-side rejection or validation message. */
  error?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [picked, setPicked] = useState<{ name: string; size: number } | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);

  function onChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (preview) URL.revokeObjectURL(preview);
    setPreview(null);

    if (!file) {
      setPicked(null);
      setLocalError(null);
      return;
    }

    if (file.size > MAX_BYTES) {
      // Cleared, not kept: leaving an over-size file selected means the form
      // posts 14MB to be told no, which on a slow uplink is a minute of
      // someone's life for an answer we already have.
      setPicked(null);
      setLocalError(
        `That file is ${readableSize(file.size)}, and the limit is 10 MB. A screenshot is usually far smaller than a full-resolution photo.`,
      );
      event.target.value = '';
      return;
    }

    setLocalError(null);
    setPicked({ name: file.name, size: file.size });
    if (file.type.startsWith('image/')) setPreview(URL.createObjectURL(file));
  }

  const shown = localError ?? error;
  const hasFile = picked !== null || Boolean(savedFilename);

  return (
    <div className={styles.wrap}>
      <input
        ref={inputRef}
        className={styles.input}
        type="file"
        id={name}
        name={name}
        accept={ACCEPTED}
        onChange={onChange}
        aria-describedby={`${name}-help`}
        aria-invalid={shown ? true : undefined}
      />

      <label
        className={[styles.drop, hasFile ? styles.dropFilled : '', shown ? styles.dropError : '']
          .filter(Boolean)
          .join(' ')}
        htmlFor={name}
      >
        {preview ? (
          /* eslint-disable-next-line @next/next/no-img-element --
             A local object URL for a file that has not left the device yet;
             there is nothing for an image optimiser to fetch. */
          <img className={styles.thumb} src={preview} alt="" />
        ) : (
          <span className={styles.icon} aria-hidden="true">
            {hasFile ? <CheckIcon /> : <DocumentIcon />}
          </span>
        )}

        <span className={styles.dropBody}>
          {picked ? (
            <>
              <span className={styles.dropTitle}>{picked.name}</span>
              <span className={styles.dropMeta}>
                {readableSize(picked.size)} · Tap to choose a different file
              </span>
            </>
          ) : savedFilename ? (
            <>
              <span className={styles.dropTitle}>Receipt attached</span>
              <span className={styles.dropMeta}>
                {savedFilename} · Tap to replace it
              </span>
            </>
          ) : (
            <>
              <span className={styles.dropTitle}>Add your payment receipt</span>
              {/* Two short lines rather than one long one: at 375px the single
                  sentence wrapped to three ragged lines inside the dashed box
                  and read as fine print rather than as an instruction. */}
              <span className={styles.dropMeta}>Take a photo or pick a screenshot</span>
              <span className={styles.dropMetaFaint}>PNG, JPG, HEIC, WEBP or PDF · up to 10 MB</span>
            </>
          )}
        </span>
      </label>

      {shown ? (
        <p className={styles.error} role="alert">
          <AlertIcon className={styles.errorIcon} />
          <span>{shown}</span>
        </p>
      ) : null}

      <p className={styles.help} id={`${name}-help`}>
        The screenshot from your banking or payment app is ideal — it shows the amount, the
        date, and where it went. Make sure the reference above is visible if your app shows it.
      </p>
    </div>
  );
}
