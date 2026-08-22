/**
 * Generated listing artwork.
 *
 * WHY THIS EXISTS. Every card on the site showed a grey rectangle with the word
 * PLACEHOLDER across it. That is honest and it is also why the whole product
 * read as dead: a housing site is photography-led, and a page of grey boxes has
 * no chance of feeling like somewhere you would live.
 *
 * WHAT THIS IS AND IS NOT. Illustrated scenes, drawn from the listing's own
 * data - the seed is the slug, so a home always gets the same picture, and the
 * facade varies by home type and the light varies by index. It is stand-in art
 * that looks composed rather than missing. It is NOT a photograph and does not
 * pretend to be: no scene shows a specific, identifiable house, and the caption
 * on every card says the photography is pending.
 *
 * That distinction matters more here than on most products. This company's
 * position is that it is the real one in a category full of fakes, so shipping
 * stock imagery that implies "here is your home" would be the exact lie the
 * brand exists not to tell. An obviously-illustrated scene cannot be mistaken
 * for the house.
 */

export type SceneKind = 'exterior' | 'interior' | 'kitchen' | 'city';

/** Deterministic 32-bit hash, so a slug always yields the same picture. */
function hash(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Deterministic PRNG from the hash, so variation is stable across renders. */
function rng(seed: string) {
  let s = hash(seed) || 1;
  return () => {
    s ^= s << 13; s >>>= 0;
    s ^= s >> 17;
    s ^= s << 5; s >>>= 0;
    return s / 4294967296;
  };
}

const pick = <T,>(random: () => number, list: readonly T[]): T =>
  list[Math.floor(random() * list.length) % list.length];

/**
 * Palettes.
 *
 * Warm and daylit rather than the cool greys the old plates used. Each is a
 * whole scene's worth of colour so the set has variety without any one card
 * looking out of place beside another.
 */
const SKIES = [
  ['#BFE3F5', '#E9F4FA'], ['#C9DFF2', '#F1F6FB'], ['#F6DFC9', '#FBEFE3'],
  ['#D6E4F0', '#F4F8FC'], ['#E7DCF2', '#F6F1FB'],
] as const;

const FACADES = [
  ['#D9CBB6', '#C2B199'], ['#C8D3D8', '#AEBDC4'], ['#E0CFC2', '#CBB6A6'],
  ['#BFC9BC', '#A6B3A3'], ['#D8C4C0', '#C2A9A4'], ['#CDD6E0', '#B3BFCC'],
] as const;

const ROOFS = ['#5C5A57', '#4A5A63', '#6B5347', '#4F5B4E', '#5A4F5C'] as const;
const FOLIAGE = [
  ['#8FB98A', '#6E9C6B'], ['#A3BE8C', '#7F9E70'], ['#93B7A0', '#6F9880'],
] as const;

function defs(id: string, sky: readonly [string, string], ground: string): string {
  return `<defs>
    <linearGradient id="sky-${id}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${sky[0]}"/><stop offset="100%" stop-color="${sky[1]}"/>
    </linearGradient>
    <linearGradient id="ground-${id}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${ground}"/><stop offset="100%" stop-color="#F2EDE4"/>
    </linearGradient>
    <linearGradient id="glass-${id}" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#F4F8FB" stop-opacity="0.95"/>
      <stop offset="100%" stop-color="#9FB6C4" stop-opacity="0.9"/>
    </linearGradient>
  </defs>`;
}

function tree(x: number, y: number, scale: number, leaf: readonly [string, string]): string {
  const s = scale;
  return `<g transform="translate(${x} ${y}) scale(${s})">
    <rect x="-5" y="-38" width="10" height="42" rx="3" fill="#7A6551"/>
    <ellipse cx="0" cy="-56" rx="42" ry="36" fill="${leaf[0]}"/>
    <ellipse cx="-16" cy="-44" rx="28" ry="24" fill="${leaf[1]}" opacity="0.85"/>
    <ellipse cx="18" cy="-46" rx="24" ry="21" fill="${leaf[1]}" opacity="0.7"/>
  </g>`;
}

function exteriorScene(id: string, random: () => number, w: number, h: number): string {
  const sky = pick(random, SKIES);
  const [wall, wallShade] = pick(random, FACADES);
  const roof = pick(random, ROOFS);
  const leaf = pick(random, FOLIAGE);
  const storeys = random() > 0.62 ? 2 : 1;
  const bodyH = storeys === 2 ? 300 : 210;
  const bodyY = h - 150 - bodyH;
  const bodyX = w * 0.22;
  const bodyW = w * 0.56;

  const windows: string[] = [];
  const cols = 3;
  for (let row = 0; row < storeys; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      // The middle of the ground floor is the door, not a window.
      if (row === storeys - 1 && col === 1) continue;
      const wx = bodyX + 46 + col * ((bodyW - 130) / (cols - 1));
      const wy = bodyY + 52 + row * 130;
      windows.push(
        `<g><rect x="${wx}" y="${wy}" width="74" height="86" rx="4" fill="url(#glass-${id})" stroke="#FBFAF7" stroke-width="6"/>
         <path d="M${wx + 37} ${wy}v86M${wx} ${wy + 43}h74" stroke="#FBFAF7" stroke-width="4"/></g>`,
      );
    }
  }

  const doorX = bodyX + bodyW / 2 - 38;
  const doorY = h - 150 - 118;

  return `${defs(id, sky, '#DCE6D2')}
  <rect width="${w}" height="${h}" fill="url(#sky-${id})"/>
  <circle cx="${w * 0.82}" cy="${h * 0.16}" r="54" fill="#FFF4D9" opacity="0.9"/>
  <rect y="${h - 150}" width="${w}" height="150" fill="url(#ground-${id})"/>
  <path d="M0 ${h - 150}h${w}" stroke="#CBD7BF" stroke-width="3"/>

  ${tree(w * 0.1, h - 150, 1.05, leaf)}
  ${tree(w * 0.92, h - 150, 0.85, leaf)}

  <!-- Body -->
  <rect x="${bodyX}" y="${bodyY}" width="${bodyW}" height="${bodyH}" fill="${wall}"/>
  <rect x="${bodyX}" y="${bodyY}" width="${bodyW * 0.34}" height="${bodyH}" fill="${wallShade}" opacity="0.55"/>
  <!-- Roof -->
  <path d="M${bodyX - 34} ${bodyY} L${bodyX + bodyW / 2} ${bodyY - 96} L${bodyX + bodyW + 34} ${bodyY} Z" fill="${roof}"/>
  <path d="M${bodyX - 34} ${bodyY}h${bodyW + 68}" stroke="#F7F4EE" stroke-width="7"/>
  <!-- Door and step -->
  <rect x="${doorX}" y="${doorY}" width="76" height="118" rx="5" fill="${roof}" opacity="0.9"/>
  <circle cx="${doorX + 60}" cy="${doorY + 62}" r="4" fill="#F3E7C8"/>
  <rect x="${doorX - 16}" y="${h - 150}" width="108" height="12" rx="4" fill="#E4DED2"/>
  ${windows.join('')}
  <!-- Path -->
  <path d="M${doorX + 38} ${h - 138} L${doorX + 8} ${h} L${doorX + 68} ${h} Z" fill="#EDE7DB"/>`;
}

function interiorScene(id: string, random: () => number, w: number, h: number, kitchen: boolean): string {
  const sky = pick(random, SKIES);
  const wallTone = pick(random, ['#F3EFE8', '#EFEDE8', '#F4EEE7', '#EDF0EC', '#F1EDF0'] as const);
  const floor = pick(random, ['#C9A87C', '#B98F63', '#D2BCA0', '#A8825C'] as const);
  const accent = pick(random, ['#7F9E70', '#8FA9BE', '#BE9A7F', '#9B8FAE', '#C29A86'] as const);
  const leaf = pick(random, FOLIAGE);

  // Floor sits low in the frame. The first version put it at two thirds, which
  // filled a third of every card with a flat brown slab and made the rooms read
  // as empty rather than furnished.
  const floorY = h * 0.78;
  const skirting = 18;

  const window = `
  <rect x="${w * 0.58}" y="${h * 0.1}" width="${w * 0.3}" height="${h * 0.46}" rx="4" fill="url(#sky-${id})" stroke="#FCFBF8" stroke-width="14"/>
  <path d="M${w * 0.73} ${h * 0.1}v${h * 0.46}M${w * 0.58} ${h * 0.33}h${w * 0.3}" stroke="#FCFBF8" stroke-width="9"/>
  <path d="M${w * 0.58} ${h * 0.56} L${w * 0.42} ${floorY} L${w * 0.99} ${floorY} L${w * 0.9} ${h * 0.56} Z" fill="#FFFDF2" opacity="0.45"/>`;

  if (kitchen) {
    const counterY = floorY - 150;
    return `${defs(id, sky, floor)}
    <rect width="${w}" height="${h}" fill="${wallTone}"/>
    <rect y="${floorY}" width="${w}" height="${h - floorY}" fill="${floor}"/>
    <rect y="${floorY - skirting}" width="${w}" height="${skirting}" fill="#FCFBF8"/>
    ${window}

    <!-- Upper cabinets -->
    <rect x="${w * 0.05}" y="${h * 0.12}" width="${w * 0.24}" height="${h * 0.22}" rx="5" fill="#E9E4DA"/>
    <rect x="${w * 0.31}" y="${h * 0.12}" width="${w * 0.18}" height="${h * 0.22}" rx="5" fill="#E9E4DA"/>
    <path d="M${w * 0.17} ${h * 0.12}v${h * 0.22}" stroke="#D6CFC1" stroke-width="3"/>
    <g fill="#B9AF9D">
      <rect x="${w * 0.155}" y="${h * 0.28}" width="26" height="7" rx="3"/>
      <rect x="${w * 0.4}" y="${h * 0.28}" width="26" height="7" rx="3"/>
    </g>

    <!-- Backsplash and worktop -->
    <rect x="${w * 0.05}" y="${counterY - 96}" width="${w * 0.44}" height="96" fill="#EFEAE0"/>
    <g stroke="#E2DBCD" stroke-width="2">
      <path d="M${w * 0.05} ${counterY - 64}h${w * 0.44}M${w * 0.05} ${counterY - 32}h${w * 0.44}"/>
    </g>
    <rect x="${w * 0.05}" y="${counterY}" width="${w * 0.44}" height="18" rx="4" fill="#3F3A34"/>
    <rect x="${w * 0.05}" y="${counterY + 18}" width="${w * 0.44}" height="${floorY - counterY - 18}" fill="#E4DED2"/>
    <g stroke="#CFC7B8" stroke-width="3">
      <path d="M${w * 0.19} ${counterY + 22}v${floorY - counterY - 26}M${w * 0.33} ${counterY + 22}v${floorY - counterY - 26}"/>
    </g>
    <!-- Sink and tap -->
    <rect x="${w * 0.09}" y="${counterY + 2}" width="86" height="14" rx="5" fill="#BFC5C7"/>
    <path d="M${w * 0.13} ${counterY} v-34 q0-14 16-14 t16 14" stroke="#9AA3A6" stroke-width="6" fill="none"/>
    <!-- Range -->
    <rect x="${w * 0.36}" y="${counterY + 18}" width="${w * 0.13}" height="${floorY - counterY - 18}" fill="#D5CEC2"/>
    <g fill="#8E877B">
      <circle cx="${w * 0.4}" cy="${counterY + 8}" r="7"/><circle cx="${w * 0.45}" cy="${counterY + 8}" r="7"/>
    </g>
    <!-- Fruit bowl, for a bit of life -->
    <ellipse cx="${w * 0.27}" cy="${counterY - 4}" rx="30" ry="10" fill="${accent}"/>`;
  }

  const sofaY = floorY - 132;
  return `${defs(id, sky, floor)}
  <rect width="${w}" height="${h}" fill="${wallTone}"/>
  <rect y="${floorY}" width="${w}" height="${h - floorY}" fill="${floor}"/>
  <rect y="${floorY - skirting}" width="${w}" height="${skirting}" fill="#FCFBF8"/>
  ${window}

  <!-- Rug, so the furniture sits on something -->
  <ellipse cx="${w * 0.42}" cy="${floorY + (h - floorY) * 0.55}" rx="${w * 0.34}" ry="${(h - floorY) * 0.42}" fill="#E8DFD1" opacity="0.85"/>

  <!-- Wall art -->
  <rect x="${w * 0.11}" y="${h * 0.13}" width="${w * 0.13}" height="${h * 0.2}" rx="3" fill="#FCFBF8" stroke="#DED7C8" stroke-width="6"/>
  <rect x="${w * 0.135}" y="${h * 0.16}" width="${w * 0.08}" height="${h * 0.14}" fill="${accent}" opacity="0.5"/>
  <rect x="${w * 0.27}" y="${h * 0.18}" width="${w * 0.09}" height="${h * 0.13}" rx="3" fill="#FCFBF8" stroke="#DED7C8" stroke-width="6"/>

  <!-- Sofa -->
  <rect x="${w * 0.08}" y="${sofaY}" width="${w * 0.4}" height="106" rx="16" fill="${accent}"/>
  <rect x="${w * 0.08}" y="${sofaY - 46}" width="${w * 0.4}" height="58" rx="16" fill="${accent}" opacity="0.82"/>
  <rect x="${w * 0.115}" y="${sofaY - 34}" width="76" height="52" rx="12" fill="#FBF7F0" opacity="0.75"/>
  <rect x="${w * 0.21}" y="${sofaY - 34}" width="76" height="52" rx="12" fill="#FBF7F0" opacity="0.55"/>
  <g fill="#8B7A63">
    <rect x="${w * 0.1}" y="${sofaY + 100}" width="14" height="26" rx="4"/>
    <rect x="${w * 0.45}" y="${sofaY + 100}" width="14" height="26" rx="4"/>
  </g>

  <!-- Coffee table -->
  <rect x="${w * 0.52}" y="${floorY - 54}" width="${w * 0.19}" height="14" rx="6" fill="#B08B62"/>
  <g fill="#8B7A63">
    <rect x="${w * 0.545}" y="${floorY - 42}" width="10" height="40" rx="3"/>
    <rect x="${w * 0.675}" y="${floorY - 42}" width="10" height="40" rx="3"/>
  </g>

  <!-- Plant -->
  <path d="M${w * 0.9} ${floorY} v-42" stroke="#7A6551" stroke-width="8"/>
  <ellipse cx="${w * 0.9}" cy="${floorY - 74}" rx="46" ry="40" fill="${leaf[0]}"/>
  <ellipse cx="${w * 0.878}" cy="${floorY - 60}" rx="28" ry="24" fill="${leaf[1]}" opacity="0.8"/>
  <path d="M${w * 0.878} ${floorY} h44 l-7 34 h-30 Z" fill="#C9A87C"/>`;
}

function cityScene(id: string, random: () => number, w: number, h: number): string {
  const sky = pick(random, SKIES);
  const towers: string[] = [];
  let x = -40;
  while (x < w + 40) {
    const tw = 60 + Math.floor(random() * 90);
    const th = 120 + Math.floor(random() * (h * 0.55));
    const depth = random();
    const tone = depth > 0.6 ? '#7C8A99' : depth > 0.3 ? '#93A1AE' : '#AAB6C1';
    const y = h - 120 - th;
    const lights: string[] = [];
    for (let ly = y + 18; ly < h - 140; ly += 26) {
      for (let lx = x + 12; lx < x + tw - 14; lx += 22) {
        if (random() > 0.55) lights.push(`<rect x="${lx}" y="${ly}" width="9" height="12" rx="2" fill="#FFF3D2" opacity="0.85"/>`);
      }
    }
    towers.push(`<g><rect x="${x}" y="${y}" width="${tw}" height="${th}" fill="${tone}"/>${lights.join('')}</g>`);
    x += tw + 6 + Math.floor(random() * 14);
  }

  return `${defs(id, sky, '#C9D6DE')}
  <rect width="${w}" height="${h}" fill="url(#sky-${id})"/>
  <circle cx="${w * 0.2}" cy="${h * 0.2}" r="46" fill="#FFF4D9" opacity="0.85"/>
  ${towers.join('')}
  <rect y="${h - 120}" width="${w}" height="120" fill="url(#ground-${id})"/>
  <path d="M0 ${h - 120}h${w}" stroke="#B9C6CE" stroke-width="3"/>
  <g fill="#AEBBC4" opacity="0.6">
    <rect y="${h - 70}" width="${w}" height="4"/>
  </g>`;
}

/**
 * Build an SVG scene.
 *
 * `role="img"` with no label: the scene is decorative in every place it is
 * used, and the card's own heading names the home. An alt text describing an
 * illustration of a house nobody will live in is noise.
 */
export function buildScene(seed: string, kind: SceneKind, width = 1200, height = 800): string {
  const random = rng(`${seed}:${kind}`);
  const id = hash(seed).toString(36).slice(0, 6);

  const body =
    kind === 'city' ? cityScene(id, random, width, height)
      : kind === 'kitchen' ? interiorScene(id, random, width, height, true)
        : kind === 'interior' ? interiorScene(id, random, width, height, false)
          : exteriorScene(id, random, width, height);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="presentation">${body}</svg>`;
}

/** Which scene a photo at a given position should be. Exterior always first. */
export function sceneKindFor(index: number): SceneKind {
  if (index === 0) return 'exterior';
  if (index === 1) return 'interior';
  if (index === 2) return 'kitchen';
  return index % 2 === 0 ? 'interior' : 'exterior';
}
