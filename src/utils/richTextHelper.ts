export type TextAlignOption = 'left' | 'center' | 'right' | 'justify';
export type BlockFormatOption = 'p' | 'h1' | 'h2' | 'h3' | 'blockquote';

/**
 * Escapes HTML special characters to prevent raw HTML injection.
 */
export function escapeHtml(text: string): string {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Validates and normalizes a URL for hyperlinks.
 * Blocks dangerous schemes like javascript:, vbscript:, data:text/html, file:, etc.
 * Automatically prefixes https:// if user enters www.example.com or domain.com/path.
 */
export function normalizeHyperlinkUrl(rawInput: string): string | null {
  if (!rawInput || typeof rawInput !== 'string') return null;
  const trimmed = rawInput.trim();
  if (!trimmed) return null;

  // Strip control characters and whitespace inside scheme check
  const compact = trimmed.replace(/[\u0000-\u001F\u007F\s]+/g, '').toLowerCase();
  if (
    compact.startsWith('javascript:') ||
    compact.startsWith('vbscript:') ||
    compact.startsWith('data:') ||
    compact.startsWith('file:') ||
    compact.startsWith('blob:')
  ) {
    return null;
  }

  // Allow relative paths or anchor hashes
  if (trimmed.startsWith('/') || trimmed.startsWith('#')) {
    if (trimmed.startsWith('//')) return null; // Block protocol-relative open redirects
    return trimmed;
  }

  // Allow mailto: and tel:
  if (/^(mailto|tel):/i.test(trimmed)) {
    return trimmed;
  }

  let candidate = trimmed;
  if (!/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(candidate)) {
    // Check if it looks like a valid domain or www address
    if (/^(?:www\.)?[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*\.[a-zA-Z]{2,}(?:[/?#].*)?$/i.test(candidate)) {
      candidate = `https://${candidate}`;
    } else {
      return null;
    }
  }

  try {
    const parsed = new URL(candidate);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return null;
    }
    if (!parsed.hostname || !parsed.hostname.includes('.')) {
      // Allow localhost for local testing
      if (parsed.hostname !== 'localhost' && parsed.hostname !== '127.0.0.1') {
        return null;
      }
    }
    // Avoid adding a trailing slash to bare origin URLs if the input didn't have one
    if (
      parsed.pathname === '/' &&
      !parsed.search &&
      !parsed.hash &&
      !candidate.endsWith('/')
    ) {
      return `${parsed.protocol}//${parsed.host}`;
    }
    return parsed.href;
  } catch {
    return null;
  }
}

/**
 * Checks whether a URL is safe for use as an href in content.
 */
export function isValidSafeUrl(rawInput: string): boolean {
  return normalizeHyperlinkUrl(rawInput) !== null;
}

/**
 * Validates whether an image src URL is safe (allows https://, http://, relative /..., and safe data:image/...).
 */
export function isValidSafeImageSrc(rawSrc: string): boolean {
  if (!rawSrc || typeof rawSrc !== 'string') return false;
  const trimmed = rawSrc.trim();
  if (!trimmed) return false;

  const compact = trimmed.replace(/[\u0000-\u001F\u007F\s]+/g, '').toLowerCase();
  if (compact.startsWith('javascript:') || compact.startsWith('vbscript:')) {
    return false;
  }

  if (/^data:image\/(jpeg|jpg|png|webp|gif);base64,[a-zA-Z0-9+/=\s]+$/i.test(trimmed)) {
    return true;
  }

  if (trimmed.startsWith('/') && !trimmed.startsWith('//')) {
    return true;
  }

  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Detects standalone URLs or URLs embedded inside plain text and converts them into clickable <a> tags,
 * while safely escaping all non-URL text.
 */
const URL_TOKEN_REGEX = /((?:https?:\/\/|mailto:|www\.)[^\s<>"'`]+)/gi;

export function linkifyPlainTextSegment(line: string): string {
  if (!line) return '';
  let result = '';
  let lastIndex = 0;

  const regex = new RegExp(URL_TOKEN_REGEX.source, 'gi');
  let match: RegExpExecArray | null;

  while ((match = regex.exec(line)) !== null) {
    const matchStart = match.index;
    let rawUrl = match[0];

    // Strip trailing punctuation that is likely part of the surrounding sentence (.,;:!?)
    let trailingPunct = '';
    const trailingMatch = rawUrl.match(/[.,;:!?)]+$/);
    if (trailingMatch) {
      // Only keep closing parenthesis if rawUrl has an opening parenthesis
      const candidatePunct = trailingMatch[0];
      if (!candidatePunct.includes(')') || !rawUrl.includes('(')) {
        trailingPunct = candidatePunct;
        rawUrl = rawUrl.slice(0, rawUrl.length - trailingPunct.length);
      }
    }

    result += escapeHtml(line.slice(lastIndex, matchStart));

    const safeHref = normalizeHyperlinkUrl(rawUrl);
    if (safeHref) {
      result += `<a href="${escapeHtml(safeHref)}" target="_blank" rel="noopener noreferrer" class="text-emerald-700 dark:text-emerald-400 underline font-medium hover:text-emerald-600">${escapeHtml(rawUrl)}</a>`;
    } else {
      result += escapeHtml(rawUrl);
    }

    if (trailingPunct) {
      result += escapeHtml(trailingPunct);
    }

    lastIndex = matchStart + match[0].length;
  }

  result += escapeHtml(line.slice(lastIndex));
  return result;
}

/**
 * Converts pasted plain text into HTML paragraphs with automatic hyperlink recognition.
 * If the entire pasted text is a single URL and `selectedText` is provided, wraps `selectedText` in an `<a>` tag.
 */
export function convertPastedPlainTextToHtml(pastedText: string, selectedText = ''): string {
  if (!pastedText) return '';
  const trimmed = pastedText.trim();

  // Check if the entire pasted text is a single valid URL (no whitespace/newlines)
  if (!/\s/.test(trimmed)) {
    const singleUrl = normalizeHyperlinkUrl(trimmed);
    if (singleUrl) {
      const label = selectedText && selectedText.trim() ? selectedText.trim() : trimmed;
      return `<a href="${escapeHtml(singleUrl)}" target="_blank" rel="noopener noreferrer" class="text-emerald-700 dark:text-emerald-400 underline font-medium hover:text-emerald-600">${escapeHtml(label)}</a>`;
    }
  }

  const lines = pastedText.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  if (lines.length === 0) return '';
  if (lines.length === 1) {
    return linkifyPlainTextSegment(lines[0]);
  }
  return lines.map(line => `<p>${linkifyPlainTextSegment(line)}</p>`).join('');
}

/**
 * Converts any Heading (h1-h6) or Blockquote HTML block back into a normal paragraph (<p>),
 * preserving inner formatting and safe alignment style.
 */
export function convertBlocksToNormalParagraphHtml(html: string): string {
  if (!html) return '';
  return html
    .replace(/<(h[1-6]|blockquote)(\s[^>]*)?>([\s\S]*?)<\/\1>/gi, (_full, _tag, attrs = '', inner) => {
      // Preserve text-align style if present
      const alignMatch = String(attrs).match(/text-align\s*:\s*(left|center|right|justify)/i);
      const styleAttr = alignMatch ? ` style="text-align: ${alignMatch[1].toLowerCase()};"` : '';
      return `<p${styleAttr}>${inner}</p>`;
    });
}

/**
 * Applies text alignment ('left' | 'center' | 'right' | 'justify') to block elements in HTML
 * so alignment persists reliably across save, edit, preview, and public rendering.
 */
export function applyAlignmentToHtmlBlocks(html: string, align: TextAlignOption): string {
  if (!html) return `<p style="text-align: ${align};"></p>`;
  const validAlign: TextAlignOption = ['left', 'center', 'right', 'justify'].includes(align) ? align : 'left';

  const blockRegex = /<(p|h[1-6]|div|blockquote|li)(\s[^>]*)?>/gi;
  if (!blockRegex.test(html)) {
    return `<p style="text-align: ${validAlign};">${html}</p>`;
  }

  return html.replace(/<(p|h[1-6]|div|blockquote|li)(\s[^>]*)?>/gi, (_full, tag, rawAttrs = '') => {
    let attrs = String(rawAttrs);
    // Remove legacy align="..." attribute
    attrs = attrs.replace(/\s+align\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '');

    if (/style\s*=\s*"([^"]*)"/i.test(attrs)) {
      attrs = attrs.replace(/style\s*=\s*"([^"]*)"/i, (_m, styleContent) => {
        const cleanedStyle = String(styleContent)
          .replace(/text-align\s*:\s*[^;]+;?/gi, '')
          .trim();
        const prefix = cleanedStyle ? (cleanedStyle.endsWith(';') ? `${cleanedStyle} ` : `${cleanedStyle}; `) : '';
        return `style="${prefix}text-align: ${validAlign};"`;
      });
    } else {
      attrs += ` style="text-align: ${validAlign};"`;
    }
    return `<${tag}${attrs}>`;
  });
}

/**
 * Sanitizes rich text HTML for safe storage and public rendering.
 * Works identically in both browser (DOMParser) and Node.js test environments.
 * - Strips <script>, <iframe>, <object>, <embed>, <form>, <input>, <button>, <style>, <link>, <meta>, <svg>, <math>
 * - Strips all inline event handlers (onerror, onload, onclick, onmouseover, etc.)
 * - Validates and normalizes <a href="..."> and adds target="_blank" rel="noopener noreferrer"
 * - Validates <img src="..."> and blocks javascript:/data:text/html
 * - Preserves text-align: left|center|right|justify, headings (h1-h4), paragraphs (p), lists (ul, ol, li),
 *   blockquotes, tables, figures, Arabic RTL blocks, and formatting tags.
 */
export function sanitizeRichTextHtml(rawHtml: string): string {
  if (!rawHtml || typeof rawHtml !== 'string') return '';

  let cleaned = rawHtml;

  // 1. Remove HTML comments
  cleaned = cleaned.replace(/<!--[\s\S]*?-->/g, '');

  // 2. Remove dangerous paired tags and their contents completely
  const dangerousPairedTags = ['script', 'iframe', 'object', 'embed', 'style', 'applet', 'frameset', 'frame', 'svg', 'math'];
  for (const tag of dangerousPairedTags) {
    const pairedRegex = new RegExp(`<${tag}\\b[^>]*>[\\s\\S]*?<\\/${tag}>`, 'gi');
    cleaned = cleaned.replace(pairedRegex, '');
    const selfClosingRegex = new RegExp(`<${tag}\\b[^>]*\\/?>`, 'gi');
    cleaned = cleaned.replace(selfClosingRegex, '');
  }

  // 3. Remove form/input/meta/link/base tags
  cleaned = cleaned.replace(/<\/?(?:form|input|button|select|textarea|meta|link|base|xml)\b[^>]*>/gi, '');

  // 4. Strip inline event handler attributes (on*="...", on*='...', on*=...)
  cleaned = cleaned.replace(/\s+on[a-zA-Z0-9_-]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '');

  // 5. Normalize legacy align="justify|left|center|right" attributes into style="text-align: ..."
  cleaned = cleaned.replace(
    /<(p|h[1-6]|div|blockquote|li|td|th)\b([^>]*?)\s+align\s*=\s*["']?(left|center|right|justify)["']?([^>]*)>/gi,
    (_full, tag, before, alignVal, after) => {
      const combined = `${before}${after}`;
      const alignLower = String(alignVal).toLowerCase();
      if (/style\s*=\s*"/i.test(combined)) {
        const updated = combined.replace(/style\s*=\s*"([^"]*)"/i, (_m, s) => {
          if (/text-align\s*:/i.test(s)) return `style="${s}"`;
          const sep = s.trim() && !s.trim().endsWith(';') ? '; ' : ' ';
          return `style="${s.trim()}${sep}text-align: ${alignLower};"`;
        });
        return `<${tag}${updated}>`;
      }
      return `<${tag}${combined} style="text-align: ${alignLower};">`;
    }
  );

  // 6. Sanitize <a> tags: validate href, strip unsafe links, enforce target="_blank" rel="noopener noreferrer"
  cleaned = cleaned.replace(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi, (_full, rawAttrs, innerHtml) => {
    const hrefMatch = String(rawAttrs).match(/href\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i);
    const rawHref = hrefMatch ? (hrefMatch[1] ?? hrefMatch[2] ?? hrefMatch[3] ?? '') : '';
    const decodedHref = rawHref
      .replace(/&amp;/g, '&')
      .replace(/&#x([0-9a-f]+);?/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
      .replace(/&#(\d+);?/g, (_, dec) => String.fromCharCode(parseInt(dec, 10)));

    const safeHref = normalizeHyperlinkUrl(decodedHref);
    if (!safeHref) {
      // Unwrap unsafe <a> tag but keep inner text
      return innerHtml;
    }

    return `<a href="${escapeHtml(safeHref)}" target="_blank" rel="noopener noreferrer" class="text-emerald-700 dark:text-emerald-400 underline font-medium hover:text-emerald-600">${innerHtml}</a>`;
  });

  // 7. Sanitize <img> tags: validate src, preserve alt/class/style
  cleaned = cleaned.replace(/<img\b([^>]*)\/?>/gi, (_full, rawAttrs) => {
    const srcMatch = String(rawAttrs).match(/src\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i);
    const rawSrc = srcMatch ? (srcMatch[1] ?? srcMatch[2] ?? srcMatch[3] ?? '') : '';
    const decodedSrc = rawSrc.replace(/&amp;/g, '&');

    if (!isValidSafeImageSrc(decodedSrc)) {
      return '';
    }

    const altMatch = String(rawAttrs).match(/alt\s*=\s*(?:"([^"]*)"|'([^']*)')/i);
    const altText = altMatch ? (altMatch[1] ?? altMatch[2] ?? '') : 'Gambar';

    const classMatch = String(rawAttrs).match(/class\s*=\s*(?:"([^"]*)"|'([^']*)')/i);
    const classVal = classMatch
      ? (classMatch[1] ?? classMatch[2] ?? '')
      : 'w-full h-auto rounded-2xl border border-stone-200 dark:border-stone-800 shadow-xs';

    return `<img src="${escapeHtml(decodedSrc)}" alt="${escapeHtml(altText)}" class="${escapeHtml(classVal)}" loading="lazy" />`;
  });

  // 8. Sanitize inline style="..." attributes to block expression(), javascript:, or url(javascript:...)
  cleaned = cleaned.replace(/style\s*=\s*(?:"([^"]*)"|'([^']*)')/gi, (_full, s1, s2) => {
    const rawStyle = String(s1 ?? s2 ?? '');
    if (/expression\s*\(|javascript\s*:|vbscript\s*:|behavior\s*:/i.test(rawStyle)) {
      return '';
    }
    return `style="${rawStyle.replace(/"/g, "'")}"`;
  });

  return cleaned.trim();
}
