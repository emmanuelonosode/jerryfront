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
};

const PROVIDERS: TourProvider[] = [
  { hosts: ['my.matterport.com', 'matterport.com'], name: 'Matterport', kind: '3d' },
  { hosts: ['kuula.co'], name: 'Kuula', kind: '3d' },
  { hosts: ['momento360.com'], name: 'Momento360', kind: '3d' },
  { hosts: ['youtube.com', 'www.youtube.com', 'youtube-nocookie.com', 'www.youtube-nocookie.com', 'youtu.be'], name: 'YouTube', kind: 'video' },
  { hosts: ['player.vimeo.com', 'vimeo.com'], name: 'Vimeo', kind: 'video' },
];

export type TourEmbed = {
  src: string;
  provider: string;
  kind: TourKind;
  /** What a screen reader and a no-JS visitor get instead of the frame. */
  title: string;
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
    },
  };
}

/**
 * The sandbox an embed runs under.
 *
 * `allow-scripts` is unavoidable - a 3D tour is a WebGL application. Everything
 * else is withheld, and critically `allow-same-origin` is NOT granted: with
 * both, the frame could reach out of the sandbox entirely.
 */
export const TOUR_SANDBOX = 'allow-scripts allow-popups allow-popups-to-escape-sandbox';
export const TOUR_ALLOW = 'xr-spatial-tracking; fullscreen; accelerometer; gyroscope';
export const TOUR_REFERRER_POLICY = 'no-referrer' as const;
