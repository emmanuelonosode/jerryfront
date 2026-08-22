import { redirect } from 'next/navigation';

/**
 * `/apply` goes straight to the application.
 *
 * WHAT USED TO BE HERE, AND WHY IT IS GONE. This was a pre-qualification
 * questionnaire - income multiples, credit band, prior evictions, voucher
 * amount - that scored an applicant and told them their odds before letting
 * them proceed. It was well-meant, and it was the wrong product: this is a
 * normal letting business. Someone finds a house they like, they apply, an
 * agent talks to them, and if it is a fit they get it.
 *
 * A screening interrogation in front of that does three bad things. It asks for
 * financial detail before anyone has agreed to anything, it implies the site
 * makes the decision when an agent does, and it filters out people the agent
 * might well have said yes to.
 *
 * The application itself still asks what an application has always asked -
 * who you are, what you do, where you have lived. That is the agent's
 * conversation starter, not a gate with a threshold attached.
 */
export default function ApplyIndex() {
  // Via /apply/start, not straight to the first step: that route mints the
  // draft and sets its cookie before any form is submitted, which the first
  // step's validation depends on.
  redirect('/apply/start');
}
