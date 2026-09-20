'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiFetch, type PortalUser } from '@/lib/portal/api';
import { LeaseAgreementDocument } from '@/components/legal/LeaseAgreementDocument';
import { SignaturePad } from '@/components/legal/SignaturePad';
import styles from './PortalLease.module.css';

interface ApplicationData {
  id: string;
  status: string;
  status_display: string;
  move_in_date: string | null;
  security_deposit_cents: number | null;
  property: {
    id: string;
    title: string;
    address: string;
    city: string;
    state: string;
    zip_code: string;
    full_address: string;
    bedrooms: number;
    bathrooms: number;
    price_cents: number;
  } | null;
}

export function PortalLeaseClient() {
  const [user, setUser] = useState<PortalUser | null>(null);
  const [application, setApplication] = useState<ApplicationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showSignModal, setShowSignModal] = useState(false);

  const [signatureUrl, setSignatureUrl] = useState<string | null>(null);
  const [signedAt, setSignedAt] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      try {
        const me = await apiFetch<PortalUser>('/auth/me/');
        if (!cancelled) setUser(me);

        const apps = await apiFetch<ApplicationData[]>('/apply/my-applications/').catch(() => []);
        if (!cancelled && apps && apps.length > 0) {
          // Select the most recent application
          setApplication(apps[0]);

          // Check if there is already a saved signature in localStorage for this user/application
          const stored = localStorage.getItem(`skelton_lease_sig_${apps[0].id}`);
          if (stored) {
            try {
              const parsed = JSON.parse(stored);
              setSignatureUrl(parsed.signatureUrl);
              setSignedAt(parsed.signedAt);
            } catch {
              // ignore parse errors
            }
          }
        } else {
          const stored = localStorage.getItem('skelton_lease_sig_general');
          if (stored) {
            try {
              const parsed = JSON.parse(stored);
              setSignatureUrl(parsed.signatureUrl);
              setSignedAt(parsed.signedAt);
            } catch {
              // ignore parse errors
            }
          }
        }
      } catch (err) {
        console.error('Failed to load user or lease data', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadData();

    return () => {
      cancelled = true;
    };
  }, []);

  const handlePrint = () => {
    if (typeof window !== 'undefined') {
      window.print();
    }
  };

  const handleSignatureSave = (data: { type: 'draw' | 'type'; dataUrl: string; signerName: string }) => {
    const now = new Date();
    const timestamp = now.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });

    setSignatureUrl(data.dataUrl);
    setSignedAt(timestamp);
    setShowSignModal(false);

    // Persist
    const storageKey = application ? `skelton_lease_sig_${application.id}` : 'skelton_lease_sig_general';
    localStorage.setItem(
      storageKey,
      JSON.stringify({
        signatureUrl: data.dataUrl,
        signedAt: timestamp,
        signerName: data.signerName,
      }),
    );
  };

  // Derive document values from application or smart defaults
  const tenantName = user?.full_name || 'Resident';
  const tenantEmail = user?.email || 'resident@example.com';
  const tenantPhone = user?.phone || '';

  const property = application?.property;
  const propAddress = property?.full_address || property?.address || '200 Cleveland Ave, Kingsford, MI 49802';
  const beds = property?.bedrooms ? `${property.bedrooms} (${property.bedrooms})` : 'two (2)';
  const baths = property?.bathrooms ? `${property.bathrooms} (${property.bathrooms})` : 'two (2)';

  const rentMonthlyCents = property?.price_cents || 100000;
  const rentMonthly = `$${(rentMonthlyCents / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
  const rentAnnual = `$${((rentMonthlyCents * 12) / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}`;

  const depositCents = application?.security_deposit_cents || rentMonthlyCents;
  const depositFormatted = `$${(depositCents / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}`;

  const startDate = application?.move_in_date
    ? new Date(application.move_in_date).toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      })
    : 'September 6, 2024';

  // End date is 1 year minus 1 day from start date
  const startObj = application?.move_in_date ? new Date(application.move_in_date) : new Date(2024, 8, 6);
  const endObj = new Date(startObj);
  endObj.setFullYear(endObj.getFullYear() + 1);
  endObj.setDate(endObj.getDate() - 1);
  const endDate = endObj.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  const agreementDate = new Date().toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <div className={styles.page}>
      {/* Top Banner Navigation & Action Bar */}
      <div className={styles.actionBar}>
        <div className={styles.actionLeft}>
          <Link href="/portal/documents" className={styles.backLink}>
            ← Back to Documents
          </Link>
          <div className={styles.docMeta}>
            <h1 className={styles.pageTitle}>Residential Lease Agreement</h1>
            <p className={styles.pageSubtitle}>
              {property ? property.title || propAddress : 'Official Lease Document'}
            </p>
          </div>
        </div>

        <div className={styles.actionRight}>
          {signatureUrl ? (
            <div className={styles.signedStatusBadge}>
              <span className={styles.greenDot} />
              <span>Signed &amp; Active</span>
            </div>
          ) : (
            <div className={styles.pendingStatusBadge}>
              <span className={styles.yellowDot} />
              <span>Signature Required</span>
            </div>
          )}

          {!signatureUrl && (
            <button
              type="button"
              onClick={() => setShowSignModal(true)}
              className={styles.signButton}
            >
              ✍️ Sign Agreement Now
            </button>
          )}

          <button type="button" onClick={handlePrint} className={styles.printButton}>
            🖨️ Print / Download PDF
          </button>
        </div>
      </div>

      {/* Signature Modal */}
      {showSignModal && (
        <div className={styles.modalBackdrop}>
          <div className={styles.modalContent}>
            <SignaturePad
              initialName={user?.full_name || ''}
              onSave={handleSignatureSave}
              onCancel={() => setShowSignModal(false)}
            />
          </div>
        </div>
      )}

      {/* Agreement Preview / Display */}
      {loading ? (
        <div className={styles.loadingBox}>
          <p>Loading your official lease agreement…</p>
        </div>
      ) : (
        <div className={styles.docWrapper}>
          <LeaseAgreementDocument
            stateName={property?.state ? `State of ${property.state}` : 'State of Michigan'}
            agreementDate={agreementDate}
            landlordName="Kenneth Hensley Jr"
            landlordCompany="Skelton Realty Group"
            landlordAddress="213 Bob Ln, Virginia Beach, VA 23454"
            landlordEmail="kenneth@skeltonrealtygroup.com"
            tenantName={tenantName}
            tenantAddress={propAddress}
            tenantEmail={tenantEmail}
            tenantPhone={tenantPhone}
            propertyType="single-family residence"
            bedrooms={beds}
            bathrooms={baths}
            parkingSpaces="two (2)"
            propertyAddress={propAddress}
            termStartDate={startDate}
            termEndDate={endDate}
            annualRent={rentAnnual}
            monthlyRent={rentMonthly}
            securityDeposit={depositFormatted}
            tenantSignatureUrl={signatureUrl}
            signedAt={signedAt}
            isSample={false}
          />
        </div>
      )}
    </div>
  );
}
