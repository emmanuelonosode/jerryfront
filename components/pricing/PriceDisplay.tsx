import { formatUsd, formatUsdRange } from '@/lib/money';
import { computeBreakdown, type BreakdownLine, type Pricing } from '@/lib/pricing';
import styles from './PriceDisplay.module.css';

function lineAmount(line: BreakdownLine) {
  return line.isRange ? formatUsdRange(line.minCents, line.maxCents) : formatUsd(line.minCents);
}

function Amount({ children }: { children: string }) {
  return <span className={styles.figure}>{children}</span>;
}

/**
 * Compact price for a property card.
 *
 * Total is the headline; base rent and the fee delta sit directly beneath it.
 *
 * This is the deliberate trade recorded in the brief: in a results grid our
 * $1,875 all-in sits beside a competitor's $1,800 base for a comparable home,
 * and we lose some of those clicks. What we refuse is invisibility - the
 * comparison is legible on the card rather than a click away, so a renter can
 * see why the numbers differ instead of only that they do.
 *
 * Non-interactive by design: the whole card is a link, and nesting a button
 * inside it would produce an unreachable control and an invalid tab order.
 */
export function PriceCardDisplay({ pricing }: { pricing: Pricing }) {
  const b = computeBreakdown(pricing);
  const total = b.isRange
    ? formatUsdRange(b.totalMonthlyMinCents, b.totalMonthlyMaxCents)
    : formatUsd(b.totalMonthlyMinCents);
  const fees = b.isRange
    ? formatUsdRange(b.requiredFeesMinCents, b.requiredFeesMaxCents)
    : formatUsd(b.requiredFeesMinCents);

  return (
    <div className={styles.card}>
      <p className={styles.cardTotal}>
        <Amount>{total}</Amount>
        <span className={styles.cardPer}>/mo total</span>
      </p>
      {b.requiredFeesMaxCents > 0 ? (
        <p className={styles.cardSplit}>
          <Amount>{formatUsd(b.baseRentCents)}</Amount> rent + <Amount>{fees}</Amount> required fees
        </p>
      ) : (
        <p className={styles.cardSplit}>No required monthly fees</p>
      )}
    </div>
  );
}

/**
 * Full breakdown for the property detail page - section 3, above the fold's
 * fold, because a price someone cannot verify is a price they discount.
 *
 * Built on native `<details>`, so the breakdown opens with JavaScript
 * unavailable and gets correct expand/collapse semantics for free. Same
 * progressive-enhancement stance as the hero search.
 */
export function PriceBreakdownDisplay({
  pricing,
  defaultOpen = false,
}: {
  pricing: Pricing;
  defaultOpen?: boolean;
}) {
  const b = computeBreakdown(pricing);
  const total = b.isRange
    ? formatUsdRange(b.totalMonthlyMinCents, b.totalMonthlyMaxCents)
    : formatUsd(b.totalMonthlyMinCents);

  return (
    <div className={styles.breakdown}>
      <div className={styles.headline}>
        <p className={styles.headlineTotal}>
          <Amount>{total}</Amount>
          <span className={styles.headlinePer}>per month, total</span>
        </p>
        <p className={styles.headlineNote}>
          Everything you are required to pay each month, including base rent. Nothing
          below appears for the first time at checkout.
        </p>
      </div>

      <details className={styles.details} open={defaultOpen}>
        <summary className={styles.summary}>
          <span>See how this is calculated</span>
        </summary>

        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <caption className="visually-hidden">
              Monthly cost breakdown, conditional charges, and one-time move-in costs
            </caption>
            <tbody>
              <tr>
                <th scope="row" className={styles.rowLabel}>
                  Base rent
                </th>
                <td className={styles.rowAmount}>
                  <Amount>{formatUsd(b.baseRentCents)}</Amount>
                </td>
              </tr>

              {b.requiredMonthly.map((line) => (
                <tr key={line.id}>
                  <th scope="row" className={styles.rowLabel}>
                    {line.label}
                    {line.reason ? <span className={styles.reason}>{line.reason}</span> : null}
                  </th>
                  <td className={styles.rowAmount}>
                    <Amount>{lineAmount(line)}</Amount>
                  </td>
                </tr>
              ))}

              <tr className={styles.totalRow}>
                <th scope="row" className={styles.rowLabel}>
                  Total monthly cost
                </th>
                <td className={styles.rowAmount}>
                  <Amount>{total}</Amount>
                </td>
              </tr>
            </tbody>
          </table>

          {b.conditionalMonthly.length > 0 ? (
            <section className={styles.group} aria-labelledby="conditional-heading">
              <h3 className={styles.groupTitle} id="conditional-heading">
                Only if they apply to you
              </h3>
              {/* Kept out of the headline deliberately. Folding pet rent into
                  every total would overstate the cost for the majority who do
                  not have a pet. */}
              <table className={styles.table}>
                <tbody>
                  {b.conditionalMonthly.map((line) => (
                    <tr key={line.id}>
                      <th scope="row" className={styles.rowLabel}>
                        {line.label}
                        {line.appliesWhen ? (
                          <span className={styles.reason}>Applies {line.appliesWhen}.</span>
                        ) : null}
                      </th>
                      <td className={styles.rowAmount}>
                        <Amount>{lineAmount(line)}</Amount>
                        <span className={styles.per}>/mo</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          ) : null}

          {b.oneTime.length > 0 ? (
            <section className={styles.group} aria-labelledby="onetime-heading">
              <h3 className={styles.groupTitle} id="onetime-heading">
                One-time, before you move in
              </h3>
              <table className={styles.table}>
                <tbody>
                  {b.oneTime.map((line) => (
                    <tr key={line.id}>
                      <th scope="row" className={styles.rowLabel}>
                        {line.label}
                        {line.reason ? <span className={styles.reason}>{line.reason}</span> : null}
                      </th>
                      <td className={styles.rowAmount}>
                        <Amount>{lineAmount(line)}</Amount>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          ) : null}
        </div>
      </details>
    </div>
  );
}

/** Total only, for dense contexts - search result meta, saved lists, emails. */
export function PriceInline({ pricing }: { pricing: Pricing }) {
  const b = computeBreakdown(pricing);
  const total = b.isRange
    ? formatUsdRange(b.totalMonthlyMinCents, b.totalMonthlyMaxCents)
    : formatUsd(b.totalMonthlyMinCents);
  return (
    <span>
      <Amount>{total}</Amount>
      <span className={styles.per}>/mo total</span>
    </span>
  );
}
