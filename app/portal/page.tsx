import { redirect } from 'next/navigation';

/**
 * `/portal` is the address on the "Resident login" link in the site header, so
 * it has to resolve to something. It is not a page in its own right - the
 * dashboard is the portal's front door.
 *
 * The proxy has already decided whether this visitor has a session: signed out,
 * they never reach here and land on the login form instead.
 */
export default function PortalIndex() {
  redirect('/portal/dashboard');
}
