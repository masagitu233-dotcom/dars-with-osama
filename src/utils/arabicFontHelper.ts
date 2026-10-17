// Arabic Unicode ranges covering basic Arabic, supplement, extended, and presentation forms
const ARABIC_CHAR_PATTERN = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;

// Regex to capture contiguous runs of Arabic words and inner spaces
const ARABIC_SPLIT_REGEX = /([\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]+(?:[\s\u00A0]+[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]+)*)/g;

/**
 * Checks whether a text string is purely Arabic (contains Arabic characters and no Latin/Indonesian letters)
 */
export function isPureArabicText(str: string): boolean {
  if (!str) return false;
  // If string contains any Latin letter [a-zA-Z], it is not purely Arabic
  if (/[a-zA-Z]/.test(str)) return false;
  // Must contain at least one Arabic character
  return ARABIC_CHAR_PATTERN.test(str);
}

/**
 * Processes HTML content for safe bilingual Indonesian & Arabic presentation:
 * - Standalone Arabic blocks (verses, quotes, du'a lines) get dir="rtl" and Amiri font.
 * - Predominantly Indonesian paragraphs, headings, list items, and table cells retain dir="ltr".
 * - Arabic snippets embedded in Indonesian sentences are isolated with <span class="font-amiri inline-arabic" dir="rtl" lang="ar">
 *   using HTML/CSS bidirectional isolation (unicode-bidi: isolate) so Indonesian text stays in original left-to-right order.
 * - Does not alter existing formatting, links, lists, or tables.
 */
export function autoWrapArabicText(html: string): string {
  if (!html || typeof html !== 'string') return '';
  if (typeof window === 'undefined' || typeof DOMParser === 'undefined') {
    return html;
  }

  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    // 1. Process block elements (paragraphs, headings, blockquotes, list items, table cells, divs)
    const blockElements = doc.body.querySelectorAll('p, blockquote, h1, h2, h3, h4, h5, h6, li, td, th');

    blockElements.forEach((el) => {
      // Skip preformatted or code blocks
      if (['PRE', 'CODE', 'SCRIPT', 'STYLE'].includes(el.tagName)) return;

      const text = el.textContent || '';

      // Case A: Standalone pure Arabic line/block (e.g. Arabic hadith or ayat block without Indonesian text)
      if (isPureArabicText(text)) {
        el.setAttribute('dir', 'rtl');
        el.setAttribute('lang', 'ar');
        if (!el.classList.contains('font-amiri')) {
          el.classList.add('font-amiri');
        }
        if (!el.classList.contains('text-right')) {
          el.classList.add('text-right');
        }
      } else {
        // Case B: Indonesian-dominant or mixed block
        // Explicitly set dir="ltr" if not already specified, preserving left-to-right paragraph flow
        if (!el.getAttribute('dir')) {
          el.setAttribute('dir', 'ltr');
        }
      }
    });

    // 2. Identify text nodes in mixed contexts that contain Arabic snippets
    const walker = doc.createTreeWalker(doc.body, NodeFilter.SHOW_TEXT);
    const textNodesToWrap: Text[] = [];

    let currentNode: Node | null = walker.nextNode();
    while (currentNode) {
      const textNode = currentNode as Text;
      const text = textNode.nodeValue || '';

      if (ARABIC_CHAR_PATTERN.test(text)) {
        const parent = textNode.parentElement;
        
        // Skip if parent is a pre/code or already an isolated Arabic span
        const isExcluded = parent?.closest('code, pre, .inline-arabic');
        
        if (!isExcluded) {
          // If the nearest block parent is a standalone pure Arabic block, its whole text is already RTL
          const closestBlock = parent?.closest('p, blockquote, h1, h2, h3, h4, h5, h6, li, td, th, div');
          const isBlockPureArabic = closestBlock && isPureArabicText(closestBlock.textContent || '');

          if (!isBlockPureArabic) {
            textNodesToWrap.push(textNode);
          }
        }
      }
      currentNode = walker.nextNode();
    }

    // 3. Wrap only the Arabic segments within mixed text nodes
    for (const textNode of textNodesToWrap) {
      const text = textNode.nodeValue || '';
      const parts = text.split(ARABIC_SPLIT_REGEX);

      if (parts.length <= 1) continue;

      const fragment = doc.createDocumentFragment();

      for (const part of parts) {
        if (!part) continue;

        if (ARABIC_CHAR_PATTERN.test(part)) {
          // Inline Arabic segment: wrap with isolated bidirectional span
          const span = doc.createElement('span');
          span.className = 'font-amiri inline-arabic';
          span.setAttribute('dir', 'rtl');
          span.setAttribute('lang', 'ar');
          span.textContent = part;
          fragment.appendChild(span);
        } else {
          // Surrounding Indonesian / Latin / punctuation / spaces
          fragment.appendChild(doc.createTextNode(part));
        }
      }

      textNode.parentNode?.replaceChild(fragment, textNode);
    }

    return doc.body.innerHTML;
  } catch (err) {
    console.warn('Error in autoWrapArabicText:', err);
    return html;
  }
}
