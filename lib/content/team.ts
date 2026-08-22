/**
 * Named staff.
 *
 * The highest-converting page on the site in a category dense with fraud, and
 * the one an institutional competitor structurally cannot replicate. Under the
 * Civic Plainspoken direction it also carries most of the warmth the interface
 * itself withholds.
 *
 * Deliberately empty. Invented colleagues on an anti-scam page would be
 * self-defeating - this is the page whose entire job is being verifiable.
 */
export type StaffMember = {
  id: string;
  name: string;
  role: string;
  markets: string[];
  email: string | null;
  phone: string | null;
  photoUrl: string | null;
  /** Optional note on why they do this work. */
  note?: string;
};

export const TEAM: StaffMember[] = [
  {
    id: 'jerry-skelton',
    name: 'Jerry Skelton',
    role: 'Chief Executive Officer & Founder',
    markets: ['National Operations', 'Owner Partnerships', 'Strategic Growth'],
    email: 'jerry@skeltonrealtygroup.com',
    phone: '(800) 555-0199',
    photoUrl: '/images/team/jerry-skelton.jpg',
    note: 'Dedicated to transforming single-family leasing with transparent pricing, fair approval standards, and dedicated resident support.',
  },
  {
    id: 'kenneth-hensley',
    name: 'Kenneth Hensley',
    role: 'Senior Director of Leasing & Operations',
    markets: ['Atlanta', 'Dallas-Fort Worth', 'Houston', 'Phoenix'],
    email: 'kenneth@skeltonrealtygroup.com',
    phone: '(800) 555-0198',
    photoUrl: '/images/team/kenneth-hensley.jpg',
    note: 'Overseeing portfolio screening, application reviews, and nationwide property management standards.',
  },
  {
    id: 'emma-witherse',
    name: 'Emma Witherse',
    role: 'Lead Housing Specialist & Resident Relations',
    markets: ['Housing Vouchers', 'Second Chance Programs', 'Resident Onboarding'],
    email: 'emma@skeltonrealtygroup.com',
    phone: '(800) 555-0197',
    photoUrl: '/images/team/emma-witherse.jpg',
    note: 'Specializing in Section 8 housing vouchers, individual review approvals, and applicant onboarding.',
  },
];
