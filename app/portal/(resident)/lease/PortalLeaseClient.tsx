'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { API_BASE } from '@/lib/env';
import { apiFetch, type PortalUser } from '@/lib/portal/api';
import { LeaseAgreementDocument } from '@/components/legal/LeaseAgreementDocument';
import { SignaturePad } from '@/components/legal/SignaturePad';
import { TenantQuestionnaireModal, type QuestionnaireData } from '@/components/legal/TenantQuestionnaireModal';
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

  // Modals
  const [showSignModal, setShowSignModal] = useState(false);
  const [showQuestionnaire, setShowQuestionnaire] = useState(false);

  // Signature state
  const [signatureUrl, setSignatureUrl] = useState<string | null>(null);
  const [signedAt, setSignedAt] = useState<string | null>(null);

  // Landlord of record for this house
  const [landlordName, setLandlordName] = useState('Kenneth Hensley Jr');
  const [landlordCompany, setLandlordCompany] = useState('Skelton Realty Group');
  const [landlordAddress, setLandlordAddress] = useState('213 Bob Ln, Virginia Beach, VA 23454');
  const [landlordEmail, setLandlordEmail] = useState('kenneth@skeltonrealtygroup.com');
  const [landlordPhone, setLandlordPhone] = useState('(800) 555-0198');

  // Questionnaire values
  const [occupants, setOccupants] = useState('');
  const [vehicles, setVehicles] = useState('');
  const [emergencyContact, setEmergencyContact] = useState('');
  const [confirmedStartDate, setConfirmedStartDate] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      try {
        const me = await apiFetch<PortalUser>('/auth/me/');
        if (!cancelled) setUser(me);

        const apps = await apiFetch<ApplicationData[]>('/apply/my-applications/').catch(() => []);
        if (!cancelled && apps && apps.length > 0) {
          const activeApp = apps[0];
          setApplication(activeApp);

          // Fetch personalized lease details for this specific application
          try {
            const leaseRes = await fetch(`${API_BASE}/crm/lease/${activeApp.id}/`);
            if (leaseRes.ok) {
              const leaseData = await leaseRes.json();
              if (leaseData.landlord) {
                setLandlordName(leaseData.landlord.name || 'Kenneth Hensley Jr');
                setLandlordCompany(leaseData.landlord.company || 'Skelton Realty Group');
                setLandlordAddress(leaseData.landlord.address || '213 Bob Ln, Virginia Beach, VA 23454');
                setLandlordEmail(leaseData.landlord.email || 'kenneth@skeltonrealtygroup.com');
                setLandlordPhone(leaseData.landlord.phone || '(800) 555-0198');
              }
              if (leaseData.occupants) setOccupants(leaseData.occupants);
              if (leaseData.vehicles) setVehicles(leaseData.vehicles);
              if (leaseData.emergency_contact) setEmergencyContact(leaseData.emergency_contact);
              if (leaseData.is_signed && leaseData.signature_url) {
                setSignatureUrl(leaseData.signature_url);
                setSignedAt(leaseData.signed_at);
              }
            }
          } catch {
            // Ignore fetch error and fall back to application data
          }

          // Check localStorage as well
          const stored = localStorage.getItem(`skelton_lease_sig_${activeApp.id}`);
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

  const handleQuestionnaireConfirm = (data: QuestionnaireData) => {
    setConfirmedStartDate(data.moveInDate);
    setOccupants(data.occupants);
    setVehicles(data.vehicles);
    setEmergencyContact(data.emergencyContact);
    setShowQuestionnaire(false);
  };

  const handleSignatureSave = async (data: { type: 'draw' | 'type'; dataUrl: string; signerName: string }) => {
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

    // Persist locally
    const storageKey = application ? `skelton_lease_sig_${application.id}` : 'skelton_lease_sig_general';
    localStorage.setItem(
      storageKey,
      JSON.stringify({
        signatureUrl: data.dataUrl,
        signedAt: timestamp,
        signerName: data.signerName,
      }),
    );

    // Persist to backend if application id exists
    if (application?.id) {
      try {
        const res = await fetch(`${API_BASE}/crm/lease/${application.id}/sign/`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            signature_url: data.dataUrl,
            signer_name: data.signerName,
            occupants,
            vehicles,
            emergency_contact: emergencyContact,
          }),
        });
        if (res.ok) {
          const body = await res.json();
          if (body.signed_at) {
            setSignedAt(body.signed_at);
          }
        }
      } catch (err) {
        console.error('Failed to post signature to backend', err);
      }
    }
  };

  // Derive document values
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

  const startDate = confirmedStartDate || (application?.move_in_date
    ? new Date(application.move_in_date).toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      })
    : 'September 6, 2024');

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
              {property ? property.title || propAddress : 'Official Lease Document'} · Landlord: {landlordName} ({landlordCompany})
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
              onClick={() => setShowQuestionnaire(true)}
              className={styles.questionnaireBtn}
            >
              📋 Confirm Occupants &amp; Move-In
            </button>
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

      {/* Tenant Questionnaire Modal */}
      {showQuestionnaire && (
        <TenantQuestionnaireModal
          propertyName={propAddress}
          initialData={{
            moveInDate: startDate,
            occupants,
            vehicles,
            emergencyContact,
          }}
          onConfirm={handleQuestionnaireConfirm}
          onClose={() => setShowQuestionnaire(false)}
        />
      )}

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
            landlordName={landlordName}
            landlordCompany={landlordCompany}
            landlordAddress={landlordAddress}
            landlordEmail={landlordEmail}
            landlordPhone={landlordPhone}
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
            occupants={occupants}
            vehicles={vehicles}
            emergencyContact={emergencyContact}
            tenantSignatureUrl={signatureUrl}
            signedAt={signedAt}
            isSample={false}
          />
        </div>
      )}
    </div>
  );
}
