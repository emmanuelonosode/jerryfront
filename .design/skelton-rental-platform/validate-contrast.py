#!/usr/bin/env python3
"""
WCAG 2.1 contrast validation for the Ticketmaster-inspired palette.

READS THE SHIPPED TOKENS. The previous revision hardcoded hex values copied out
of the token file, which meant it validated a snapshot rather than the thing on
the page — the two drift the first time someone nudges a colour. This parses
app/tokens.css, resolves var() indirection, and checks both themes as built.

Run after ANY palette edit:
    python3 .design/skelton-rental-platform/validate-contrast.py
"""

import pathlib
import re
import sys

ROOT = pathlib.Path(__file__).resolve().parents[2]
TOKENS = ROOT / 'app' / 'tokens.css'


def srgb_to_lin(c):
    c = c / 255.0
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4


def luminance(hexstr):
    h = hexstr.lstrip('#')
    if len(h) == 3:
        h = ''.join(ch * 2 for ch in h)
    r, g, b = (int(h[i:i + 2], 16) for i in (0, 2, 4))
    return 0.2126 * srgb_to_lin(r) + 0.7152 * srgb_to_lin(g) + 0.0722 * srgb_to_lin(b)


def ratio(fg, bg):
    l1, l2 = luminance(fg), luminance(bg)
    hi, lo = max(l1, l2), min(l1, l2)
    return (hi + 0.05) / (lo + 0.05)


def hue(hexstr):
    h = hexstr.lstrip('#')
    r, g, b = (int(h[i:i + 2], 16) / 255 for i in (0, 2, 4))
    mx, mn = max(r, g, b), min(r, g, b)
    d = mx - mn
    if d == 0:
        return None, 0.0
    lightness = (mx + mn) / 2
    s = d / (1 - abs(2 * lightness - 1)) if lightness not in (0, 1) else 0
    if mx == r:
        hh = ((g - b) / d) % 6
    elif mx == g:
        hh = (b - r) / d + 2
    else:
        hh = (r - g) / d + 4
    return round(hh * 60), s


# ---- Parse -----------------------------------------------------------------

def blocks_for(css, selector):
    """Every top-level block whose selector matches, by brace matching.

    Regex-to-the-first-`\n}` was fine when the palette was one flat :root, but
    the token file now declares the dark palette as `--dk-*` values in a second
    :root and maps them in the theme blocks, so only reading the first match
    silently lost every dark colour and reported the whole dark theme as
    "unresolved" rather than as a failure or a pass.
    """
    out = []
    for m in re.finditer(re.escape(selector) + r'\s*\{', css):
        depth, i = 1, m.end()
        while i < len(css) and depth:
            if css[i] == '{':
                depth += 1
            elif css[i] == '}':
                depth -= 1
            i += 1
        out.append(css[m.end():i - 1])
    return out


def parse_tokens():
    """Return (light, dark) dicts of token -> hex, with var() resolved."""
    css = TOKENS.read_text()

    root_blocks = blocks_for(css, ':root')
    dark_blocks = blocks_for(css, "[data-theme='dark']")
    if not root_blocks:
        sys.exit('Could not locate :root in app/tokens.css')
    # THE SITE IS LIGHT-ONLY BY CHOICE. No dark block is the expected state, so
    # its absence is not an error - the pairings below simply run once, against
    # the light palette. If a dark theme is ever reintroduced, this picks the
    # dark values back up on its own.

    def decls(block):
        return dict(re.findall(r'(--[a-z0-9-]+)\s*:\s*([^;]+);', block))

    # Merge every :root block: the palette, the --dk-* dark values, and the
    # 900px type step (harmless here — it declares no colours).
    light_raw = {}
    for b in root_blocks:
        light_raw.update(decls(b))

    dark_raw = dict(light_raw)
    for b in dark_blocks:
        dark_raw.update(decls(b))

    def resolve(raw):
        out = {}
        for name in raw:
            value, seen = raw[name], 0
            while value and value.strip().startswith('var(') and seen < 10:
                ref = re.match(r'var\(\s*(--[a-z0-9-]+)', value.strip())
                if not ref or ref.group(1) not in raw:
                    break
                value = raw[ref.group(1)]
                seen += 1
            value = (value or '').strip()
            if re.fullmatch(r'#[0-9A-Fa-f]{3,8}', value):
                out[name] = value[:7]
        return out

    return resolve(light_raw), resolve(dark_raw)


def check_dark_parity():
    """The two dark blocks must stay identical.

    Plain CSS cannot share a declaration block between `[data-theme='dark']`
    and `@media (prefers-color-scheme: dark)`, so the mapping is written twice.
    Everything below is validated against the first block only, which means a
    fix landing in one copy and not the other would validate clean while every
    user on system-dark-without-a-toggle got the unfixed palette. This makes
    that specific failure loud. (It has already happened once.)
    """
    css = TOKENS.read_text()
    a = blocks_for(css, "[data-theme='dark']")
    b = blocks_for(css, ":root:not([data-theme='light'])")
    if not a and not b:
        print('DARK BLOCK PARITY: skipped - the site is light-only')
        return
    if not a or not b:
        sys.exit(
            'Exactly one dark block is present in app/tokens.css. Either both '
            'exist and agree, or neither does; one alone means system-dark '
            'users get a half-applied palette.'
        )

    def decls(block):
        return dict(
            (k, v.strip())
            for k, v in re.findall(r'(--[a-z0-9-]+)\s*:\s*([^;]+);', block)
        )

    da, db = decls(a[0]), decls(b[0])
    missing = sorted(set(da) - set(db))
    extra = sorted(set(db) - set(da))
    differing = sorted(k for k in set(da) & set(db) if da[k] != db[k])

    if missing or extra or differing:
        print('DARK BLOCK PARITY: ** FAIL **')
        for k in missing:
            print(f'  only in [data-theme=dark]: {k}')
        for k in extra:
            print(f'  only in media-dark:        {k}')
        for k in differing:
            print(f'  differs: {k}  {da[k]!r} vs {db[k]!r}')
        return False

    print(f'DARK BLOCK PARITY: {len(da)} tokens, both blocks identical')
    return True


LIGHT, DARK = parse_tokens()

# ---- Pairings that actually ship -------------------------------------------
# (label, foreground token, background token, required ratio)
#
# Requirements follow what the thing IS, which is the part most often got wrong:
#   4.5:1  text, including placeholder and caption text
#   3.0:1  non-text UI that carries meaning — control boundaries, status dots,
#          the focus indicator
#   exempt decorative dividers (1.4.11), and disabled controls (1.4.3)

PAIRINGS = [
    ('body text on page',            '--color-text-primary',   '--color-bg-primary',   4.5),
    ('body text on card',            '--color-text-primary',   '--color-bg-secondary', 4.5),
    ('body text on band',            '--color-text-primary',   '--color-bg-tertiary',  4.5),
    ('secondary text on page',       '--color-text-secondary', '--color-bg-primary',   4.5),
    ('secondary text on card',       '--color-text-secondary', '--color-bg-secondary', 4.5),
    ('secondary text on band',       '--color-text-secondary', '--color-bg-tertiary',  4.5),
    ('caption/placeholder on page',  '--color-text-tertiary',  '--color-bg-primary',   4.5),
    ('caption/placeholder on card',  '--color-text-tertiary',  '--color-bg-secondary', 4.5),
    ('caption/placeholder on band',  '--color-text-tertiary',  '--color-bg-tertiary',  4.5),
    ('inverse text on inverse bg',   '--color-text-inverse',   '--color-bg-inverse',   4.5),

    ('link on page',                 '--color-text-link',      '--color-bg-primary',   4.5),
    ('link on card',                 '--color-text-link',      '--color-bg-secondary', 4.5),
    ('link hover on page',           '--color-text-link-hover', '--color-bg-primary',  4.5),

    ('CTA label on CTA fill',        '--button-primary-text',  '--button-primary-bg',       4.5),
    ('CTA label on CTA hover',       '--button-primary-text',  '--button-primary-bg-hover', 4.5),
    ('CTA label on CTA active',      '--button-primary-text',  '--button-primary-bg-active', 4.5),
    ('secondary button label',       '--button-secondary-text', '--color-bg-primary',  4.5),
    ('secondary button border',      '--button-secondary-border', '--color-bg-primary', 3.0),

    ('input border on page',         '--color-border-interactive', '--color-bg-primary',   3.0),
    ('input border on input fill',   '--color-border-interactive', '--input-bg',           3.0),
    ('focus ring on page',           '--color-focus',          '--color-bg-primary',   3.0),
    ('focus ring on card',           '--color-focus',          '--color-bg-secondary', 3.0),
    # The ring is TWO-LAYER: an inner gap in the page colour, then the ring.
    # The ring never touches the button, so testing focus-colour-against-coral
    # measured a pairing that does not render. What has to clear 3:1 is the GAP
    # against the button fill — that is what separates ring from control.
    ('focus gap against CTA fill',   '--color-bg-primary',     '--button-primary-bg',  3.0),
    # The header is Pacific now, not black, so "blue accent on black chrome" no
    # longer describes anything that renders — an accent blue is never set on
    # the blue bar. The dark surface in this system is the footer, so the
    # pairing follows it there rather than being dropped.
    ('blue accent on footer chrome', '--brand-on-dark',        '--footer-chrome',      4.5),
    ('chrome text on chrome',        '--chrome-text',          '--chrome',             4.5),
    ('chrome muted on chrome',       '--chrome-text-muted',    '--chrome',             4.5),
    ('footer text on footer',        '--footer-chrome-text',   '--footer-chrome',      4.5),
    ('footer muted on footer',       '--footer-chrome-muted',  '--footer-chrome',      4.5),
]

for state in ('available', 'soon', 'pending', 'leased', 'error'):
    PAIRINGS += [
        (f'{state} label on its fill', f'--color-status-{state}-text', f'--color-status-{state}-fill', 4.5),
        (f'{state} label on page',     f'--color-status-{state}-text', '--color-bg-primary',           4.5),
        (f'{state} dot on its fill',   f'--color-status-{state}-dot',  f'--color-status-{state}-fill', 3.0),
    ]

# Prohibitions the spec states as rules. Asserting them here turns "never do
# this" from a line in a document into something that fails a check.
# The reason the blue is split into three tokens. Ticketmaster's own brand blue
# does not hold as text on its own surfaces; asserting that here stops someone
# "simplifying" the three tokens back into one.
PROHIBITED = [
    ('brand blue as text on the grey page', '--brand', '--color-bg-primary', 4.5),
    ('brand blue as text on black chrome',  '--brand', '--chrome',           4.5),
]


def run(theme, tokens):
    print(f'\n{theme.upper()}\n' + '-' * 74)
    failures = []
    for label, fg_t, bg_t, need in PAIRINGS:
        fg, bg = tokens.get(fg_t), tokens.get(bg_t)
        if not fg or not bg:
            failures.append((label, f'unresolved token ({fg_t} / {bg_t})', need))
            print(f'  {label:34} {"UNRESOLVED":>12}')
            continue
        r = ratio(fg, bg)
        ok = r >= need
        if not ok:
            failures.append((label, f'{r:.2f}:1', need))
        print(f'  {label:34} {r:8.2f}:1  need {need:>4}  {"pass" if ok else "** FAIL **"}')
    return failures


print('CONTRAST VALIDATION — Daylight')
print(f'Source: {TOKENS.relative_to(ROOT)}')
print(f'{len(LIGHT)} light tokens, {len(DARK)} dark tokens resolved to hex')

fails = run('light', LIGHT) + run('dark', DARK)

print('\nPROHIBITIONS (these must NOT pass — the spec forbids the combination)\n' + '-' * 74)
for label, fg_t, bg_t, need in PROHIBITED:
    fg = LIGHT.get(fg_t, fg_t)
    bg = LIGHT.get(bg_t, bg_t)
    r = ratio(fg, bg)
    # A prohibition is "confirmed" when the combination genuinely fails, which
    # is why the rule exists rather than being a matter of taste.
    print(f'  {label:52} {r:6.2f}:1  {"confirmed unusable" if r < need else "** now passes — rule may be stale **"}')

print('\nHUE SEPARATION (chromatic status tokens)\n' + '-' * 74)
hues = {}
for state in ('available', 'soon', 'pending', 'error'):
    c = LIGHT.get(f'--color-status-{state}-text')
    if c:
        h, s = hue(c)
        hues[state] = h
        print(f'  {state:12} hue {h:>4}deg  saturation {s * 100:.0f}%')
names = list(hues)
tight = min(
    ((a, b, min(abs(hues[a] - hues[b]), 360 - abs(hues[a] - hues[b]))) for i, a in enumerate(names) for b in names[i + 1:]),
    key=lambda t: t[2],
)
print(f'  tightest pair: {tight[0]} / {tight[1]} at {tight[2]}deg')

print()
parity_ok = check_dark_parity()

total = len(PAIRINGS) * 2
print(f'\n{total - len(fails)}/{total} pairings pass')
if fails:
    print('\nFAILURES:')
    for label, got, need in fails:
        print(f'  {label}: {got} (needs {need}:1)')
if fails or not parity_ok:
    sys.exit(1)
print('No failures.\n')
