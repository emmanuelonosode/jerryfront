import { NotFoundContent } from '@/components/errors/NotFoundContent';

/** Catches `notFound()` thrown inside a site page. */
export default async function NotFound() {
  return <NotFoundContent />;
}
