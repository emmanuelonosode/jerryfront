/**
 * Cleaning ingested listing copy before it is shown.
 *
 * The descriptions come from a partner feed and are not ours. Two things in
 * them cannot go on the page as written:
 *
 * 1. HTML. The copy contains `<a href=…>` markup. Rendered as text it shows the
 *    tags literally; rendered as HTML it would be injecting a third party's
 *    markup into our pages, which is an XSS hole with extra steps. It is
 *    stripped to plain text - the tags carried no information we want.
 *
 * 2. Another company's name and links. 125 of 1,006 published listings name
 *    invitationhomes.com or primefamilyhousing.com, usually as "managed by X"
 *    with a "Learn More" link to them. On our own listing page that tells a
 *    renter a different company manages the home and points them at it. The
 *    sentence goes, not just the URL - a stripped link inside "managed by X"
 *    leaves the misleading half behind.
 *
 * WHAT IS NOT DONE: no rewriting, no summarising, no invented replacement
 * copy. Sentences that mention nobody are passed through untouched, so what a
 * visitor reads is still the property description that was written for it.
 */

/** Domains and brands whose mention makes a sentence unusable on our site. */
const FOREIGN_BRANDS = [
  'invitationhomes',
  'invitation homes',
  'primefamilyhousing',
  'prime family housing',
];

/** Stands in for a removed link so the sentence around it can be dropped too. */
const LINK_MARKER = '\u0000link\u0000';

function stripTags(value: string): string {
  return (
    value
      // Elements whose CONTENT must go with them. Stripping only the tags of a
      // <script> leaves its body behind as visible text.
      .replace(/<(script|style|noscript)\b[^>]*>[\s\S]*?<\/\1>/gi, ' ')
      // Comments, before the tag pass, so a tag hidden inside one cannot survive.
      .replace(/<!--[\s\S]*?-->/g, ' ')
      // Whole anchors, link text included - replaced by a MARKER rather than by
      // nothing. Deleting them outright leaves the rest of their sentence
      // behind: "...a planned community. Learn More about what X has to offer."
      // becomes "...a planned community. about what X has to offer.", a
      // dangling lowercase fragment mid-paragraph. The marker survives into the
      // sentence pass, which then drops the whole sentence.
      .replace(/<a\b[^>]*href\s*=\s*["']?https?:\/\/[^>]*>[\s\S]*?<\/a>/gi, LINK_MARKER)
      // Anything else: the tag goes, its text stays.
      .replace(/<\/?[a-zA-Z][^>]*>/g, ' ')
  );
}

function decodeEntities(value: string): string {
  const named: Record<string, string> = {
    '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'", '&nbsp;': ' ',
  };
  return value
    .replace(/&(amp|lt|gt|quot|#39|nbsp);/g, (match) => named[match] ?? match)
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)));
}

function mentionsForeignBrand(sentence: string): boolean {
  const haystack = sentence.toLowerCase();
  if (haystack.includes(LINK_MARKER)) return true;
  if (/https?:\/\//.test(haystack) || /\bwww\./.test(haystack)) return true;
  return FOREIGN_BRANDS.some((brand) => haystack.includes(brand));
}

/**
 * Returns display-ready paragraphs, or an empty array when nothing survives.
 *
 * An empty result is correct and the caller should render no section at all:
 * a heading over nothing looks broken, and there is no honest filler for a
 * description we could not use.
 */
export function sanitiseDescription(raw: string | null | undefined): string[] {
  if (!raw) return [];

  const plain = decodeEntities(stripTags(raw));

  return plain
    .split(/\n{2,}/)
    .map((block) =>
      block
        // Split on sentence ends, keeping the terminator with its sentence.
        .split(/(?<=[.!?])\s+/)
        .filter((sentence) => sentence.trim() && !mentionsForeignBrand(sentence))
        .join(' ')
        // Any marker that survived - an anchor spanning a sentence break -
        // must never reach the page.
        .split(LINK_MARKER)
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim(),
    )
    .filter((block) => block.length > 0);
}
