'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { API_BASE } from '@/lib/env';
import { LeaseAgreementDocument } from '@/components/legal/LeaseAgreementDocument';
import { SignaturePad } from '@/components/legal/SignaturePad';
import { TenantQuestionnaireModal, type QuestionnaireData } from '@/components/legal/TenantQuestionnaireModal';
import styles from './LeaseAgreement.module.css';

interface PersonalizedLeaseResponse {
  application_id: string;
  status: string;
  is_signed: boolean;
  signed_at: string | null;
  signature_url: string | null;
  occupants: string;
  vehicles: string;
  emergency_contact: string;
  tenant: {
    name: string;
    email: string;
    phone: string;
    address: string;
  };
  landlord: {
    name: string;
    company: string;
    address: string;
    email: string;
    phone: string;
  };
  property: {
    id: string | null;
    title: string | null;
    address: string;
    city: string;
    state: string;
    zip_code: string;
    full_address: string;
    bedrooms: string;
    bathrooms: string;
    parking_spaces: string;
  };
  financials: {
    monthly_rent: string;
    annual_rent: string;
    security_deposit: string;
    pet_deposit: string;
    rent_due_day: string;
  };
  dates: {
    state_name: string;
    agreement_date: string;
    term_start_date: string;
    term_end_date: string;
  };
}

function LeasePreviewContent() {
  const searchParams = useSearchParams();
  const appId = searchParams.get('app_id');

  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isPersonalized, setIsPersonalized] = useState(false);

  // Modal states
  const [showCustomizer, setShowCustomizer] = useState(false);
  const [showSignModal, setShowSignModal] = useState(false);
  const [showQuestionnaire, setShowQuestionnaire] = useState(false);

  // Form parameters
  const [stateName, setStateName] = useState('State of Michigan');
  const [agreementDate, setAgreementDate] = useState('24th of July, 2024');
  const [landlordName, setLandlordName] = useState('Kenneth Hensley Jr');
  const [landlordCompany, setLandlordCompany] = useState('Skelton Realty Group');
  const [landlordAddress, setLandlordAddress] = useState('213 Bob Ln, Virginia Beach, VA 23454');
  const [landlordEmail, setLandlordEmail] = useState('kenneth@skeltonrealtygroup.com');
  const [tenantName, setTenantName] = useState('Jeremy Shiner');
  const [tenantAddress, setTenantAddress] = useState('200 Cleveland Ave, Kingsford, MI 49802');
  const [tenantEmail, setTenantEmail] = useState('jjshiner@gmail.com');
  const [propertyType] = useState('house');
  const [bedrooms, setBedrooms] = useState('two (2)');
  const [bathrooms, setBathrooms] = useState('two (2)');
  const [parkingSpaces, setParkingSpaces] = useState('one (1)');
  const [propertyAddress, setPropertyAddress] = useState('200 Cleveland Ave, Kingsford, MI 49802');
  const [termStartDate, setTermStartDate] = useState('6th of September, 2024');
  const [termEndDate, setTermEndDate] = useState('31st of August, 2025');
  const [annualRent, setAnnualRent] = useState('$12,000.00');
  const [monthlyRent, setMonthlyRent] = useState('$1,000.00');
  const [securityDeposit, setSecurityDeposit] = useState('$1,000.00');
  const [petDeposit, setPetDeposit] = useState('$100.00');

  // Questionnaire / verification values
  const [occupants, setOccupants] = useState('');
  const [vehicles, setVehicles] = useState('');
  const [emergencyContact, setEmergencyContact] = useState('');

  // E-Signature state
  const [signatureUrl, setSignatureUrl] = useState<string | null>(null);
  const [signedAt, setSignedAt] = useState<string | null>(null);

  // Fetch personalized data if app_id is in query
  useEffect(() => {
    if (!appId) return;

    let cancelled = false;
    setIsLoading(true);
    setLoadError(null);

    fetch(`${API_BASE}/crm/lease/${appId}/`)
      .then(async (res) => {
        if (!res.ok) {
          throw new Error(`Could not load personalized lease (${res.status})`);
        }
        return res.json() as Promise<PersonalizedLeaseResponse>;
      })
      .then((data) => {
        if (cancelled) return;
        setIsPersonalized(true);

        // Landlord of record for this specific home
        setLandlordName(data.landlord?.name || 'Kenneth Hensley Jr');
        setLandlordCompany(data.landlord?.company || 'Skelton Realty Group');
        setLandlordAddress(data.landlord?.address || '213 Bob Ln, Virginia Beach, VA 23454');
        setLandlordEmail(data.landlord?.email || 'kenneth@skeltonrealtygroup.com');

        // Tenant info
        setTenantName(data.tenant?.name || 'Resident');
        setTenantEmail(data.tenant?.email || '');
        setTenantAddress(data.tenant?.address || data.property?.full_address || '');

        // Property info
        setPropertyAddress(data.property?.full_address || data.property?.address || '200 Cleveland Ave');
        setBedrooms(data.property?.bedrooms || 'two (2)');
        setBathrooms(data.property?.bathrooms || 'two (2)');
        setParkingSpaces(data.property?.parking_spaces || 'one (1)');

        // Financials
        setMonthlyRent(data.financials?.monthly_rent || '$1,000.00');
        setAnnualRent(data.financials?.annual_rent || '$12,000.00');
        setSecurityDeposit(data.financials?.security_deposit || '$1,000.00');
        setPetDeposit(data.financials?.pet_deposit || '$100.00');

        // Dates
        setStateName(data.dates?.state_name || 'State of Michigan');
        setAgreementDate(data.dates?.agreement_date || '24th of July, 2024');
        setTermStartDate(data.dates?.term_start_date || 'September 6, 2024');
        setTermEndDate(data.dates?.term_end_date || 'August 31, 2025');

        // Questionnaire / Verification answers
        setOccupants(data.occupants || '');
        setVehicles(data.vehicles || '');
        setEmergencyContact(data.emergency_contact || '');

        // Signature state
        if (data.is_signed && data.signature_url) {
          setSignatureUrl(data.signature_url);
          setSignedAt(data.signed_at);
        } else {
          // Open the questionnaire for the applicant if not yet verified
          if (!data.occupants && !data.vehicles) {
            setShowQuestionnaire(true);
          }
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setLoadError(err.message || 'Failed to load personalized lease agreement.');
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [appId]);

  const handlePrint = () => {
    if (typeof window !== 'undefined') {
      window.print();
    }
  };

  const handleQuestionnaireConfirm = (data: QuestionnaireData) => {
    setTermStartDate(data.moveInDate);
    setOccupants(data.occupants);
    setVehicles(data.vehicles);
    setEmergencyContact(data.emergencyContact);
    setShowQuestionnaire(false);
  };

  const handleSignatureSave = async (data: { type: 'draw' | 'type'; dataUrl: string; signerName: string }) => {
    const now = new Date();
    const localTimestamp = now.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });

    setSignatureUrl(data.dataUrl);
    setTenantName(data.signerName);
    setSignedAt(localTimestamp);
    setShowSignModal(false);

    // If app_id is present, post signature to backend
    if (appId) {
      try {
        const res = await fetch(`${API_BASE}/crm/lease/${appId}/sign/`, {
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
        console.error('Failed to persist signature to backend', err);
      }
    }
  };

  const handleReset = () => {
    setStateName('State of Michigan');
    setAgreementDate('24th of July, 2024');
    setLandlordName('Kenneth Hensley Jr');
    setLandlordCompany('Skelton Realty Group');
    setLandlordAddress('213 Bob Ln, Virginia Beach, VA 23454');
    setLandlordEmail('kenneth@skeltonrealtygroup.com');
    setTenantName('Jeremy Shiner');
    setTenantAddress('200 Cleveland Ave, Kingsford, MI 49802');
    setTenantEmail('jjshiner@gmail.com');
    setBedrooms('two (2)');
    setBathrooms('two (2)');
    setParkingSpaces('one (1)');
    setPropertyAddress('200 Cleveland Ave, Kingsford, MI 49802');
    setTermStartDate('6th of September, 2024');
    setTermEndDate('31st of August, 2025');
    setAnnualRent('$12,000.00');
    setMonthlyRent('$1,000.00');
    setSecurityDeposit('$1,000.00');
    setPetDeposit('$100.00');
    setOccupants('');
    setVehicles('');
    setEmergencyContact('');
    setSignatureUrl(null);
    setSignedAt(null);
    setIsPersonalized(false);
  };

  return (
    <div className={styles.pageContainer}>
      {/* Top Banner and Navigation Bar */}
      <nav className={styles.topToolbar} aria-label="Lease Agreement Actions">
        <div className={styles.toolbarInner}>
          <div className={styles.toolbarLeft}>
            <span className={styles.tag}>
              {isPersonalized ? 'Personalized Lease' : 'Lease Agreement Preview'}
            </span>
            <span className={styles.toolbarTitle}>
              {isPersonalized ? `Prepared for ${tenantName}` : 'Skelton Realty Group Template'}
            </span>
          </div>

          <div className={styles.toolbarRight}>
            {isPersonalized && !signatureUrl && (
              <button
                type="button"
                onClick={() => setShowQuestionnaire(true)}
                className={styles.secondaryBtn}
              >
                Confirm Occupants &amp; Move-In
              </button>
            )}

            {!isPersonalized && (
              <button
                type="button"
                onClick={() => setShowCustomizer(!showCustomizer)}
                className={styles.secondaryBtn}
              >
                {showCustomizer ? 'Hide Editor' : 'Customize Template'}
              </button>
            )}

            <button
              type="button"
              onClick={() => setShowSignModal(true)}
              className={styles.signBtn}
            >
              {signatureUrl ? 'Re-sign Agreement' : 'Sign Agreement Electronically'}
            </button>

            <button type="button" onClick={handlePrint} className={styles.primaryBtn}>
              Print / Save as PDF
            </button>

            <Link href="/homes-for-rent" className={styles.applyLink}>
              View Available Homes
            </Link>
          </div>
        </div>
      </nav>

      {/* Notice Banner for Personalized Lease */}
      {isPersonalized && (
        <div className={styles.personalizedBanner}>
          <div className={styles.personalizedInner}>
            <div className={styles.personalizedText}>
              <strong>Official Lease for {propertyAddress}</strong>
              <p>
                Landlord / Owner: <strong>{landlordName}</strong> ({landlordCompany}) · Contact: {landlordEmail}
              </p>
            </div>
            {signatureUrl ? (
              <div className={styles.signedBadge}>Signed Electronically</div>
            ) : (
              <div className={styles.pendingBadge}>Signature Pending</div>
            )}
          </div>
        </div>
      )}

      {/* Loading or Error State */}
      {isLoading && (
        <div className={styles.loadingBanner}>
          <p>Loading your personalized lease agreement…</p>
        </div>
      )}
      {loadError && (
        <div className={styles.errorBanner}>
          <p>{loadError}. Showing standard preview template.</p>
        </div>
      )}

      {/* Interactive Customizer Drawer (Visible in public template mode) */}
      {showCustomizer && !isPersonalized && (
        <aside className={styles.customizerPanel}>
          <div className={styles.customizerHeader}>
            <h2 className={styles.customizerTitle}>Customize Lease Parameters</h2>
            <p className={styles.customizerSub}>
              Adjust agreement values in real-time to preview how dynamic applicant and property
              details render.
            </p>
          </div>

          <div className={styles.customizerGrid}>
            <div className={styles.inputGroup}>
              <label className={styles.fieldLabel}>Governing State</label>
              <input
                type="text"
                value={stateName}
                onChange={(e) => setStateName(e.target.value)}
                className={styles.input}
              />
            </div>

            <div className={styles.inputGroup}>
              <label className={styles.fieldLabel}>Landlord / Owner Name</label>
              <input
                type="text"
                value={landlordName}
                onChange={(e) => setLandlordName(e.target.value)}
                className={styles.input}
              />
            </div>

            <div className={styles.inputGroup}>
              <label className={styles.fieldLabel}>Landlord Email</label>
              <input
                type="email"
                value={landlordEmail}
                onChange={(e) => setLandlordEmail(e.target.value)}
                className={styles.input}
              />
            </div>

            <div className={styles.inputGroup}>
              <label className={styles.fieldLabel}>Tenant Full Name</label>
              <input
                type="text"
                value={tenantName}
                onChange={(e) => setTenantName(e.target.value)}
                className={styles.input}
              />
            </div>

            <div className={styles.inputGroup}>
              <label className={styles.fieldLabel}>Property Address</label>
              <input
                type="text"
                value={propertyAddress}
                onChange={(e) => setPropertyAddress(e.target.value)}
                className={styles.input}
              />
            </div>

            <div className={styles.inputGroup}>
              <label className={styles.fieldLabel}>Monthly Rent</label>
              <input
                type="text"
                value={monthlyRent}
                onChange={(e) => setMonthlyRent(e.target.value)}
                className={styles.input}
              />
            </div>

            <div className={styles.inputGroup}>
              <label className={styles.fieldLabel}>Security Deposit</label>
              <input
                type="text"
                value={securityDeposit}
                onChange={(e) => setSecurityDeposit(e.target.value)}
                className={styles.input}
              />
            </div>

            <div className={styles.inputGroup}>
              <label className={styles.fieldLabel}>Term Start Date</label>
              <input
                type="text"
                value={termStartDate}
                onChange={(e) => setTermStartDate(e.target.value)}
                className={styles.input}
              />
            </div>
          </div>

          <div className={styles.customizerFooter}>
            <button type="button" onClick={handleReset} className={styles.resetBtn}>
              Reset to Original Sample
            </button>
            <button
              type="button"
              onClick={() => setShowCustomizer(false)}
              className={styles.savePreviewBtn}
            >
              Done Customizing
            </button>
          </div>
        </aside>
      )}

      {/* Tenant Questionnaire Modal */}
      {showQuestionnaire && (
        <TenantQuestionnaireModal
          propertyName={propertyAddress}
          initialData={{
            moveInDate: termStartDate,
            occupants,
            vehicles,
            emergencyContact,
          }}
          onConfirm={handleQuestionnaireConfirm}
          onClose={() => setShowQuestionnaire(false)}
        />
      )}

      {/* Signature Modal Overlay */}
      {showSignModal && (
        <div className={styles.modalBackdrop}>
          <div className={styles.modalContent}>
            <SignaturePad
              initialName={tenantName}
              onSave={handleSignatureSave}
              onCancel={() => setShowSignModal(false)}
            />
          </div>
        </div>
      )}

      {/* Document Presentation */}
      <main className={styles.documentContainer}>
        <LeaseAgreementDocument
          stateName={stateName}
          agreementDate={agreementDate}
          landlordName={landlordName}
          landlordCompany={landlordCompany}
          landlordAddress={landlordAddress}
          landlordEmail={landlordEmail}
          tenantName={tenantName}
          tenantAddress={tenantAddress}
          tenantEmail={tenantEmail}
          propertyType={propertyType}
          bedrooms={bedrooms}
          bathrooms={bathrooms}
          parkingSpaces={parkingSpaces}
          propertyAddress={propertyAddress}
          termStartDate={termStartDate}
          termEndDate={termEndDate}
          annualRent={annualRent}
          monthlyRent={monthlyRent}
          securityDeposit={securityDeposit}
          petDeposit={petDeposit}
          occupants={occupants}
          vehicles={vehicles}
          emergencyContact={emergencyContact}
          tenantSignatureUrl={signatureUrl}
          signedAt={signedAt}
          isSample={!isPersonalized}
        />
      </main>
    </div>
  );
}

export function LeasePreviewClient() {
  return (
    <Suspense fallback={<div className={styles.pageContainer}>Loading lease agreement…</div>}>
      <LeasePreviewContent />
    </Suspense>
  );
}
