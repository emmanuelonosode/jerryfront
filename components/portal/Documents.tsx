'use client';

import { useEffect, useMemo, useState } from 'react';
import { Illustration } from '@/components/brand/Illustration';
import { DocumentIcon } from '@/components/ui/Icons';
import { ApiError, apiFetch } from '@/lib/portal/api';
import styles from './portal.module.css';
import own from './Documents.module.css';

type Doc = {
  id: string;
  name: string;
  file_url: string;
  document_type: string;
  document_type_display: string;
  is_signed: boolean;
  created_at: string;
  expires_at: string | null;
  expires_soon: boolean;
};

/**
 * Category tabs.
 *
 * Grouped by what a resident is looking for rather than by the model's eight
 * document types: nobody arrives thinking "I need an AGREEMENT". Identity and
 * proof-of-funds sit together because they are the two things people are asked
 * to re-supply and want to check they already sent.
 */
const TABS = [
  { key: 'all', label: 'All documents', types: null },
  { key: 'lease', label: 'Leases & contracts', types: ['CONTRACT', 'AGREEMENT'] },
  { key: 'money', label: 'Receipts & financials', types: ['RECEIPT'] },
  { key: 'identity', label: 'Identity & funds', types: ['ID_DOCUMENT', 'PROOF_OF_FUNDS'] },
  { key: 'other', label: 'Other', types: ['OTHER'] },
] as const;

export function Documents() {
  const [tab, setTab] = useState<(typeof TABS)[number]['key']>('all');
  const [docs, setDocs] = useState<Doc[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    apiFetch<Doc[]>('/portal/documents/')
      .then((rows) => {
        if (!cancelled) setDocs(rows);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(
          err instanceof ApiError
            ? (err.userMessage ?? 'We could not load your documents.')
            : 'We could not reach the server.',
        );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Filtered on the client: the whole set is small, already fetched, and
  // round-tripping per tab would make the filters feel slower than they are.
  const visible = useMemo(() => {
    const active = TABS.find((t) => t.key === tab);
    if (!active?.types) return docs;
    return docs.filter((d) => active.types.includes(d.document_type as never));
  }, [docs, tab]);

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Documents</h1>
          <p className={styles.lead}>
            Your lease, signed agreements, receipts and anything you have sent us.
          </p>
        </div>
      </header>

      <div className={styles.tabs} role="group" aria-label="Filter documents">
        {TABS.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            className={tab === key ? styles.tabActive : styles.tab}
            aria-pressed={tab === key}
            onClick={() => setTab(key)}
          >
            {label}
          </button>
        ))}
      </div>

      {error ? (
        <p className={styles.error} role="alert">
          {error}
        </p>
      ) : loading ? (
        <p className={styles.muted}>Loading your documents…</p>
      ) : visible.length === 0 ? (
        <section className={styles.card}>
          <div className={styles.empty}>
            <Illustration name="voucher" label="No documents" className={styles.emptyArt} />
            <h2 className={styles.cardTitle}>Nothing here yet</h2>
            <p className={styles.muted}>
              Documents appear here as they are signed or uploaded - your lease, receipts, and
              anything staff send you.
            </p>
          </div>
        </section>
      ) : (
        <ul className={own.grid} role="list">
          {visible.map((doc) => (
            <li className={`${styles.card} ${own.doc}`} key={doc.id}>
              <div className={own.docHead}>
                <DocumentIcon className={own.docIcon} />
                <div className={own.docText}>
                  <p className={own.docName}>{doc.name}</p>
                  <p className={styles.muted}>
                    {doc.document_type_display} · added{' '}
                    {new Date(doc.created_at).toLocaleDateString('en-US', {
                      month: 'short', day: 'numeric', year: 'numeric',
                    })}
                  </p>
                </div>
              </div>

              <div className={own.badges}>
                {doc.is_signed ? (
                  <span className={own.signed}>Signed</span>
                ) : (
                  <span className={own.unsigned}>Awaiting signature</span>
                )}
                {doc.expires_soon ? (
                  <span className={own.expiring}>
                    Expires{' '}
                    {doc.expires_at
                      ? new Date(doc.expires_at).toLocaleDateString('en-US', {
                          month: 'short', day: 'numeric',
                        })
                      : 'soon'}
                  </span>
                ) : null}
              </div>

              {/* `download` plus an explicit new tab: these are PDFs served from
                  another origin, and a same-tab navigation that renders in the
                  browser's viewer loses the resident their place in the portal. */}
              <a
                className={own.download}
                href={doc.file_url}
                download
                target="_blank"
                rel="noopener noreferrer"
              >
                Download
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
