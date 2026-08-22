/**
 * Brokerage licensing, by jurisdiction.
 *
 * WHY THIS IS A FILE AND NOT A `.env` VALUE. The other business facts are
 * scalars and belong in `.env`. This is structured, legally consequential
 * content: a named broker per state, licence numbers in half a dozen formats,
 * second licences, entity licences, and statutory text that some states
 * require to be published verbatim. A pipe-delimited environment variable
 * cannot hold that, and a licence number is not something anyone should be
 * able to change without it showing up in a diff.
 *
 * These are real numbers for real named people. Nothing here may be invented,
 * inferred or tidied up - if a value is not known it is left out, and the
 * footer shows the state is missing rather than showing a plausible number.
 */

export type Jurisdiction = {
  /** Two-letter postal code, used as the key and as the label. */
  state: string;
  stateName: string;
  broker: string;
  licenceNumber: string;
  /** Further licences held in the same state, each with its own label. */
  additional?: { label: string; number: string }[];
  /** Where the responsible office sits, when the state requires it shown. */
  officeLocation?: string;
  /**
   * Statutory text the state requires published, quoted rather than
   * paraphrased. Rendered on the fees and application pages, not buried.
   */
  disclosure?: string;
};

export const JURISDICTIONS: Jurisdiction[] = [
  { state: 'AL', stateName: 'Alabama', broker: 'Michael Greene', licenceNumber: '99815' },
  { state: 'AZ', stateName: 'Arizona', broker: 'Michael L. Clow', licenceNumber: 'BR036908000' },
  { state: 'AR', stateName: 'Arkansas', broker: 'Leah Douthit', licenceNumber: 'PB00094183' },
  { state: 'CA', stateName: 'California', broker: 'Gerard S. Donohue', licenceNumber: '01265072' },
  {
    state: 'CO',
    stateName: 'Colorado',
    broker: 'Elizabeth H. Dapper',
    licenceNumber: 'ER.100004013',
    disclosure:
      '1. The prospective tenant has the right to provide to the landlord a portable '
      + 'screening report, as defined in Section 38-12-902(2.5), Colorado Revised Statutes; '
      + 'and 2. If the prospective tenant provides the landlord with a portable tenant '
      + 'screening report, the landlord is prohibited from: charging the prospective tenant '
      + 'a rental application fee; or charging the prospective tenant a fee for the landlord '
      + 'to access or use the portable tenant screening report.',
  },
  { state: 'CT', stateName: 'Connecticut', broker: 'Craig Crocker', licenceNumber: 'REB0793977' },
  { state: 'DE', stateName: 'Delaware', broker: 'Craig Crocker', licenceNumber: 'RB-0031267' },
  {
    state: 'DC',
    stateName: 'Washington DC',
    broker: 'Gerard S. Donohue',
    licenceNumber: 'BR200201382',
  },
  { state: 'FL', stateName: 'Florida', broker: 'Leah Douthit', licenceNumber: 'BK3612122' },
  { state: 'GA', stateName: 'Georgia', broker: 'Leah Douthit', licenceNumber: '419264' },
  { state: 'HI', stateName: 'Hawaii', broker: 'Andrew Kress', licenceNumber: 'RB-21790' },
  {
    state: 'IL',
    stateName: 'Illinois',
    broker: 'Amy Jankowski',
    licenceNumber: '471018764',
    officeLocation: 'Chicago, IL',
  },
  { state: 'IN', stateName: 'Indiana', broker: 'Amy Jankowski', licenceNumber: 'RB21000257' },
  { state: 'IA', stateName: 'Iowa', broker: 'Gerard S. Donohue', licenceNumber: 'B70527000' },
  { state: 'KY', stateName: 'Kentucky', broker: 'Peter T. Colgan III', licenceNumber: '179364' },
  {
    state: 'LA',
    stateName: 'Louisiana',
    broker: 'Michael Greene',
    licenceNumber: 'BROK.77122-ACT',
    officeLocation: 'Irving, TX',
  },
  { state: 'MD', stateName: 'Maryland', broker: 'Elizabeth Saye', licenceNumber: '5009570' },
  {
    state: 'MI',
    stateName: 'Michigan',
    broker: 'Gerard Stephen Donohue',
    licenceNumber: '6502431855',
  },
  { state: 'MN', stateName: 'Minnesota', broker: 'Michael Greene', licenceNumber: '40234608' },
  { state: 'MS', stateName: 'Mississippi', broker: 'Craig Crocker', licenceNumber: '24027' },
  { state: 'MO', stateName: 'Missouri', broker: 'Craig Crocker', licenceNumber: '2021037321' },
  { state: 'NE', stateName: 'Nebraska', broker: 'Craig Crocker', licenceNumber: '20240035' },
  {
    state: 'NV',
    stateName: 'Nevada',
    broker: 'Gerard S. Donohue',
    licenceNumber: 'B.1002762.LLC',
    additional: [{ label: 'Property manager licence', number: 'PM.0168144.BKR' }],
  },
  { state: 'NH', stateName: 'New Hampshire', broker: 'Craig Crocker', licenceNumber: '80310' },
  {
    state: 'NJ',
    stateName: 'New Jersey',
    broker: 'Paul Cohen',
    licenceNumber: '1433509',
    additional: [{ label: 'Entity licence', number: '1754100' }],
  },
  { state: 'NM', stateName: 'New Mexico', broker: 'Kathleen Danuser', licenceNumber: '20857' },
];

/** The jurisdictions carrying statutory text we are required to publish. */
export const DISCLOSURES = JURISDICTIONS.filter((j) => j.disclosure);

export function jurisdictionFor(state: string): Jurisdiction | undefined {
  return JURISDICTIONS.find((j) => j.state === state.toUpperCase());
}
