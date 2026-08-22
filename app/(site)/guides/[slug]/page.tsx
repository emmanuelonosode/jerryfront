import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Container, Prose } from '@/components/layout/Container';
import { ButtonLink } from '@/components/ui/Button';
import { CATEGORY_LABEL, GUIDES, findGuide } from '@/lib/content/guides';
import { JsonLd } from '@/components/seo/JsonLd';
import { articleJsonLd, breadcrumbJsonLd } from '@/lib/seo/structuredData';
import styles from '../guides.module.css';

export function generateStaticParams() {
  return GUIDES.map((g) => ({ slug: g.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const guide = findGuide(slug);
  if (!guide) return { title: 'Not found', robots: { index: false, follow: true } };

  return {
    title: guide.title,
    description: guide.summary,
    alternates: { canonical: `/guides/${guide.slug}` },
  };
}

/**
 * A guide.
 *
 * Indexed and genuinely useful - the whole reason this section exists. The
 * content deliberately does not sell: several of these guides tell someone how
 * to challenge a landlord, including us. That is what makes the rest of the
 * site's transparency claim credible rather than decorative.
 */
export default async function GuidePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const guide = findGuide(slug);
  if (!guide) notFound();

  const related = guide.related.map(findGuide).filter((g): g is NonNullable<typeof g> => Boolean(g));

  return (
    <main id="main" className={styles.page}>
      <Container width="prose">
        <nav className={styles.breadcrumb} aria-label="Breadcrumb">
          <Link href="/guides">Renter guides</Link>
        </nav>

        <header className={styles.articleHeader}>
          <p className={styles.eyebrow}>
            {CATEGORY_LABEL[guide.category]} ·{' '}
            <span className={styles.figure}>{guide.minutes}</span> min read
          </p>
          <h1 className={styles.articleTitle}>{guide.title}</h1>
          <p className={styles.articleUpdated}>
            Last reviewed <span className={styles.figure}>{guide.updated}</span>
          </p>
        </header>

        <Prose>
          {guide.intro.map((p) => (
            <p key={p} className={styles.introPara}>
              {p}
            </p>
          ))}

          {guide.sections.map((section) => (
            <section key={section.heading}>
              <h2>{section.heading}</h2>
              {section.paragraphs.map((p) => (
                <p key={p}>{p}</p>
              ))}
              {section.list ? (
                <ul className={styles.guideList}>
                  {section.list.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              ) : null}
            </section>
          ))}
        </Prose>

        <aside className={styles.disclaimer}>
          <p>
            General information, not formal legal advice. Rules vary by state and municipality;
            check with your local housing agency or legal aid office for regional regulations.
          </p>
        </aside>

        {related.length > 0 ? (
          <section className={styles.related} aria-labelledby="related-heading">
            <h2 className={styles.relatedTitle} id="related-heading">
              Related
            </h2>
            <ul className={styles.relatedList} role="list">
              {related.map((r) => (
                <li key={r.slug}>
                  <Link href={`/guides/${r.slug}`}>{r.title}</Link>
                  <span className={styles.relatedSummary}>{r.summary}</span>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <div className={styles.cta}>
          <div>
            <h2 className={styles.ctaTitle}>Our criteria are published too</h2>
            <p className={styles.ctaBody}>
              If you are looking now, you can read exactly what we look at before you apply
              or pay anything.
            </p>
          </div>
          <ButtonLink href="/qualifications" variant="secondary">
            Read the criteria
          </ButtonLink>
        </div>
        <JsonLd data={articleJsonLd(guide)} />
        <JsonLd
          data={breadcrumbJsonLd([
            { name: 'Renter guides', path: '/guides' },
            { name: guide.title, path: `/guides/${guide.slug}` },
          ])}
        />
      </Container>
    </main>
  );
}
