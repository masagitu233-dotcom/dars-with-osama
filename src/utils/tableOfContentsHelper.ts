/**
 * Table of Contents (Daftar Isi Otomatis) Helper for Dars with Osama
 *
 * Automatically detects Heading 1 (<h1>) elements in article HTML content,
 * generates unique collision-free anchor IDs (supporting Latin and Arabic text),
 * and prepares structured navigation items for readers.
 *
 * Excludes Heading 2 (<h2>), Heading 3 (<h3>), and paragraph (<p>) content.
 */

export interface TableOfContentsItem {
  id: string;
  text: string;
  index: number;
}

/**
 * Strips HTML tags, entities, and excessive whitespace to get plain text from a heading.
 */
export function extractCleanHeadingText(rawInnerHtml: string): string {
  if (!rawInnerHtml) return '';
  return rawInnerHtml
    .replace(/<[^>]*>/g, '') // remove inner tags (e.g. <b>, <span>, <a>)
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}

/**
 * Generates a clean, URL-safe, collision-free anchor ID for a heading.
 * Supports Latin and Arabic unicode characters, resolving duplicate titles with numeric suffixes.
 */
export function generateUniqueHeadingId(
  cleanText: string,
  existingIds: Set<string>,
  fallbackIndex: number
): string {
  // Normalize unicode, lowercase, remove control characters
  const trimmed = cleanText.trim().toLowerCase();

  // Unicode-aware regex keeping letters, numbers, and hyphens
  let slug = trimmed
    .replace(/[\s\t\n_]+/g, '-')
    .replace(/[^\p{L}\p{N}-]+/gu, '') // Keep unicode letters & numbers
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

  // If text is empty or only special characters
  if (!slug) {
    slug = `bagian-${fallbackIndex + 1}`;
  }

  // Ensure collision-free uniqueness
  let uniqueId = slug;
  let counter = 2;
  while (existingIds.has(uniqueId)) {
    uniqueId = `${slug}-${counter}`;
    counter++;
  }

  existingIds.add(uniqueId);
  return uniqueId;
}

/**
 * Extracts Table of Contents items from article HTML content.
 * Strictly detects Heading 1 (<h1>) elements only.
 */
export function extractTableOfContents(rawHtml: string): TableOfContentsItem[] {
  if (!rawHtml || typeof rawHtml !== 'string') return [];

  const items: TableOfContentsItem[] = [];
  const existingIds = new Set<string>();

  // Regex matching only <h1>...</h1> tags (case-insensitive, multiline)
  const h1Regex = /<h1\b([^>]*)>([\s\S]*?)<\/h1>/gi;
  let match: RegExpExecArray | null;
  let index = 0;

  while ((match = h1Regex.exec(rawHtml)) !== null) {
    const rawInner = match[2] || '';
    const cleanText = extractCleanHeadingText(rawInner);

    if (cleanText) {
      const id = generateUniqueHeadingId(cleanText, existingIds, index);
      items.push({
        id,
        text: cleanText,
        index: index + 1
      });
      index++;
    }
  }

  return items;
}

/**
 * Injects unique IDs and scroll margin offset classes into every Heading 1 in the article HTML.
 * Ensures heading targets are not obscured by the sticky top navigation bar.
 */
export function injectHeadingIdsIntoHtml(rawHtml: string): {
  processedHtml: string;
  items: TableOfContentsItem[];
} {
  if (!rawHtml || typeof rawHtml !== 'string') {
    return { processedHtml: '', items: [] };
  }

  const items: TableOfContentsItem[] = [];
  const existingIds = new Set<string>();
  let index = 0;

  const processedHtml = rawHtml.replace(/<h1\b([^>]*)>([\s\S]*?)<\/h1>/gi, (fullMatch, rawAttrs, innerHtml) => {
    const cleanText = extractCleanHeadingText(innerHtml);
    if (!cleanText) {
      return fullMatch;
    }

    const uniqueId = generateUniqueHeadingId(cleanText, existingIds, index);
    items.push({
      id: uniqueId,
      text: cleanText,
      index: index + 1
    });
    index++;

    // Check if an id attribute already exists
    let updatedAttrs = rawAttrs;
    if (/\bid\s*=\s*["'][^"']*["']/i.test(updatedAttrs)) {
      updatedAttrs = updatedAttrs.replace(/\bid\s*=\s*["'][^"']*["']/i, `id="${uniqueId}"`);
    } else {
      updatedAttrs = ` id="${uniqueId}"${updatedAttrs}`;
    }

    // Ensure scroll margin top class (scroll-mt-24 sm:scroll-mt-28) to avoid sticky header overlap
    if (/\bclass\s*=\s*["']([^"']*)["']/i.test(updatedAttrs)) {
      updatedAttrs = updatedAttrs.replace(/\bclass\s*=\s*["']([^"']*)["']/i, (_match: string, cls: string) => {
        let classes = cls;
        if (!classes.includes('scroll-mt-')) {
          classes = `${classes} scroll-mt-24 sm:scroll-mt-28`;
        }
        return `class="${classes}"`;
      });
    } else {
      updatedAttrs = ` class="scroll-mt-24 sm:scroll-mt-28"${updatedAttrs}`;
    }

    return `<h1${updatedAttrs}>${innerHtml}</h1>`;
  });

  return { processedHtml, items };
}
