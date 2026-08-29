'use client';

import { useRef, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { AlertIcon, CheckIcon } from '@/components/ui/Icons';
import { Pending } from '@/components/ui/Pending';
import type { RequestedDocument } from '@/lib/apply/status';
import styles from './status.module.css';

const MAX_BYTES = 15 * 1024 * 1024;
const ACCEPTED = ['image/jpeg', 'image/png', 'image/heic', 'image/webp', 'application/pdf'];

/**
 * Document upload.
 *
 * `capture="environment"` on a file input is what turns "upload a document"
 * into "photograph it" on a phone. Most of this audience does not own a
 * scanner, and asking them to find a desktop computer to finish an application
 * is asking a portion of them not to finish it.
 *
 * Validation runs before anything leaves the device: a wrong file type or an
 * oversized photo should be a message in half a second, not a failed upload
 * after ninety seconds on a metered connection.
 *
 * HEIC is accepted explicitly. It is what an iPhone produces by default, and
 * rejecting it would decline the most common file this flow will ever see.
 */
export function DocumentUpload({ documents }: { documents: RequestedDocument[] }) {
  const [selected, setSelected] = useState<Record<string, File[]>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const inputs = useRef<Record<string, HTMLInputElement | null>>({});

  function onPick(kind: string, files: FileList | null) {
    if (!files || files.length === 0) return;
    const accepted: File[] = [];
    let error = '';

    for (const file of Array.from(files)) {
      if (!ACCEPTED.includes(file.type) && !/\.(jpe?g|png|heic|webp|pdf)$/i.test(file.name)) {
        error = `${file.name} is not a photo or PDF. Take a picture of the document, or export it as a PDF.`;
        continue;
      }
      if (file.size > MAX_BYTES) {
        error = `${file.name} is too large. Most phone cameras have a setting to reduce photo size, or send it in two parts.`;
        continue;
      }
      accepted.push(file);
    }

    setSelected((prev) => ({ ...prev, [kind]: [...(prev[kind] ?? []), ...accepted] }));
    setErrors((prev) => ({ ...prev, [kind]: error }));
  }

  return (
    <div className={styles.uploads}>
      {documents.map((doc) => {
        const files = selected[doc.kind] ?? [];
        const error = errors[doc.kind];

        return (
          <section className={styles.uploadBlock} key={doc.kind} aria-labelledby={`doc-${doc.kind}`}>
            <div className={styles.uploadHead}>
              <h3 className={styles.uploadTitle} id={`doc-${doc.kind}`}>
                {doc.label}
              </h3>
              <span className={doc.required ? styles.docRequired : styles.docOptional}>
                {doc.required ? 'Needed' : 'Optional'}
              </span>
            </div>

            <p className={styles.uploadWhy}>{doc.why}</p>

            <input
              ref={(el) => {
                inputs.current[doc.kind] = el;
              }}
              className={styles.fileInput}
              id={`file-${doc.kind}`}
              type="file"
              multiple
              accept="image/*,.pdf,.heic"
              capture="environment"
              onChange={(e) => onPick(doc.kind, e.target.files)}
            />
            <label className={styles.fileLabel} htmlFor={`file-${doc.kind}`}>
              Take a photo or choose a file
            </label>

            {files.length > 0 ? (
              <ul className={styles.fileList} role="list">
                {files.map((file) => (
                  <li className={styles.fileItem} key={file.name + file.size}>
                    <CheckIcon className={styles.fileIcon} />
                    <span className={styles.fileName}>{file.name}</span>
                    <span className={styles.fileSize}>
                      {(file.size / 1024 / 1024).toFixed(1)} MB
                    </span>
                  </li>
                ))}
              </ul>
            ) : null}

            {error ? (
              <p className={styles.uploadError} role="alert">
                <AlertIcon className={styles.fileIcon} />
                <span>{error}</span>
              </p>
            ) : null}
          </section>
        );
      })}

      <div className={styles.uploadFooter}>
        {/* Storage needs the same infrastructure as the image pipeline. A
            button that appears to upload and silently drops an applicant's
            identity document would be considerably worse than a disabled one. */}
        <Button disabled>Send these documents - needs file storage</Button>
        <p className={styles.storageNote}>
          Document storage: encrypted at rest, access-logged, and retained per the privacy policy.
        </p>
      </div>
    </div>
  );
}
