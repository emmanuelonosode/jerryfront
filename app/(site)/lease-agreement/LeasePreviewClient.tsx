'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { LeaseAgreementDocument } from '@/components/legal/LeaseAgreementDocument';
import { SignaturePad } from '@/components/legal/SignaturePad';
import styles from './LeaseAgreement.module.css';

export function LeasePreviewClient() {
  const [showCustomizer, setShowCustomizer] = useState(false);
  const [showSignModal, setShowSignModal] = useState(false);

  // Form parameters that can be customized
  const [stateName, setStateName] = useState('State of Michigan');
  const [agreementDate, setAgreementDate] = useState('24th of July, 2024');
  const [landlordName, setLandlordName] = useState('Kenneth Hensley Jr');
  const [landlordCompany] = useState('Skelton Realty Group');
  const [landlordAddress, setLandlordAddress] = useState('213 Bob Ln, Virginia Beach, VA 23454');
  const [landlordEmail, setLandlordEmail] = useState('kenneth@skeltonrealtygroup.com');
  const [tenantName, setTenantName] = useState('Jeremy Shiner');
  const [tenantAddress, setTenantAddress] = useState('200 Cleveland Ave, Kingsford, MI 49802');
  const [tenantEmail, setTenantEmail] = useState('jjshiner@gmail.com');
  const [propertyType, setPropertyType] = useState('house');
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

  // E-Signature state
  const [signatureUrl, setSignatureUrl] = useState<string | null>(null);
  const [signedAt, setSignedAt] = useState<string | null>(null);

  const handlePrint = () => {
    if (typeof window !== 'undefined') {
      window.print();
    }
  };

  const handleSignatureSave = (data: { type: 'draw' | 'type'; dataUrl: string; signerName: string }) => {
    setSignatureUrl(data.dataUrl);
    setTenantName(data.signerName);
    const now = new Date();
    setSignedAt(
      now.toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      }),
    );
    setShowSignModal(false);
  };

  const handleReset = () => {
    setStateName('State of Michigan');
    setAgreementDate('24th of July, 2024');
    setLandlordName('Kenneth Hensley Jr');
    setLandlordAddress('213 Bob Ln, Virginia Beach, VA 23454');
    setLandlordEmail('kenneth@skeltonrealtygroup.com');
    setTenantName('Jeremy Shiner');
    setTenantAddress('200 Cleveland Ave, Kingsford, MI 49802');
    setTenantEmail('jjshiner@gmail.com');
    setPropertyType('house');
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
    setSignatureUrl(null);
    setSignedAt(null);
  };

  return (
    <div className={styles.pageContainer}>
      {/* Top Banner and Navigation Bar */}
      <nav className={styles.topToolbar} aria-label="Lease Agreement Actions">
        <div className={styles.toolbarInner}>
          <div className={styles.toolbarLeft}>
            <span className={styles.tag}>Lease Agreement Preview</span>
            <span className={styles.toolbarTitle}>Skelton Realty Group Template</span>
          </div>

          <div className={styles.toolbarRight}>
            <button
              type="button"
              onClick={() => setShowCustomizer(!showCustomizer)}
              className={styles.secondaryBtn}
            >
              ⚙️ {showCustomizer ? 'Hide Editor' : 'Customize Template'}
            </button>

            <button
              type="button"
              onClick={() => setShowSignModal(true)}
              className={styles.signBtn}
            >
              ✍️ {signatureUrl ? 'Re-sign Agreement' : 'Test E-Signature'}
            </button>

            <button type="button" onClick={handlePrint} className={styles.primaryBtn}>
              🖨️ Print / Save as PDF
            </button>

            <Link href="/homes-for-rent" className={styles.applyLink}>
              View Available Homes →
            </Link>
          </div>
        </div>
      </nav>

      {/* Interactive Customizer Drawer */}
      {showCustomizer && (
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
              <label className={styles.fieldLabel}>Agreement Date</label>
              <input
                type="text"
                value={agreementDate}
                onChange={(e) => setAgreementDate(e.target.value)}
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
              <label className={styles.fieldLabel}>Tenant Email</label>
              <input
                type="email"
                value={tenantEmail}
                onChange={(e) => setTenantEmail(e.target.value)}
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
              <label className={styles.fieldLabel}>Bedrooms &amp; Bathrooms</label>
              <div className={styles.multiInput}>
                <input
                  type="text"
                  placeholder="Bedrooms"
                  value={bedrooms}
                  onChange={(e) => setBedrooms(e.target.value)}
                  className={styles.input}
                />
                <input
                  type="text"
                  placeholder="Bathrooms"
                  value={bathrooms}
                  onChange={(e) => setBathrooms(e.target.value)}
                  className={styles.input}
                />
              </div>
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

            <div className={styles.inputGroup}>
              <label className={styles.fieldLabel}>Term End Date</label>
              <input
                type="text"
                value={termEndDate}
                onChange={(e) => setTermEndDate(e.target.value)}
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
          tenantSignatureUrl={signatureUrl}
          signedAt={signedAt}
          isSample={true}
        />
      </main>
    </div>
  );
}
