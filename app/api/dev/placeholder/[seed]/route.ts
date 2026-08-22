/**
 * Development placeholder imagery.
 *
 * Deliberately an obvious grey plate with its dimensions on it, not a stock
 * photograph of a house. Section 4 of the brief rules out stock photography,
 * and a fixture that looks like a real home is one screenshot away from being
 * mistaken for shipped work. Real photographs arrive through the I3 ingest
 * pipeline from infrastructure we control.
 */
import { buildScene, sceneKindFor, type SceneKind } from '@/lib/artwork/scene';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ seed: string }> },
) {
  const { seed } = await params;

  /**
   * `?kb=` pads the response to a target size.
   *
   * Used by the performance audit to answer a question a lightweight SVG
   * cannot: what happens to LCP when real photography lands. Measuring the
   * placeholder and calling it a pass would be measuring the wrong site - the
   * images are the entire risk on these pages.
   */
  const targetKb = Number(new URL(request.url).searchParams.get('kb') ?? 0);
  const w = 1200;
  const h = 800;

  // Illustrated scene rather than a grey plate. See lib/artwork/scene.ts for
  // why this is drawn rather than photographed: it must not be mistakable for
  // the actual house, on a site whose whole position is being the real one.
  const kindParam = new URL(request.url).searchParams.get('kind');
  const kind: SceneKind =
    kindParam === 'city' || kindParam === 'interior' || kindParam === 'kitchen' || kindParam === 'exterior'
      ? kindParam
      : sceneKindFor(Number(new URL(request.url).searchParams.get('i') ?? 0));

  const svg = buildScene(seed, kind, w, h);

  const padded =
    targetKb > 0
      ? svg.replace('</svg>', `<desc>${'x'.repeat(Math.max(0, targetKb * 1024 - svg.length))}</desc></svg>`)
      : svg;

  return new Response(padded, {
    headers: { 'Content-Type': 'image/svg+xml', 'Cache-Control': 'public, max-age=3600' },
  });
}
