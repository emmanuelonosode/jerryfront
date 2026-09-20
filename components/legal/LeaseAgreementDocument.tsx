'use client';

import React from 'react';
import Image from 'next/image';
import styles from './LeaseAgreementDocument.module.css';

export interface LeaseAgreementProps {
  stateName?: string;
  revCode?: string;
  agreementDate?: string;
  landlordName?: string;
  landlordCompany?: string;
  landlordAddress?: string;
  landlordEmail?: string;
  landlordPhone?: string;
  tenantName?: string;
  tenantAddress?: string;
  tenantEmail?: string;
  tenantPhone?: string;
  propertyType?: string;
  bedrooms?: number | string;
  bathrooms?: number | string;
  parkingSpaces?: number | string;
  propertyAddress?: string;
  termStartDate?: string;
  termEndDate?: string;
  annualRent?: string;
  monthlyRent?: string;
  rentDueDay?: string;
  securityDeposit?: string;
  dishonoredCheckFee?: string;
  lateFeeGraceDays?: number | string;
  lateFeePercent?: string;
  petDeposit?: string;
  occupants?: string;
  vehicles?: string;
  emergencyContact?: string;
  tenantSignatureUrl?: string | null;
  tenantSignatureType?: 'draw' | 'type';
  signedAt?: string | null;
  isSample?: boolean;
}

export function LeaseAgreementDocument({
  stateName = 'State of Michigan',
  revCode = 'Rev. 13462E1',
  agreementDate = '24th of July, 2024',
  landlordName = 'Kenneth Hensley Jr',
  landlordCompany = 'Skelton Realty Group',
  landlordAddress = '213 Bob Ln, Virginia Beach, VA 23454',
  landlordEmail = 'kenneth@skeltonrealtygroup.com',
  tenantName = 'Jeremy Shiner',
  tenantAddress = '200 Cleveland Ave, Kingsford, MI 49802',
  tenantEmail = 'jjshiner@gmail.com',
  propertyType = 'house',
  bedrooms = 'two (2)',
  bathrooms = 'two (2)',
  parkingSpaces = 'one (1)',
  propertyAddress = '200 Cleveland Ave, Kingsford, MI 49802',
  termStartDate = '6th of September, 2024',
  termEndDate = '31st of August, 2025',
  annualRent = '$12,000.00',
  monthlyRent = '$1,000.00',
  rentDueDay = '5th',
  securityDeposit = '$1,000.00',
  dishonoredCheckFee = '$50.00',
  lateFeeGraceDays = 5,
  lateFeePercent = '5%',
  petDeposit = '$100.00',
  occupants = '',
  vehicles = '',
  emergencyContact = '',
  tenantSignatureUrl = null,
  signedAt = null,
  isSample = false,
}: LeaseAgreementProps) {
  return (
    <article className={styles.documentWrapper}>
      {isSample && (
        <div className={styles.sampleBanner}>
          <span className={styles.sampleBadge}>OFFICIAL SAMPLE TEMPLATE</span>
          <p className={styles.sampleText}>
            This standard lease preview demonstrates the terms issued by {landlordCompany}.
            Approved residents receive dynamically populated values matching their specific lease.
          </p>
        </div>
      )}

      <div className={styles.legalPaper}>
        {/* Document Header & Logo */}
        <header className={styles.header}>
          <div className={styles.headerBrandRow}>
            <div className={styles.logoLockup}>
              <Image
                src="/brand/logo-lockup-blue.png"
                alt="Skelton Realty Group"
                width={200}
                height={52}
                className={styles.brandLogo}
                priority
              />
            </div>
            <div className={styles.headerMeta}>
              <span className={styles.stateLabel}>{stateName}</span>
              <span className={styles.revLabel}>{revCode}</span>
            </div>
          </div>

          <h1 className={styles.title}>RESIDENTIAL LEASE AGREEMENT</h1>
          <div className={styles.divider} />

          <p className={styles.preamble}>
            This Lease Agreement (this &ldquo;<strong>Agreement</strong>&rdquo;) is made this{' '}
            <span className={styles.fillIn}>{agreementDate}</span>, by and between{' '}
            <strong className={styles.fillIn}>{landlordName}</strong> (&ldquo;<strong>Landlord</strong>&rdquo;),
            representing <strong>{landlordCompany}</strong>, and{' '}
            <strong className={styles.fillIn}>{tenantName}</strong> (&ldquo;<strong>Tenant</strong>&rdquo;).
            Each Landlord and Tenant may be referred to individually as a &ldquo;Party&rdquo; and collectively
            as the &ldquo;Parties.&rdquo;
          </p>
        </header>

        {/* 41 Full Legal Sections */}
        <div className={styles.clauses}>
          <section className={styles.clause}>
            <h2 className={styles.clauseTitle}>1. Premises</h2>
            <p>
              The premises leased is a {propertyType} with {bedrooms} bedroom(s) and {bathrooms} bathroom(s)
              and {parkingSpaces} parking space(s) located at{' '}
              <strong className={styles.fillIn}>{propertyAddress}</strong> (the &ldquo;Premises&rdquo;)
              {vehicles ? (
                <>, with designated parking assigned to vehicle(s): <strong className={styles.fillIn}>{vehicles}</strong></>
              ) : null}.
            </p>
          </section>

          <section className={styles.clause}>
            <h2 className={styles.clauseTitle}>2. Agreement to Lease</h2>
            <p>
              Landlord agrees to lease to Tenant and Tenant agrees to lease from Landlord, according to the
              terms and conditions set forth herein, the Premises.
            </p>
          </section>

          <section className={styles.clause}>
            <h2 className={styles.clauseTitle}>3. Term</h2>
            <p>
              This Agreement will be for a term beginning on{' '}
              <strong className={styles.fillIn}>{termStartDate}</strong> and ending on{' '}
              <strong className={styles.fillIn}>{termEndDate}</strong> (the &ldquo;Term&rdquo;).
            </p>
          </section>

          <section className={styles.clause}>
            <h2 className={styles.clauseTitle}>4. Rent</h2>
            <p>
              Tenant will pay Landlord a rent for the Term of{' '}
              <strong className={styles.fillIn}>{annualRent}</strong> payable in equal monthly installments of{' '}
              <strong className={styles.fillIn}>{monthlyRent}</strong> (&ldquo;Rent&rdquo;). Rent will be
              payable in advance and due on the {rentDueDay} day of each month during the term. Rent will be
              paid to Landlord at Landlord&rsquo;s address provided herein (or to such other places or portal
              methods as directed by Landlord) by mail, portal, or in person by one of the following methods:
              Cash, Personal check, Money order, Electronic transfer / Resident Portal, and will be payable in
              U.S. Dollars. Tenant further agrees to pay {dishonoredCheckFee} for each dishonored bank check.
            </p>
          </section>

          <section className={styles.clause}>
            <h2 className={styles.clauseTitle}>4a. Initial Payments</h2>
            <p>
              Upon execution of this Agreement by Tenant and as a condition of consideration for acceptance by
              Landlord, Tenant shall pay to Landlord the following:
            </p>
            <ol className={styles.subList}>
              <li>The first rent payment ({monthlyRent}).</li>
              <li>The Security Deposit ({securityDeposit}). (See §8)</li>
            </ol>
          </section>

          <section className={styles.clause}>
            <h2 className={styles.clauseTitle}>5. Late Fee</h2>
            <p>
              Rent paid after the {rentDueDay} day of each month will be deemed as late; and if rent is not paid
              within {lateFeeGraceDays} day(s) after such due date, Tenant agrees to pay a late charge of{' '}
              {lateFeePercent} of the balance due per day for each day that rent is late.
            </p>
          </section>

          <section className={styles.clause}>
            <h2 className={styles.clauseTitle}>6. Additional Rent</h2>
            <p>
              There may be instances under this Agreement where Tenant may be required to pay additional charges
              to Landlord. All such charges are considered additional rent under this Agreement and will be paid
              with the next regularly scheduled rent payment. Landlord has the same rights and Tenant has the
              same obligations with respect to additional rent as they do with rent.
            </p>
          </section>

          <section className={styles.clause}>
            <h2 className={styles.clauseTitle}>7. Utilities</h2>
            <p>
              Tenant is responsible for payment of all utility and other services for the Premises, with the
              exception of trash, sewage, water, which will be paid for or provided by Landlord.
            </p>
          </section>

          <section className={styles.clause}>
            <h2 className={styles.clauseTitle}>8. Security Deposit</h2>
            <p>
              Upon signing this Agreement, Tenant will pay a security deposit in the amount of{' '}
              <strong className={styles.fillIn}>{securityDeposit}</strong> to Landlord. The security deposit will
              be retained by Landlord as security for Tenant&rsquo;s performance of its obligations under this
              Agreement. The security deposit may not be used or deducted by Tenant as the last month&rsquo;s rent
              of the Term. Tenant will be entitled to a full refund of the security deposit if Tenant returns
              possession of the Premises to Landlord in the same condition as accepted, ordinary wear and tear
              excepted. Within ten (10) days after the termination of this Agreement, Landlord will return the
              security deposit to Tenant (minus any amount applied by Landlord in accordance with this section). Any
              reason for retaining a portion of the security deposit will be explained in writing. The security
              deposit will not bear interest while held by Landlord in accordance with applicable state laws and/or
              local ordinances.
            </p>
          </section>

          <section className={styles.clause}>
            <h2 className={styles.clauseTitle}>9. Landlord&rsquo;s Failure to Give Possession</h2>
            <p>
              In the event Landlord is unable to give possession of the Premises to Tenant on the start date of
              the Term, Landlord will not be subject to any liability for such failure, the validity of this
              Agreement will not be affected, and the Term will not be extended. Tenant will not be liable for rent
              until Landlord gives possession of the Premises to Tenant. Notwithstanding anything to the contrary,
              if Landlord does not deliver possession of the Premises within 5 days of the Start Date, Tenant may
              cancel this Agreement upon notice to Landlord and Landlord shall, within 2 business days, return all
              monies paid by Tenant to Landlord.
            </p>
          </section>

          <section className={styles.clause}>
            <h2 className={styles.clauseTitle}>10. Holdover Tenancy</h2>
            <p>
              If Landlord accepts a rent payment from Tenant, other than past due rent or additional rent, after
              the Term expires, both Parties understand that a month-to-month holdover tenancy will be created at
              the agreed upon monthly rent, unless proper notice has been served as required by applicable laws. If
              either Tenant or Landlord wishes to end the month-to-month tenancy, such Party must provide at least
              thirty (30) days&rsquo; written notice before the desired termination date.
            </p>
          </section>

          <section className={styles.clause}>
            <h2 className={styles.clauseTitle}>11. Use of Premises</h2>
            <p>
              The Premises will be occupied only by Tenant and Tenant&rsquo;s immediate family
              {occupants ? (
                <> (authorized occupants: <strong className={styles.fillIn}>{occupants}</strong>)</>
              ) : null}
              {' '}and used only for residential purposes. Tenant will not engage in any objectionable conduct, including behavior which
              will make the Premises less fit to live in, will cause dangerous, hazardous or unsanitary conditions
              or will interfere with the rights of others to enjoy their property. Tenant will be liable for any
              damage occurring to the Premises and any damage to or loss of the contents thereof which is done by
              Tenant or Tenant&rsquo;s guests or invitees.
            </p>
          </section>

          <section className={styles.clause}>
            <h2 className={styles.clauseTitle}>12. Condition of the Premises</h2>
            <p>
              Tenant has examined the Premises, including the appliances and fixtures, and acknowledges that they
              are in good condition and repair, normal wear excepted and tear, and accepts them in its current
              condition.
            </p>
          </section>

          <section className={styles.clause}>
            <h2 className={styles.clauseTitle}>13. Maintenance and Repairs</h2>
            <p>
              Tenant will maintain the Premises, including appliances and fixtures, in clean, sanitary and good
              condition and repair. Tenant will not remove Landlord&rsquo;s appliances and fixtures from the
              Premises for any purpose. If repairs other than general maintenance are required, Tenant will notify
              Landlord for such repairs. In the event of default by Tenant, Tenant will reimburse Landlord for the
              cost of any repairs or replacement.
            </p>
          </section>

          <section className={styles.clause}>
            <h2 className={styles.clauseTitle}>14. Reasonable Accommodations</h2>
            <p>
              Landlord agrees to comply with all applicable laws providing equal housing opportunities, including
              making reasonable accommodations for known physical or mental limitations of qualified individuals
              with a disability, unless undue hardship would result. Tenant is responsible for making Landlord
              aware of any such required accommodations that are reasonable and will not impose an undue hardship.
              If Tenant discloses a disability and requests an accommodation, Landlord has the right to have a
              qualified healthcare provider verify the disability if the disability is not readily apparent, and
              Landlord has the right to use the qualified healthcare provider verifying the disability as a resource
              for providing the reasonable accommodation.
            </p>
          </section>

          <section className={styles.clause}>
            <h2 className={styles.clauseTitle}>15. Sex Offender Registry</h2>
            <p>
              Pursuant to law, information about specified registered sex offenders is made available to the
              public. Tenant understands and agrees that Tenant is solely responsible for obtaining any and all
              information contained in the state or national sex offender registry for the area surrounding the
              Premises, which can be obtained online or from the local sheriff&rsquo;s department or other
              appropriate law enforcement officials. Depending on an offender&rsquo;s criminal history, this
              information will include either the address at which the offender resides or the community of
              residence and zip code in which he or she resides.
            </p>
          </section>

          <section className={styles.clause}>
            <h2 className={styles.clauseTitle}>16. Compliance</h2>
            <p>
              Tenant agrees to comply with all applicable laws, ordinances, requirements and regulations of any
              federal, state, county, municipal or other authority.
            </p>
          </section>

          <section className={styles.clause}>
            <h2 className={styles.clauseTitle}>17. Mechanics&rsquo; Lien</h2>
            <p>
              Tenant understands and agrees that Tenant and anyone acting on Tenant&rsquo;s behalf does not have
              the right to file for mechanic&rsquo;s liens or any other kind of liens on the Premises. Tenant agrees
              to give actual advance notice to any contractors, subcontractors or suppliers of goods, labor or
              services that such liens are invalid. Tenant further agrees to take the additional steps necessary to
              keep the Premises free of any and all liens that may result from construction completed by or for Tenant.
            </p>
          </section>

          <section className={styles.clause}>
            <h2 className={styles.clauseTitle}>18. Subordination</h2>
            <p>
              With respect to the Premises, this Agreement is subordinate to any mortgage that now exists, or may
              be given later by Landlord.
            </p>
          </section>

          <section className={styles.clause}>
            <h2 className={styles.clauseTitle}>19. Alterations</h2>
            <p>
              Tenant will not make any alteration, addition or improvement to the Premises without first obtaining
              Landlord&rsquo;s written consent. Any and all alterations, additions or improvements to the Premises
              are without payment to Tenant and will become Landlord&rsquo;s property immediately on completion and
              remain on the Premises, unless Landlord requests or permits removal, in which case Tenant will return
              that part of the Premises to the same condition as existed prior to the alteration, addition or
              improvement. Tenant will not change any existing locks or install any additional locks on the Premises
              without first obtaining Landlord&rsquo;s written consent and without providing Landlord a copy of all keys.
            </p>
          </section>

          <section className={styles.clause}>
            <h2 className={styles.clauseTitle}>20. Pets</h2>
            <p>
              Tenant is not allowed to have or keep any pets, even temporarily, on any part of the Premises, except
              for the following: None, unless specifically authorized in writing by Landlord. The unauthorized
              presence of any pet will subject Tenant to penalties, damages, deductions and/or termination of this
              Agreement. Properly trained service animals that provide assistance to individuals with disabilities
              may be permitted on the Premises with the prior written consent of Landlord, which shall not be
              unreasonably withheld. Tenant will be responsible for the costs of de-fleaing, deodorizing and/or
              shampooing all or any portion of the Premises if a pet has been on the Premises at any time during the
              Term (whether with or without written consent of Landlord). If Tenant does keep an authorized pet on the
              Premises, Tenant will pay to Landlord a pet deposit in the amount of{' '}
              <strong className={styles.fillIn}>{petDeposit}</strong>.
            </p>
          </section>

          <section className={styles.clause}>
            <h2 className={styles.clauseTitle}>21. Fire and Casualty</h2>
            <p>
              If the Premises are damaged by fire or other serious disaster or accident and the Premises becomes
              uninhabitable as a result, Tenant may immediately vacate the Premises and terminate this Agreement
              upon notice to Landlord. Tenant will be responsible for any unpaid rent or will receive any prepaid rent
              up to the day of such fire, disaster or accident. If the Premises are only partially damaged and
              inhabitable, Landlord may make full repairs and will do so within a prompt and reasonable amount of time.
              At the discretion of Landlord, the rent may be reduced while the repairs are being made.
            </p>
          </section>

          <section className={styles.clause}>
            <h2 className={styles.clauseTitle}>22. Liability</h2>
            <p>
              Landlord is not responsible or liable for any loss, claim, damage or expense as a result of any accident,
              injury or damage to any person or property occurring anywhere on the Premises, unless resulting from
              the negligence or willful misconduct of Landlord.
            </p>
          </section>

          <section className={styles.clause}>
            <h2 className={styles.clauseTitle}>23. Assignment and Subletting</h2>
            <p>
              Tenant will not assign this Agreement as to any portion or all of the Premises or make or permit any
              total or partial sublease or other transfer of any portion or all of the Premises.
            </p>
          </section>

          <section className={styles.clause}>
            <h2 className={styles.clauseTitle}>24. Insurance Requirements</h2>
            <p>
              Tenant will not do or permit to be done any act or thing that will increase the insurance risk under any
              policy of insurance covering the Premises. If the premium for such policy of insurance increases due to
              a breach of Tenant&rsquo;s obligations under this Agreement, Tenant will pay the additional amount of
              premium as additional rent under this Agreement.
            </p>
          </section>

          <section className={styles.clause}>
            <h2 className={styles.clauseTitle}>25. Right of Entry</h2>
            <p>
              Landlord or its agents may enter the Premises at reasonable times to inspect the Premises, to make any
              alternations, improvements or repairs or to show the Premises to a prospective tenant, buyer or lender.
              In the event of an emergency, Landlord may enter the Premises at any time.
            </p>
          </section>

          <section className={styles.clause}>
            <h2 className={styles.clauseTitle}>26. Surrender</h2>
            <p>
              Tenant will deliver and surrender to Landlord possession of the Premises immediately upon the
              expiration of the Term or the termination of this Agreement, clean and in as good condition and repair
              as the Premises was at the commencement of the Term, reasonable wear and tear excepted.
            </p>
          </section>

          <section className={styles.clause}>
            <h2 className={styles.clauseTitle}>27. Default</h2>
            <p>
              In the event of any default under this Agreement, Landlord may provide Tenant a notice of default and an
              opportunity to correct such default. If Tenant fails to correct the default, other than a failure to pay
              rent or additional rent, Landlord may terminate this Agreement by giving a thirty (30) day written notice.
              If the default is Tenant&rsquo;s failure to timely pay rent or additional rent as specified in this
              Agreement, Landlord may terminate this Agreement by giving a thirty (30) day written notice to Tenant.
              After termination of this Agreement, Tenant remains liable for any rent, additional late, costs, including
              costs to remedy any defaults, and damages under this Agreement.
            </p>
          </section>

          <section className={styles.clause}>
            <h2 className={styles.clauseTitle}>28. Remedies</h2>
            <p>
              If this Agreement is terminated due to Tenant&rsquo;s default, Landlord may, in addition to any rights
              and remedies available under this Agreement and applicable law, use any dispossession, eviction or other
              similar legal proceeding available in law or equity.
            </p>
          </section>

          <section className={styles.clause}>
            <h2 className={styles.clauseTitle}>29. Subordination</h2>
            <p>
              This Agreement and Tenant&rsquo;s right under it shall be subject and subordinate to the lien, operation
              and effect of each existing or future mortgage, deed of trust, ground lease and/or any other similar
              instrument of encumbrance covering any or all of the Premises, if any, and each renewal, modification,
              consolidation, replacement or extension thereof.
            </p>
          </section>

          <section className={styles.clause}>
            <h2 className={styles.clauseTitle}>30. Condemnation</h2>
            <p>
              If all or substantially all of the Premises are covered by a condemnation including the exercise of any
              power of eminent domain by a governmental authority, this Agreement shall terminate on the date
              possession of the Premises is taken by the condemning authority, and all rent under this Agreement shall
              be prorated and paid to such date. Landlord is entitled to collect from the condemning authority the
              entire amount of any award made in any proceeding. Tenant waives any right, title or interest which Tenant
              may have to any such award and agrees to not make any claim for the Term of this Agreement.
            </p>
          </section>

          <section className={styles.clause}>
            <h2 className={styles.clauseTitle}>31. Hazardous Materials</h2>
            <p>
              Tenant shall not keep on the Premises any item of a dangerous, flammable, or explosive character that
              might unreasonably increase the danger of fire or explosion on the Premises or that might be considered
              hazardous or extra hazardous by any responsible insurance company.
            </p>
          </section>

          <section className={styles.clause}>
            <h2 className={styles.clauseTitle}>32. Notices</h2>
            <p>
              All notices given under this Agreement must be in writing. A notice is effective upon receipt and shall
              be delivered in person, sent via certified or registered mail, or delivered electronically via the
              resident portal to the following addresses (or to another address that either Party may designate upon
              reasonable notice to the other Party):
            </p>
            <div className={styles.noticesGrid}>
              <div className={styles.noticeBox}>
                <h3 className={styles.noticeHeading}>Notices to Landlord:</h3>
                <p>
                  <strong>{landlordCompany}</strong>
                  <br />
                  Attn: {landlordName}
                  <br />
                  {landlordAddress}
                  <br />
                  Email: <span className={styles.fillIn}>{landlordEmail}</span>
                </p>
              </div>
              <div className={styles.noticeBox}>
                <h3 className={styles.noticeHeading}>Notices to Tenant:</h3>
                <p>
                  <strong>{tenantName}</strong>
                  <br />
                  {tenantAddress}
                  <br />
                  Email: <span className={styles.fillIn}>{tenantEmail}</span>
                  {emergencyContact ? (
                    <>
                      <br />
                      Emergency: <span className={styles.fillIn}>{emergencyContact}</span>
                    </>
                  ) : null}
                </p>
              </div>
            </div>
          </section>

          <section className={styles.clause}>
            <h2 className={styles.clauseTitle}>33. Quiet Enjoyment</h2>
            <p>
              If Tenant pays the rent and performs all other obligations under this Agreement, Tenant may peaceably
              and quietly hold and enjoy the Premises during the Term.
            </p>
          </section>

          <section className={styles.clause}>
            <h2 className={styles.clauseTitle}>34. No Waiver</h2>
            <p>
              No Party shall be deemed to have waived any provision of this Agreement or the exercise of any rights
              held under this Agreement unless such waiver is made expressly and in writing.
            </p>
          </section>

          <section className={styles.clause}>
            <h2 className={styles.clauseTitle}>35. Severability</h2>
            <p>
              If any provision of this Agreement is held to be invalid, illegal or unenforceable in whole or in part,
              the remaining provisions shall not be affected and shall continue to be valid, legal and enforceable as
              though the invalid, illegal or unenforceable part had not been included in this Agreement.
            </p>
          </section>

          <section className={styles.clause}>
            <h2 className={styles.clauseTitle}>36. Successors and Assigns</h2>
            <p>
              This Agreement will inure to the benefit of and be binding upon the Parties and their permitted successors
              and assigns.
            </p>
          </section>

          <section className={styles.clause}>
            <h2 className={styles.clauseTitle}>37. Governing Law</h2>
            <p>
              The terms of this Agreement and the rights and obligations of the Parties hereto shall be governed by
              and construed in accordance with the laws of the {stateName}, without regard to its conflicts of laws
              provisions.
            </p>
          </section>

          <section className={styles.clause}>
            <h2 className={styles.clauseTitle}>38. Amendments</h2>
            <p>
              This Agreement may be amended or modified only by a written agreement signed by the Parties.
            </p>
          </section>

          <section className={styles.clause}>
            <h2 className={styles.clauseTitle}>39. Counterparts</h2>
            <p>
              This Agreement may be executed in one or more counterparts, each of which shall be deemed to be an
              original, and all of which together shall constitute one and the same document.
            </p>
          </section>

          <section className={styles.clause}>
            <h2 className={styles.clauseTitle}>40. Headings</h2>
            <p>
              The section headings herein are for reference purposes only and shall not otherwise affect the
              meaning, construction or interpretation of any provision in this Agreement.
            </p>
          </section>

          <section className={styles.clause}>
            <h2 className={styles.clauseTitle}>41. Entire Agreement</h2>
            <p>
              This Agreement constitutes the entire agreement between the Parties and supersedes and cancels all
              prior agreements of the Parties, whether written or oral, with respect to the subject matter.
            </p>
          </section>
        </div>

        {/* Execution & Signatures */}
        <section className={styles.signaturesSection}>
          <p className={styles.witnessClause}>
            IN WITNESS WHEREOF, the Parties hereto, individually or by their duly authorized representatives, have
            executed this Agreement as of the Effective Date.
          </p>

          <div className={styles.signatureGrid}>
            {/* Landlord Signature Block */}
            <div className={styles.signatureBlock}>
              <div className={styles.sigLine}>
                <div className={styles.landlordSigImageWrapper}>
                  {/* Pre-rendered stylized signature for Kenneth Hensley Jr */}
                  <span className={styles.landlordCursive}>Kenneth Hensley Jr</span>
                </div>
                <div className={styles.sigUnderline} />
                <span className={styles.sigCaption}>Landlord Signature</span>
              </div>
              <div className={styles.sigDetails}>
                <p className={styles.sigPrintedName}>{landlordName}</p>
                <p className={styles.sigRole}>Senior Director of Leasing, {landlordCompany}</p>
                <p className={styles.sigDate}>Date: {agreementDate}</p>
              </div>
            </div>

            {/* Tenant Signature Block */}
            <div className={styles.signatureBlock}>
              <div className={styles.sigLine}>
                {tenantSignatureUrl ? (
                  <div className={styles.tenantSigImageWrapper}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={tenantSignatureUrl}
                      alt={`Signature of ${tenantName}`}
                      className={styles.tenantSigImg}
                    />
                  </div>
                ) : (
                  <div className={styles.sigEmptySlot}>
                    <span className={styles.awaitingSigText}>Awaiting Tenant Signature</span>
                  </div>
                )}
                <div className={styles.sigUnderline} />
                <span className={styles.sigCaption}>Tenant Signature</span>
              </div>
              <div className={styles.sigDetails}>
                <p className={styles.sigPrintedName}>{tenantName}</p>
                <p className={styles.sigRole}>Tenant</p>
                <p className={styles.sigDate}>
                  Date: {signedAt || (tenantSignatureUrl ? agreementDate : '________________')}
                </p>
              </div>
            </div>
          </div>

          {signedAt && (
            <div className={styles.verifiedAuditBadge}>
              <span className={styles.verifiedTag}>VERIFIED</span>
              <div>
                <strong>Electronically Signed &amp; Timestamped:</strong> {signedAt}
                <br />
                <span className={styles.verifiedId}>
                  Signer: {tenantName} &lt;{tenantEmail}&gt; · Verified via Skelton Realty Group Resident Portal
                </span>
              </div>
            </div>
          )}
        </section>

        {/* Footer */}
        <footer className={styles.footer}>
          <div className={styles.footerInner}>
            <span>
              {landlordCompany} · Residential Lease Agreement ({revCode})
            </span>
            <span>Equal Housing Opportunity</span>
          </div>
        </footer>
      </div>
    </article>
  );
}
