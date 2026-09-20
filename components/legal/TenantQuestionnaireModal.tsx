'use client';

import React, { useState } from 'react';
import styles from './TenantQuestionnaireModal.module.css';

export interface QuestionnaireData {
  moveInDate: string;
  occupants: string;
  vehicles: string;
  emergencyContact: string;
}

interface TenantQuestionnaireModalProps {
  initialData: QuestionnaireData;
  propertyName?: string;
  onConfirm: (data: QuestionnaireData) => void;
  onClose: () => void;
}

export function TenantQuestionnaireModal({
  initialData,
  propertyName = 'the property',
  onConfirm,
  onClose,
}: TenantQuestionnaireModalProps) {
  const [moveInDate, setMoveInDate] = useState(initialData.moveInDate);
  const [occupants, setOccupants] = useState(initialData.occupants);
  const [vehicles, setVehicles] = useState(initialData.vehicles);
  const [emergencyContact, setEmergencyContact] = useState(initialData.emergencyContact);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onConfirm({
      moveInDate,
      occupants,
      vehicles,
      emergencyContact,
    });
  };

  return (
    <div className={styles.backdrop} role="dialog" aria-modal="true" aria-labelledby="modal-title">
      <div className={styles.modalCard}>
        <div className={styles.header}>
          <div>
            <span className={styles.tag}>Step 1 of 2: Lease Confirmation</span>
            <h2 id="modal-title" className={styles.title}>Confirm Your Lease Details</h2>
            <p className={styles.lead}>
              Please verify and complete your occupancy details for <strong>{propertyName}</strong> before signing your agreement.
            </p>
          </div>
          <button type="button" onClick={onClose} className={styles.closeBtn} aria-label="Close dialog">
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.fieldGroup}>
            <label htmlFor="moveInDate" className={styles.label}>
              Confirmed Move-in Date (§3 Term)
            </label>
            <input
              id="moveInDate"
              type="text"
              value={moveInDate}
              onChange={(e) => setMoveInDate(e.target.value)}
              placeholder="e.g. October 1, 2026"
              className={styles.input}
              required
            />
            <span className={styles.hint}>This will be the official start date of your 1-year residential lease.</span>
          </div>

          <div className={styles.fieldGroup}>
            <label htmlFor="occupants" className={styles.label}>
              Authorized Occupants (§11 Use of Premises)
            </label>
            <textarea
              id="occupants"
              value={occupants}
              onChange={(e) => setOccupants(e.target.value)}
              placeholder="List full names of all individuals (adults and minors) residing at the home"
              className={styles.textarea}
              rows={2}
            />
            <span className={styles.hint}>Per Clause 11, only listed immediate occupants are permitted to reside full-time.</span>
          </div>

          <div className={styles.fieldGroup}>
            <label htmlFor="vehicles" className={styles.label}>
              Vehicle &amp; Parking Registration (§1 Premises)
            </label>
            <input
              id="vehicles"
              type="text"
              value={vehicles}
              onChange={(e) => setVehicles(e.target.value)}
              placeholder="e.g. 2022 Honda Accord (Plate: ABC-1234, Silver)"
              className={styles.input}
            />
            <span className={styles.hint}>Assigned vehicle for designated parking space(s).</span>
          </div>

          <div className={styles.fieldGroup}>
            <label htmlFor="emergencyContact" className={styles.label}>
              Emergency Contact &amp; Legal Notices (§32 Notices)
            </label>
            <input
              id="emergencyContact"
              type="text"
              value={emergencyContact}
              onChange={(e) => setEmergencyContact(e.target.value)}
              placeholder="e.g. Sarah Jenkins (Sister) - (555) 234-5678"
              className={styles.input}
            />
            <span className={styles.hint}>Contact person authorized in event of emergency.</span>
          </div>

          <div className={styles.actions}>
            <button type="button" onClick={onClose} className={styles.cancelBtn}>
              Review As-Is
            </button>
            <button type="submit" className={styles.confirmBtn}>
              Save &amp; Update Agreement →
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
