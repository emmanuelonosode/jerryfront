'use client';

import { useRef, useState } from 'react';
import { Button, ButtonLink } from '@/components/ui/Button';
import { Field } from '@/components/ui/Field';
import {
  Checkbox,
  ChoiceGroup,
  Radio,
  Rule,
  Select,
  TextInput,
  Textarea,
} from '@/components/ui/Controls';
import { Modal } from '@/components/ui/Modal';
import { Skeleton, SkeletonRegion } from '@/components/ui/Skeleton';
import { ToastItem, ToastProvider, useToasts, type ToastTone } from '@/components/ui/Toast';
import styles from './primitives.module.css';

function Section({ title, note, children }: { title: string; note?: string; children: React.ReactNode }) {
  return (
    <section className={styles.section}>
      <h2 className={styles.sectionTitle}>{title}</h2>
      {note ? <p className={styles.sectionNote}>{note}</p> : null}
      <div className={styles.sectionBody}>{children}</div>
    </section>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className={styles.row}>
      <span className={styles.rowLabel}>{label}</span>
      <div className={styles.rowBody}>{children}</div>
    </div>
  );
}

function ToastDemo() {
  const { notify } = useToasts();
  return (
    <div className={styles.cluster}>
      {(['success', 'error', 'info'] as ToastTone[]).map((tone) => (
        <Button key={tone} variant="secondary" onClick={() => notify(tone, `This is a ${tone} notification.`)}>
          Fire {tone}
        </Button>
      ))}
    </div>
  );
}

export function PrimitivesMatrix() {
  const [modalOpen, setModalOpen] = useState(false);
  const modalTriggerRef = useRef<HTMLButtonElement>(null);

  return (
    <ToastProvider>
      <main id="main" className={styles.page}>
        <header className={styles.header}>
          <p className={styles.eyebrow}>Internal · not indexed</p>
          <h1 className={styles.title}>Primitives</h1>
          <p className={styles.lead}>
            Every core component in every state. Tab through this page with the keyboard
            only - each control must be reachable and each focus ring must be visible on
            both paper and ink. Toggle your system theme to check dark.
          </p>
        </header>

        <Rule strong />

        <Section
          title="Button"
          note="Primary is solid ink - in a near-monochrome system that is the strongest affordance available, which is why no accent colour exists for it. Destructive is the only variant permitted to use the red family."
        >
          <Row label="Primary">
            <div className={styles.cluster}>
              <Button>Apply now</Button>
              <Button disabled>Disabled</Button>
              <Button loading>Apply now</Button>
              <Button size="lg">Large</Button>
            </div>
          </Row>
          <Row label="Secondary">
            <div className={styles.cluster}>
              <Button variant="secondary">Schedule a tour</Button>
              <Button variant="secondary" disabled>
                Disabled
              </Button>
              <Button variant="secondary" loading loadingLabel="Saving…">
                Save
              </Button>
            </div>
          </Row>
          <Row label="Quiet">
            <div className={styles.cluster}>
              <Button variant="quiet">Clear filters</Button>
              <Button variant="quiet" disabled>
                Disabled
              </Button>
            </div>
          </Row>
          <Row label="Destructive">
            <div className={styles.cluster}>
              <Button variant="destructive">Withdraw application</Button>
              <Button variant="destructive" disabled>
                Disabled
              </Button>
            </div>
          </Row>
          <Row label="As link">
            <div className={styles.cluster}>
              <ButtonLink href="/apply">Apply</ButtonLink>
              <ButtonLink href="/qualifications" variant="secondary">
                Screening criteria
              </ButtonLink>
            </div>
          </Row>
          <Row label="Full width">
            <Button fullWidth size="lg">
              Continue
            </Button>
          </Row>
        </Section>

        <Section
          title="Text input"
          note="Labels are always visible. Hints state why sensitive information is being asked for - required by the brief, and the difference between a completed application and an abandoned one."
        >
          <div className={styles.grid}>
            <Field name="full-name" label="Full name">{(p) => <TextInput {...p} placeholder="As it appears on your ID" />}</Field>
            <Field name="monthly-income" label="Monthly income" hint="Before tax. Include all sources you want counted." required>
              {(p) => <TextInput {...p} figure inputMode="numeric" placeholder="0" />}
            </Field>
            <Field name="social-security-number"
              label="Social security number"
              hint="Used only to run the screening report described on our criteria page. We never display it back to you."
              note="Optional"
            >
              {(p) => <TextInput {...p} figure placeholder="000-00-0000" />}
            </Field>
            <Field name="email" label="Email" error="Enter an email address so we can send your decision.">
              {(p) => <TextInput {...p} type="email" defaultValue="not-an-email" />}
            </Field>
            {/* Hint AND error together - the combination most likely to break
                describedby wiring, and the one a real application form hits
                constantly. Error is announced before the hint. */}
            <Field name="move-in-date"
              label="Move-in date"
              hint="The earliest date you could sign a lease and take the keys."
              error="Choose a date at least 3 days from today."
              required
            >
              {(p) => <TextInput {...p} figure type="date" defaultValue="2026-08-16" />}
            </Field>
            <Field name="disabled" label="Disabled">{(p) => <TextInput {...p} disabled defaultValue="Cannot edit" />}</Field>
            <Field name="notes" label="Notes">{(p) => <Textarea {...p} placeholder="Anything we should know" />}</Field>
          </div>
        </Section>

        <Section title="Select">
          <div className={styles.grid}>
            <Field name="bedrooms" label="Bedrooms">
              {(p) => (
                <Select {...p} defaultValue="">
                  <option value="">Any</option>
                  <option value="1">1+</option>
                  <option value="2">2+</option>
                </Select>
              )}
            </Field>
            <Field name="max-monthly-cost" label="Max monthly cost" error="Choose a maximum above your minimum.">
              {(p) => (
                <Select {...p} figure defaultValue="1000">
                  <option value="1000">$1,000</option>
                  <option value="1500">$1,500</option>
                </Select>
              )}
            </Field>
          </div>
        </Section>

        <Section
          title="Checkbox and radio"
          note="The whole row is the target, not the 16px box - this form gets completed on a phone."
        >
          <div className={styles.grid}>
            <ChoiceGroup legend="Accessibility features" hint="Select any that you need.">
              <Checkbox id="c1" name="a11y" label="Step-free entry" />
              <Checkbox id="c2" name="a11y" label="Roll-in shower" description="Wheelchair accessible bathroom" defaultChecked />
              <Checkbox id="c3" name="a11y" label="Unavailable option" disabled />
            </ChoiceGroup>
            <ChoiceGroup legend="Do you have a housing voucher?">
              <Radio id="r1" name="voucher" label="Yes" description="We accept vouchers in every market we serve" />
              <Radio id="r2" name="voucher" label="No" defaultChecked />
              <Radio id="r3" name="voucher" label="Not sure yet" />
            </ChoiceGroup>
          </div>
        </Section>

        <Section title="Rule">
          <Rule />
          <Rule strong />
        </Section>

        <Section
          title="Skeleton"
          note="Skeletons everywhere, spinners nowhere. Shapes are aria-hidden; one polite announcement carries the loading state."
        >
          <SkeletonRegion loading label="Loading homes">
            <div className={styles.skeletonCard}>
              <Skeleton height="10rem" />
              <Skeleton height="1.5rem" width="40%" />
              <Skeleton height="1rem" width="70%" />
              <Skeleton height="1rem" width="55%" />
            </div>
          </SkeletonRegion>
        </Section>

        <Section
          title="Toast"
          note="Each tone carries an icon and a visible word - never colour alone. Announced politely; errors that must interrupt belong inline on the field that caused them."
        >
          <ToastDemo />
          <div className={styles.staticToasts}>
            <ToastItem toast={{ id: 's', tone: 'success', message: 'Your application was saved.' }} />
            <ToastItem toast={{ id: 'e', tone: 'error', message: 'We could not upload that file. Try again.' }} />
            <ToastItem toast={{ id: 'i', tone: 'info', message: 'A decision is due by Tuesday at 4pm.' }} />
          </div>
        </Section>

        <Section
          title="Modal"
          note="Shares one behaviour hook with the nav drawer: scroll lock, focus trap, Escape, and deterministic focus return to the trigger."
        >
          <Button ref={modalTriggerRef} variant="secondary" onClick={() => setModalOpen(true)}>
            Open modal
          </Button>
          <Modal
            open={modalOpen}
            onClose={() => setModalOpen(false)}
            triggerRef={modalTriggerRef}
            title="Withdraw this application?"
            description="Your application will be closed and the fee will not be refunded. You can start a new application at any time."
            footer={
              <>
                <Button variant="quiet" onClick={() => setModalOpen(false)}>
                  Keep it open
                </Button>
                <Button variant="destructive" onClick={() => setModalOpen(false)}>
                  Withdraw
                </Button>
              </>
            }
          >
            <Field name="reason" label="Reason" note="Optional">
              {(p) => <Textarea {...p} placeholder="Helps us improve" />}
            </Field>
          </Modal>
        </Section>
      </main>
    </ToastProvider>
  );
}
