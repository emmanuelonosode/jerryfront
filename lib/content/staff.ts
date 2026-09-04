import { COMPANY } from '../navigation.ts';
import { TEAM, type StaffMember } from './team.ts';

/**
 * The person a renter deals with, for the location hubs.
 *
 * WHY THIS EXISTS. Every city hub carried a "TO CONFIRM: named staff covering
 * this city" marker under a heading that promised exactly that. On a site
 * whose whole proposition is being the real, reachable one in a category full
 * of listings nobody answers, an unnamed contact block is the single worst
 * thing that section could say.
 *
 * IT READS FROM `TEAM`, IT DOES NOT RESTATE IT. Jerry already exists in
 * `lib/content/team.ts` with his real role and photograph, and the /team page
 * renders him from there. A second hard-coded copy here is how the two end up
 * disagreeing about his job title on 681 indexed pages - and the first draft
 * of this file did exactly that, inventing "Leasing agent" for someone whose
 * actual role is Chief Executive Officer & Founder.
 *
 * ONE NAME, EVERY MARKET. He is responsible for every home we lease, so the
 * same person appears on every hub rather than a per-city name we would have
 * to invent. A fabricated local agent per city is a lie a renter finds out
 * about on the first phone call, and it is the kind of lie that reads as a
 * scam listing. `coverageNote` says plainly that one team covers everywhere,
 * which is true and is not a weakness - it is why the phone gets answered.
 *
 * THE PHONE NUMBER IS DELIBERATELY NOT HIS.
 *
 * `TEAM` lists (800) 555-0199 against him, and 555-0100 to 555-0199 is the
 * range reserved for fiction - it is a placeholder, and publishing it on
 * hundreds of pages as a way to reach a named person is worse than publishing
 * nothing. The number here is the company's real switchboard from the
 * environment, which is the one the footer and the structured data already
 * use. His email address is real and is used as it stands.
 */

export type Agent = {
  name: string;
  role: string;
  photoUrl: string | null;
  /** The company line, not the placeholder in `TEAM`. */
  phone: string | null;
  email: string | null;
  hours: string | null;
};

/** Reserved-for-fiction ranges. A number matching one of these is not a number. */
function isPlaceholderPhone(phone: string | null): boolean {
  return phone !== null && /\b555-?01\d\d\b/.test(phone);
}

function toAgent(member: StaffMember): Agent {
  return {
    name: member.name,
    role: member.role,
    photoUrl: member.photoUrl,
    phone: isPlaceholderPhone(member.phone) ? COMPANY.phone : member.phone ?? COMPANY.phone,
    email: member.email ?? COMPANY.email,
    hours: COMPANY.phoneHours,
  };
}

/**
 * Who a renter reaches about any home. Falls back to the company itself if the
 * team list is ever emptied, so a hub never renders a contact block with a
 * blank where a person should be.
 */
export const LEAD_AGENT: Agent = TEAM.length > 0
  ? toAgent(TEAM[0])
  : {
      name: COMPANY.legalName,
      role: 'Leasing',
      photoUrl: null,
      phone: COMPANY.phone,
      email: COMPANY.email,
      hours: COMPANY.phoneHours,
    };

export function coverageNote(city: string): string {
  const first = LEAD_AGENT.name.split(' ')[0];
  return (
    `${first} handles ${city} directly - there is no call centre in between, and no queue to ` +
    `sit in. Ask about a specific home, including the ones not listed yet.`
  );
}
