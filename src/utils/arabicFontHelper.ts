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

    // 1b. Wrap any table elements inside responsive horizontal scroll containers so they never break mobile viewport
    const tables = doc.body.querySelectorAll('table');
    tables.forEach((table) => {
      const parent = table.parentElement;
      if (!parent || !parent.classList.contains('table-responsive-wrapper')) {
        const wrapper = doc.createElement('div');
        wrapper.className = 'table-responsive-wrapper';
        parent?.insertBefore(wrapper, table);
        wrapper.appendChild(table);
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

/**
 * Converts Markdown or raw formatted text into clean semantic HTML structure,
 * and passes it through autoWrapArabicText for safe bilingual presentation.
 */
export function renderFormattedContentHtml(rawContent: string): string {
  if (!rawContent || typeof rawContent !== 'string') return '';
  const trimmed = rawContent.trim();
  if (!trimmed) return '';

  // If already rich HTML
  let html = trimmed;
  if (!/<(p|h[1-6]|ul|ol|li|blockquote|table|div|article|section)\b[^>]*>/i.test(trimmed)) {
    html = formatMarkdownToHtml(trimmed);
  }

  return autoWrapArabicText(html);
}

/**
 * Converts Markdown text (headings, bold, italic, lists, quotes, links) to semantic HTML
 */
export function formatMarkdownToHtml(markdown: string): string {
  if (!markdown || typeof markdown !== 'string') return '';
  const lines = markdown.split(/\r?\n/);
  const blocks: string[] = [];
  let inList: 'ul' | 'ol' | null = null;
  let blockquoteLines: string[] = [];

  const closeList = () => {
    if (inList) {
      blocks.push(`</${inList}>`);
      inList = null;
    }
  };

  const closeBlockquote = () => {
    if (blockquoteLines.length > 0) {
      const quoteText = blockquoteLines.join('<br />');
      blocks.push(
        `<blockquote class="border-l-4 border-[#073B2E] dark:border-[#C9A34E] pl-4 py-2.5 my-4 bg-[#073B2E]/5 dark:bg-[#0c2b23] rounded-r-2xl italic text-stone-800 dark:text-stone-200">${quoteText}</blockquote>`
      );
      blockquoteLines = [];
    }
  };

  const processInline = (str: string): string => {
    let out = str;
    // Bold **text**
    out = out.replace(/(\*\*|__)(.*?)\1/g, '<strong class="font-bold text-stone-900 dark:text-white">$2</strong>');
    // Italic *text*
    out = out.replace(/(\*|_)(.*?)\1/g, '<em>$2</em>');
    // Links [label](url)
    out = out.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-emerald-700 dark:text-emerald-400 font-semibold underline hover:text-emerald-800">$1</a>');
    return out;
  };

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const line = rawLine.trim();

    if (!line) {
      closeList();
      closeBlockquote();
      continue;
    }

    // Heading H3
    if (/^###\s+(.*)/.test(line)) {
      closeList();
      closeBlockquote();
      const content = processInline(line.replace(/^###\s+/, ''));
      blocks.push(`<h3 class="text-lg sm:text-xl font-bold font-serif-brand text-stone-900 dark:text-white mt-6 mb-2.5 leading-snug">${content}</h3>`);
      continue;
    }

    // Heading H2
    if (/^##\s+(.*)/.test(line)) {
      closeList();
      closeBlockquote();
      const content = processInline(line.replace(/^##\s+/, ''));
      blocks.push(`<h2 class="text-xl sm:text-2xl font-bold font-serif-brand text-stone-900 dark:text-white mt-7 mb-3 leading-snug">${content}</h2>`);
      continue;
    }

    // Heading H1
    if (/^#\s+(.*)/.test(line)) {
      closeList();
      closeBlockquote();
      const content = processInline(line.replace(/^#\s+/, ''));
      blocks.push(`<h1 class="text-2xl sm:text-3xl font-bold font-serif-brand text-stone-900 dark:text-white mt-8 mb-4 leading-tight">${content}</h1>`);
      continue;
    }

    // Blockquote
    if (/^>\s*(.*)/.test(line)) {
      closeList();
      blockquoteLines.push(processInline(line.replace(/^>\s*/, '')));
      continue;
    } else {
      closeBlockquote();
    }

    // Unordered List
    if (/^[\-\*]\s+(.*)/.test(line)) {
      closeBlockquote();
      if (inList !== 'ul') {
        closeList();
        blocks.push('<ul class="list-disc list-inside space-y-1.5 my-3 text-stone-800 dark:text-stone-200 pl-2">');
        inList = 'ul';
      }
      const itemContent = processInline(line.replace(/^[\-\*]\s+/, ''));
      blocks.push(`<li>${itemContent}</li>`);
      continue;
    }

    // Ordered List
    if (/^\d+\.\s+(.*)/.test(line)) {
      closeBlockquote();
      if (inList !== 'ol') {
        closeList();
        blocks.push('<ol class="list-decimal list-inside space-y-1.5 my-3 text-stone-800 dark:text-stone-200 pl-2">');
        inList = 'ol';
      }
      const itemContent = processInline(line.replace(/^\d+\.\s+/, ''));
      blocks.push(`<li>${itemContent}</li>`);
      continue;
    }

    // Regular Paragraph
    closeList();
    closeBlockquote();
    const paragraphContent = processInline(line);
    blocks.push(`<p class="leading-relaxed text-stone-800 dark:text-stone-200 text-sm sm:text-base font-sans">${paragraphContent}</p>`);
  }

  closeList();
  closeBlockquote();

  return blocks.join('\n');
}

