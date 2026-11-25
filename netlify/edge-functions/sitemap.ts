import firebaseConfig from '../../firebase-applet-config.json' with { type: 'json' };

const CANONICAL_SITE_ORIGIN = 'https://darswithosama.netlify.app';

interface FirestoreRestDoc {
  name?: string;
  fields?: Record<string, any>;
  updateTime?: string;
}

interface SitemapEntry {
  loc: string;
  lastmod?: string;
  changefreq?: 'daily' | 'weekly' | 'monthly';
  priority?: number;
}

function toValidIsoDate(value?: unknown): string | undefined {
  if (!value || typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) return undefined;
  const year = parsed.getUTCFullYear();
  if (year < 2000 || year > 2100) return undefined;
  return parsed.toISOString();
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function buildCanonicalUrl(pathname: string): string {
  const clean = (pathname || '/').split(/[?#]/)[0].replace(/\/{2,}/g, '/');
  if (clean === '/') return `${CANONICAL_SITE_ORIGIN}/`;
  return `${CANONICAL_SITE_ORIGIN}${clean.startsWith('/') ? clean : `/${clean}`}`.replace(/\/+$/, '');
}

function buildSitemapXml(entries: SitemapEntry[]): string {
  const seen = new Set<string>();
  const urlBlocks: string[] = [];

  for (const entry of entries) {
    const loc = buildCanonicalUrl(entry.loc);
    if (!loc.startsWith(`${CANONICAL_SITE_ORIGIN}/`) || loc.includes('?') || loc.includes('#')) {
      continue;
    }
    if (seen.has(loc)) continue;
    seen.add(loc);

    const lines: string[] = ['  <url>', `    <loc>${escapeXml(loc)}</loc>`];
    const validLastmod = toValidIsoDate(entry.lastmod);
    if (validLastmod) {
      lines.push(`    <lastmod>${escapeXml(validLastmod)}</lastmod>`);
    }
    if (entry.changefreq) {
      lines.push(`    <changefreq>${entry.changefreq}</changefreq>`);
    }
    if (typeof entry.priority === 'number') {
      lines.push(`    <priority>${entry.priority.toFixed(1)}</priority>`);
    }
    lines.push('  </url>');
    urlBlocks.push(lines.join('\n'));
  }

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...urlBlocks,
    '</urlset>',
    ''
  ].join('\n');
}

function getStringField(fields: Record<string, any> | undefined, key: string): string {
  const val = fields?.[key]?.stringValue;
  return typeof val === 'string' ? val.trim() : '';
}

function getBoolField(fields: Record<string, any> | undefined, key: string): boolean | undefined {
  const val = fields?.[key]?.booleanValue;
  return typeof val === 'boolean' ? val : undefined;
}

function getTimestampField(fields: Record<string, any> | undefined, key: string): string | undefined {
  const raw = fields?.[key];
  if (!raw) return undefined;
  if (typeof raw.timestampValue === 'string') return toValidIsoDate(raw.timestampValue);
  if (typeof raw.stringValue === 'string') return toValidIsoDate(raw.stringValue);
  return undefined;
}

function extractDocId(name?: string): string {
  if (!name) return '';
  const idx = name.lastIndexOf('/');
  return idx >= 0 ? name.slice(idx + 1) : name;
}

async function fetchCollectionDocs(
  baseRestUrl: string,
  collectionPath: string,
  apiKey: string
): Promise<FirestoreRestDoc[]> {
  const docs: FirestoreRestDoc[] = [];
  let pageToken = '';
  for (let page = 0; page < 5; page++) {
    const url = new URL(`${baseRestUrl}/${collectionPath}`);
    url.searchParams.set('pageSize', '200');
    if (apiKey) url.searchParams.set('key', apiKey);
    if (pageToken) url.searchParams.set('pageToken', pageToken);

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 4000);
    try {
      const res = await fetch(url.toString(), { signal: controller.signal });
      if (!res.ok) break;
      const data = await res.json();
      if (Array.isArray(data.documents)) {
        docs.push(...data.documents);
      }
      if (!data.nextPageToken) break;
      pageToken = data.nextPageToken;
    } finally {
      clearTimeout(timer);
    }
  }
  return docs;
}

export default async function sitemapEdgeHandler(
  _request: Request,
  context: { next: () => Promise<Response> }
): Promise<Response> {
  const projectId = firebaseConfig.projectId;
  const databaseId = firebaseConfig.firestoreDatabaseId || '(default)';
  const apiKey = firebaseConfig.apiKey || '';

  if (!projectId) {
    return context.next();
  }

  const baseRestUrl = `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(
    projectId
  )}/databases/${encodeURIComponent(databaseId)}/documents`;

  try {
    const [courseDocs, blogDocs, bookDocs, qaDocs] = await Promise.all([
      fetchCollectionDocs(baseRestUrl, 'courses', apiKey),
      fetchCollectionDocs(baseRestUrl, 'blogPosts', apiKey),
      fetchCollectionDocs(baseRestUrl, 'libraryBooks', apiKey),
      fetchCollectionDocs(baseRestUrl, 'consultations', apiKey)
    ]);

    const entries: SitemapEntry[] = [
      { loc: '/', changefreq: 'daily', priority: 1.0 },
      { loc: '/courses', changefreq: 'weekly', priority: 0.9 },
      { loc: '/blog', changefreq: 'daily', priority: 0.9 },
      { loc: '/library', changefreq: 'weekly', priority: 0.9 },
      { loc: '/tanya-jawab', changefreq: 'weekly', priority: 0.8 },
      { loc: '/profil-pengajar', changefreq: 'monthly', priority: 0.8 }
    ];

    for (const doc of courseDocs) {
      const id = extractDocId(doc.name);
      if (!id) continue;
      if (getBoolField(doc.fields, 'isPublished') === false) continue;
      entries.push({
        loc: `/course/${encodeURIComponent(id)}`,
        lastmod:
          getTimestampField(doc.fields, 'updatedAt') ||
          getTimestampField(doc.fields, 'createdAt') ||
          toValidIsoDate(doc.updateTime),
        changefreq: 'weekly',
        priority: 0.8
      });
    }

    for (const doc of blogDocs) {
      const id = extractDocId(doc.name);
      if (!id) continue;
      if (getStringField(doc.fields, 'status') !== 'published') continue;
      const slug = getStringField(doc.fields, 'slug') || id;
      entries.push({
        loc: `/article/${encodeURIComponent(slug)}`,
        lastmod:
          getTimestampField(doc.fields, 'updatedAt') ||
          getTimestampField(doc.fields, 'publishedAt') ||
          getTimestampField(doc.fields, 'createdAt') ||
          toValidIsoDate(doc.updateTime),
        changefreq: 'monthly',
        priority: 0.8
      });
    }

    const multiVolBooks: Array<{ id: string; slug: string }> = [];
    for (const doc of bookDocs) {
      const id = extractDocId(doc.name);
      if (!id) continue;
      if (getStringField(doc.fields, 'status') !== 'published') continue;
      const slug = getStringField(doc.fields, 'slug') || id;
      const collectionType = getStringField(doc.fields, 'collectionType');
      const sourceType = getStringField(doc.fields, 'sourceType');

      entries.push({
        loc: `/library/${encodeURIComponent(slug)}`,
        lastmod:
          getTimestampField(doc.fields, 'updatedAt') ||
          getTimestampField(doc.fields, 'publishedAt') ||
          getTimestampField(doc.fields, 'createdAt') ||
          toValidIsoDate(doc.updateTime),
        changefreq: 'monthly',
        priority: 0.8
      });

      if (collectionType === 'multi_volume') {
        multiVolBooks.push({ id, slug });
      } else if (sourceType === 'internal') {
        entries.push({
          loc: `/library/${encodeURIComponent(slug)}/baca`,
          lastmod:
            getTimestampField(doc.fields, 'updatedAt') ||
            getTimestampField(doc.fields, 'publishedAt') ||
            toValidIsoDate(doc.updateTime),
          changefreq: 'monthly',
          priority: 0.7
        });
      }
    }

    await Promise.all(
      multiVolBooks.slice(0, 20).map(async ({ id, slug }) => {
        try {
          const volDocs = await fetchCollectionDocs(
            baseRestUrl,
            `libraryBooks/${encodeURIComponent(id)}/volumes`,
            apiKey
          );
          for (const vdoc of volDocs) {
            const volId = extractDocId(vdoc.name);
            if (!volId) continue;
            if (getStringField(vdoc.fields, 'status') !== 'published') continue;
            if (getStringField(vdoc.fields, 'sourceType') !== 'internal') continue;
            entries.push({
              loc: `/library/${encodeURIComponent(slug)}/jilid/${encodeURIComponent(volId)}`,
              lastmod:
                getTimestampField(vdoc.fields, 'updatedAt') ||
                getTimestampField(vdoc.fields, 'publishedAt') ||
                toValidIsoDate(vdoc.updateTime),
              changefreq: 'monthly',
              priority: 0.7
            });
          }
        } catch {
          // Ignore single book volume fetch errors
        }
      })
    );

    for (const doc of qaDocs) {
      const id = extractDocId(doc.name);
      if (!id) continue;
      if (getBoolField(doc.fields, 'isPublished') !== true) continue;
      entries.push({
        loc: `/qa/${encodeURIComponent(id)}`,
        lastmod:
          getTimestampField(doc.fields, 'publishedAt') ||
          getTimestampField(doc.fields, 'repliedAt') ||
          toValidIsoDate(doc.updateTime),
        changefreq: 'monthly',
        priority: 0.7
      });
    }

    if (entries.length <= 6) {
      return context.next();
    }

    const xml = buildSitemapXml(entries);
    return new Response(xml, {
      status: 200,
      headers: {
        'content-type': 'application/xml; charset=utf-8',
        'cache-control': 'public, max-age=300, s-maxage=600'
      }
    });
  } catch {
    return context.next();
  }
}
