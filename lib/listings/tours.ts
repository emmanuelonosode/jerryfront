/**
 * Virtual tour and 3D walkthrough embeds.
 *
 * AN EMBED URL IS UNTRUSTED INPUT, EVEN WHEN STAFF TYPED IT.
 *
 * Dropping a stored URL into an `<iframe src>` hands whoever set that field the
 * ability to run a page inside this origin's frame - a convincing credential
 * prompt, a fake "your session expired, sign in" overlay, or a redirect chain.
 * The field is populated by manual entry and by a partner feed, so "staff typed
 * it" is not a guarantee, and a compromised admin account should not become a
 * phishing host on the public site.
 *
 * So: an ALLOWLIST OF PROVIDERS, matched on exact hostname. Anything else is
 * refused and reported rather than rendered - including plain `http`, which
 * would trip mixed-content blocking anyway and show an empty box.
 *
 * Matching is on the parsed hostname, never `startsWith` or `includes`. A check
 * like `url.includes('matterport.com')` accepts
 * `https://matterport.com.evil.example/…`, which is the classic way an
 * allowlist gets bypassed.
 */

export type TourKind = '3d' | 'video';

export type TourProvider = {
  /** Exact hostnames, or a suffix match on a registrable subdomain. */
  hosts: string[];
  name: string;
  kind: TourKind;
  /**
   * Whether the provider will actually PAINT inside our frame.
   *
   * Being on the allowlist and being frameable are two different questions,
   * and the detail page was answering only the first: it asked `resolveTour`
   * whether a tour existed, got yes, and rendered a heading over a permanently
   * blank white box on every Zillow home in the catalogue - 788 of them.
   *
   * Default true. Set false for a host that answers a framed request with a
   * refusal, so the page can offer the tour as a link instead of pretending to
   * show it.
   */
  embeddable?: boolean;
};

const PROVIDERS: TourProvider[] = [
  { hosts: ['my.matterport.com', 'matterport.com'], name: 'Matterport', kind: '3d' },
  { hosts: ['kuula.co'], name: 'Kuula', kind: '3d' },
  { hosts: ['momento360.com'], name: 'Momento360', kind: '3d' },
  /*
   * The two providers the catalogue actually uses.
   *
   * Every one of the 2,122 tour links in inventory points at one of these -
   * 1,334 at InsideMaps, 788 at Zillow - and neither was listed, so the tour
   * section resolved to nothing on every home that had a tour. The feature
   * was fully built, fully populated, and dark.
   *
   * They are the same class of embed as the three above: a walkthrough player
   * on an https origin, from the same partner feed the photographs come from.
   * `toEmbedSrc` below strips the tracking each one arrives with.
   */
  { hosts: ['insidemaps.com'], name: 'InsideMaps', kind: '3d' },
  /*
   * Zillow is allowlisted but NOT embeddable. `view-imx` answers a framed
   * request with a refusal, so the iframe paints white and stays white - which
   * is what the detail page was shipping. The link still works, so the page
   * offers it as a link rather than as a frame.
   */
  { hosts: ['zillow.com'], name: 'Zillow 3D Home', kind: '3d', embeddable: false },
  { hosts: ['youtube.com', 'www.youtube.com', 'youtube-nocookie.com', 'www.youtube-nocookie.com', 'youtu.be'], name: 'YouTube', kind: 'video' },
  { hosts: ['player.vimeo.com', 'vimeo.com'], name: 'Vimeo', kind: 'video' },
];

export type TourEmbed = {
  src: string;
  provider: string;
  kind: TourKind;
  /** What a screen reader and a no-JS visitor get instead of the frame. */
  title: string;
  /** False when the provider refuses to be framed - offer a link, not an iframe. */
  embeddable: boolean;
};

export type TourResult =
  | { ok: true; embed: TourEmbed }
  | { ok: false; reason: 'empty' | 'not-https' | 'unsupported-provider' | 'malformed'; detail: string };

function providerFor(hostname: string): TourProvider | undefined {
  const host = hostname.toLowerCase();
  return PROVIDERS.find((p) =>
    p.hosts.some((allowed) => host === allowed || host.endsWith(`.${allowed}`)),
  );
}

/**
 * Normalise a provider URL into something embeddable.
 *
 * A `youtube.com/watch?v=…` link is a page, not a player; framing it shows a
 * refusal. Providers each have an embed form and this converts to it rather
 * than expecting whoever pasted the link to know that.
 */
function toEmbedSrc(url: URL, provider: TourProvider): string {
  const host = url.hostname.toLowerCase();

  if (provider.name === 'YouTube') {
    const id = host.endsWith('youtu.be')
      ? url.pathname.slice(1)
      : url.searchParams.get('v') ?? url.pathname.split('/').pop() ?? '';
    // nocookie so a visitor browsing homes is not tracked by a video host they
    // never chose to visit.
    return id ? `https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}?rel=0` : url.toString();
  }

  if (provider.name === 'Vimeo' && host === 'vimeo.com') {
    const id = url.pathname.split('/').filter(Boolean).pop() ?? '';
    return id ? `https://player.vimeo.com/video/${encodeURIComponent(id)}` : url.toString();
  }

  if (provider.name === 'InsideMaps') {
    // The player renders chrome-free only when told it is in a frame. Roughly
    // a third of the feed's links already carry it; this makes it universal.
    url.searchParams.set('embedded', 'true');
    /*
     * THE TRAILING SLASH IS NOT COSMETIC. Without it InsideMaps answers 301
     * to the slashed path - over PLAIN HTTP - and a browser on our https page
     * refuses to follow that into an iframe as mixed content, so the tour
     * renders as a permanently blank box. Requesting the canonical form
     * directly returns 200 with `frame-ancestors *` and no redirect at all.
     */
    if (!url.pathname.endsWith('/')) url.pathname = `${url.pathname}/`;
    return url.toString();
  }

  if (provider.name === 'Zillow 3D Home') {
    /*
     * `wl=true` is Zillow's white-label flag and is KEPT deliberately: it
     * suppresses their branding and their "see this on Zillow" calls to
     * action, which is what makes this embeddable on our own listing page
     * rather than an advert for a competitor. The attribution and campaign
     * parameters go - they exist to credit whoever the link was copied from.
     */
    const kept = new URLSearchParams();
    kept.set('wl', 'true');
    const viewType = url.searchParams.get('initialViewType');
    if (viewType) kept.set('initialViewType', viewType);
    return `https://www.zillow.com${url.pathname}?${kept.toString()}`;
  }

  if (provider.name === 'Matterport') {
    // `m=` carries the model id; keep only that and the play flag so tracking
    // parameters from wherever the link was copied do not travel with it.
    const model = url.searchParams.get('m');
    if (model) return `https://my.matterport.com/show/?m=${encodeURIComponent(model)}&play=1`;
  }

  return url.toString();
}

export function resolveTour(raw: string | null | undefined, addressLine: string): TourResult {
  const value = (raw ?? '').trim();
  if (!value) return { ok: false, reason: 'empty', detail: 'No tour link is set for this home.' };

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return { ok: false, reason: 'malformed', detail: `"${value}" is not a URL.` };
  }

  if (url.protocol !== 'https:') {
    return {
      ok: false, reason: 'not-https',
      detail: 'Tour links must be https - a browser blocks anything else as mixed content.',
    };
  }

  const provider = providerFor(url.hostname);
  if (!provider) {
    return {
      ok: false, reason: 'unsupported-provider',
      detail:
        `${url.hostname} is not an approved tour host. Embedding an arbitrary origin would let ` +
        'whoever set this field run a page inside our frame.',
    };
  }

  return {
    ok: true,
    embed: {
      src: toEmbedSrc(url, provider),
      provider: provider.name,
      kind: provider.kind,
      title: provider.kind === '3d'
        ? `3D walkthrough of ${addressLine}`
        : `Video tour of ${addressLine}`,
      embeddable: provider.embeddable !== false,
    },
  };
}

/**
 * The sandbox an embed runs under.
 *
 * `allow-scripts` is unavoidable - a 3D tour is a WebGL application.
 * `allow-same-origin` is required for providers to access their own local storage and cookies.
 * This is safe because they are cross-origin; the Same-Origin Policy protects our parent frame.
 */
export const TOUR_SANDBOX = 'allow-scripts allow-popups allow-popups-to-escape-sandbox allow-same-origin';
export const TOUR_ALLOW = 'xr-spatial-tracking; fullscreen; accelerometer; gyroscope';
export const TOUR_REFERRER_POLICY = 'no-referrer' as const;
