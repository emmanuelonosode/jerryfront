/**
 * The lease as the API returns it (apps/crm/lease.py).
 *
 * The clause text is built on the server and frozen into the signed snapshot,
 * so this side only lays it out: what is shown is exactly what is hashed at
 * signing.
 */
export type LeaseParagraph = { text: string; strong: boolean };
export type LeaseSection = { number: number; heading: string; paragraphs: LeaseParagraph[] };

export type LeaseTerms = {
  version: string;
  ready: boolean;
  missing: string[];
  landlord: { owner: string; signatory: string; address: string; email: string; phone: string };
  agent: { name: string; address: string; phone: string; email: string };
  tenant: { name: string; email: string; phone: string };
  premises: { address: string; state: string; state_name: string };
  term: { start: string; end: string };
  money: { total_monthly_rent: string; security_deposit: string };
  guarantor: { name: string } | null;
  sections: LeaseSection[];
};

export type LeasePayload = {
  application_id: string;
  status: string;
  can_sign: boolean;
  terms: LeaseTerms;
  signing: {
    is_signed: boolean;
    signed_at: string | null;
    signer_name: string | null;
    signature_url: string | null;
    countersigned_by: string | null;
    countersigned_at: string | null;
    consent_text: string;
  };
  questionnaire: { occupants: string; vehicles: string; emergency_contact: string };
};
