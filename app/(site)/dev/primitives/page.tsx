import type { Metadata } from 'next';
import { PrimitivesMatrix } from './PrimitivesMatrix';

/**
 * Internal states matrix - the verification surface for F3.
 *
 * Not one of the 29 routes in the IA. It is excluded from the index and must
 * stay out of the sitemap; task S1 should assert that. Keep it: it is the
 * cheapest way to catch a primitive regressing across both themes, and the
 * design review in phase 7 will shoot it directly.
 */
export const metadata: Metadata = {
  title: 'Primitives',
  robots: { index: false, follow: false },
};

export default function PrimitivesPage() {
  return <PrimitivesMatrix />;
}
