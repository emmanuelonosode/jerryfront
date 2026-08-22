/**
 * Emit a JSON-LD block.
 *
 * `null` renders nothing, which is what makes the "omit rather than guess"
 * rule enforceable at the call site: a page can ask for LocalBusiness markup
 * unconditionally and simply get none until the facts exist.
 */
export function JsonLd({ data }: { data: Record<string, unknown> | null }) {
  if (!data) return null;
  return (
    <script
      type="application/ld+json"
      // Author-controlled content only; no user input reaches this.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
