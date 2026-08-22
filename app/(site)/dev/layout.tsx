import { notFound } from 'next/navigation';

/**
 * The /dev/* pages do not exist in production.
 *
 * They are internal previews - a layout grid, a pricing sandbox, a component
 * matrix - and they were being prerendered into production builds. That is how
 * a deploy came to fail on `/dev/layout-grid`: the page pulls the whole
 * catalogue to render sample cards, the API answered 400, and a preview nobody
 * ships took the entire build down with it.
 *
 * `notFound()` rather than a redirect or a robots rule: these should not be
 * reachable at all off a developer's machine, and a 404 is the honest answer.
 * It also removes them from the prerender pass, so their data requirements
 * stop being a production concern.
 */
export default function DevLayout({ children }: { children: React.ReactNode }) {
  if (process.env.NODE_ENV === 'production') notFound();
  return <>{children}</>;
}
