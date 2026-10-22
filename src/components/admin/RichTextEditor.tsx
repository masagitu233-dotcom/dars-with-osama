import React, { useRef, useEffect, useState } from 'react';
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Heading1,
  Heading2,
  Heading3,
  Pilcrow,
  List,
  ListOrdered,
  Quote,
  Link as LinkIcon,
  Unlink,
  ExternalLink,
  Image as ImageIcon,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  RotateCcw,
  X,
  Languages,
  Table as TableIcon,
  Trash2,
  Rows,
  Columns,
  Type,
  AlertCircle
} from 'lucide-react';
import { uploadFileToStorage } from '../../firebase/services';
import {
  sanitizeRichTextHtml,
  normalizeHyperlinkUrl,
  convertPastedPlainTextToHtml,
  escapeHtml,
  linkifyPlainTextSegment,
  TextAlignOption,
  BlockFormatOption
} from '../../utils/richTextHelper';

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeight?: string;
}

const FONT_OPTIONS = [
  { label: 'Plus Jakarta Sans (Default)', value: 'Plus Jakarta Sans' },
  { label: 'Amiri (Arab / Naskh)', value: 'Amiri' },
  { label: 'Tajawal (Arab Modern)', value: 'Tajawal' },
  { label: 'Scheherazade (Arab Tradisional)', value: 'Scheherazade New' },
  { label: 'Cairo (Arab Bold)', value: 'Cairo' },
  { label: 'Merriweather (Serif)', value: 'Merriweather' },
  { label: 'Georgia (Serif Klasik)', value: 'Georgia' },
  { label: 'Times New Roman (Serif Tradisional)', value: 'Times New Roman' },
  { label: 'Monospace (Kode)', value: 'monospace' },
  { label: 'Tahoma / Sans', value: 'Tahoma' }
];

function sanitizeAndLinkifyHtml(rawHtml: string): string {
  const sanitized = sanitizeRichTextHtml(rawHtml);
  if (typeof DOMParser === 'undefined') {
    return sanitized;
  }
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(sanitized, 'text/html');

    // Convert plain-text URLs inside non-anchor text nodes into clickable <a> tags
    const walker = doc.createTreeWalker(doc.body, NodeFilter.SHOW_TEXT);
    const textNodesToProcess: Text[] = [];
    let currentNode = walker.nextNode();
    while (currentNode) {
      const parentEl = currentNode.parentElement;
      if (
        parentEl &&
        !parentEl.closest('a, script, style, code, pre') &&
        /(?:https?:\/\/|mailto:|www\.)[^\s<>"'`]+/i.test(currentNode.nodeValue || '')
      ) {
        textNodesToProcess.push(currentNode as Text);
      }
      currentNode = walker.nextNode();
    }

    for (const textNode of textNodesToProcess) {
      const rawText = textNode.nodeValue || '';
      const linkedHtml = linkifyPlainTextSegment(rawText);
      if (linkedHtml !== escapeHtml(rawText)) {
        const temp = doc.createElement('span');
        temp.innerHTML = linkedHtml;
        const frag = doc.createDocumentFragment();
        while (temp.firstChild) {
          frag.appendChild(temp.firstChild);
        }
        textNode.parentNode?.replaceChild(frag, textNode);
      }
    }

    // Format tables pasted from Word / Excel
    doc.querySelectorAll('table').forEach(el => {
      el.className = 'w-full border-collapse border border-stone-300 dark:border-stone-700 text-xs sm:text-sm my-4';
    });
    doc.querySelectorAll('td, th').forEach(el => {
      el.classList.add('border', 'border-stone-300', 'dark:border-stone-700', 'p-2');
    });

    return sanitizeRichTextHtml(doc.body.innerHTML);
  } catch {
    return sanitized;
  }
}

export const RichTextEditor: React.FC<RichTextEditorProps> = ({
  value,
  onChange,
  placeholder = 'Tuliskan artikel atau materi pembelajaran di sini...',
  minHeight = '320px'
}) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const savedRangeRef = useRef<Range | null>(null);

  // Inline feedback banner (replaces window.alert)
  const [editorError, setEditorError] = useState<string | null>(null);

  // Modals state
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [linkText, setLinkText] = useState('');
  const [linkModalError, setLinkModalError] = useState<string | null>(null);

  const [showImageModal, setShowImageModal] = useState(false);
  const [imageUrl, setImageUrl] = useState('');
  const [imageCaption, setImageCaption] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const [showTableModal, setShowTableModal] = useState(false);
  const [tableRows, setTableRows] = useState(3);
  const [tableCols, setTableCols] = useState(3);
  const [tableHeader, setTableHeader] = useState(true);

  // Active States, Block Format, Alignment, Link & Table Selection
  const [activeStates, setActiveStates] = useState<Record<string, boolean>>({});
  const [activeBlock, setActiveBlock] = useState<BlockFormatOption>('p');
  const [activeAlign, setActiveAlign] = useState<TextAlignOption>('left');
  const [selectedFont, setSelectedFont] = useState<string>(FONT_OPTIONS[0].value);
  const [activeTableInfo, setActiveTableInfo] = useState<{ table: HTMLTableElement; cell: HTMLTableCellElement } | null>(null);
  const [activeLinkElement, setActiveLinkElement] = useState<HTMLAnchorElement | null>(null);

  // Save selection before opening modal or dropdown
  const saveSelection = () => {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0 && editorRef.current?.contains(sel.anchorNode)) {
      savedRangeRef.current = sel.getRangeAt(0).cloneRange();
    }
  };

  // Restore selection when applying modal result
  const restoreSelection = () => {
    if (savedRangeRef.current && editorRef.current) {
      editorRef.current.focus();
      const sel = window.getSelection();
      if (sel) {
        sel.removeAllRanges();
        sel.addRange(savedRangeRef.current);
      }
    }
  };

  // Synchronize external value to contentEditable div
  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== value) {
      if (document.activeElement !== editorRef.current) {
        editorRef.current.innerHTML = value || '';
      }
    }
  }, [value]);

  const getEnclosingBlockElement = (node: Node | null): HTMLElement | null => {
    if (!node || !editorRef.current) return null;
    const el = node.nodeType === Node.TEXT_NODE ? node.parentElement : (node as HTMLElement);
    if (!el || !editorRef.current.contains(el)) return null;
    const block = el.closest('p, h1, h2, h3, h4, h5, h6, blockquote, li, div') as HTMLElement | null;
    if (block && block !== editorRef.current && editorRef.current.contains(block)) {
      return block;
    }
    return null;
  };

  const updateActiveStates = () => {
    if (!editorRef.current) return;

    const sel = window.getSelection();
    const insideEditor = sel && sel.anchorNode && editorRef.current.contains(sel.anchorNode);
    if (!insideEditor) return;

    const blockEl = getEnclosingBlockElement(sel.anchorNode);

    // Detect active block tag (Normal paragraph vs H1/H2/H3/Blockquote)
    if (blockEl) {
      const tag = blockEl.tagName.toLowerCase();
      if (tag === 'h1') setActiveBlock('h1');
      else if (tag === 'h2') setActiveBlock('h2');
      else if (tag === 'h3') setActiveBlock('h3');
      else if (tag === 'blockquote') setActiveBlock('blockquote');
      else setActiveBlock('p');
    } else {
      setActiveBlock('p');
    }

    // Detect active text alignment (left, center, right, justify)
    let detectedAlign: TextAlignOption = 'left';
    if (blockEl) {
      const inlineAlign = (blockEl.style.textAlign || blockEl.getAttribute('align') || '').toLowerCase();
      if (inlineAlign === 'justify' || inlineAlign === 'center' || inlineAlign === 'right' || inlineAlign === 'left') {
        detectedAlign = inlineAlign as TextAlignOption;
      } else if (document.queryCommandState('justifyFull')) {
        detectedAlign = 'justify';
      } else if (document.queryCommandState('justifyCenter')) {
        detectedAlign = 'center';
      } else if (document.queryCommandState('justifyRight')) {
        detectedAlign = 'right';
      }
    } else {
      if (document.queryCommandState('justifyFull')) detectedAlign = 'justify';
      else if (document.queryCommandState('justifyCenter')) detectedAlign = 'center';
      else if (document.queryCommandState('justifyRight')) detectedAlign = 'right';
    }
    setActiveAlign(detectedAlign);

    setActiveStates({
      bold: document.queryCommandState('bold'),
      italic: document.queryCommandState('italic'),
      underline: document.queryCommandState('underline'),
      strikeThrough: document.queryCommandState('strikeThrough'),
      ul: document.queryCommandState('insertUnorderedList'),
      ol: document.queryCommandState('insertOrderedList')
    });

    // Detect if cursor is inside a link or table cell
    if (sel && sel.anchorNode) {
      const parent = sel.anchorNode.nodeType === 3 ? sel.anchorNode.parentElement : (sel.anchorNode as Element);
      if (parent && parent instanceof Element) {
        const link = parent.closest('a') as HTMLAnchorElement | null;
        if (link && editorRef.current.contains(link)) {
          setActiveLinkElement(link);
        } else {
          setActiveLinkElement(null);
        }

        const cell = parent.closest('td, th') as HTMLTableCellElement | null;
        const table = parent.closest('table') as HTMLTableElement | null;
        if (cell && table && editorRef.current.contains(table)) {
          setActiveTableInfo({ table, cell });
        } else {
          setActiveTableInfo(null);
        }
      } else {
        setActiveLinkElement(null);
        setActiveTableInfo(null);
      }
    }
  };

  useEffect(() => {
    const handleSelectionChange = () => {
      updateActiveStates();
    };
    document.addEventListener('selectionchange', handleSelectionChange);
    return () => document.removeEventListener('selectionchange', handleSelectionChange);
  }, []);

  const emitChange = () => {
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
    updateActiveStates();
  };

  const execCommand = (command: string, commandValue: string = '') => {
    if (editorRef.current) {
      editorRef.current.focus();
    }
    document.execCommand(command, false, commandValue);
    emitChange();
  };

  /**
   * Applies block formatting: Normal ('p'), Heading 1 ('h1'), Heading 2 ('h2'), Heading 3 ('h3'), or Quote ('blockquote').
   * Ensures that converting from Heading 1/2/3 back to Normal ('p') reliably replaces the heading tag with <p>.
   */
  const applyBlockFormat = (format: BlockFormatOption) => {
    if (!editorRef.current) return;
    editorRef.current.focus();

    const sel = window.getSelection();
    const currentBlock = sel && sel.anchorNode ? getEnclosingBlockElement(sel.anchorNode) : null;
    const preservedAlign = currentBlock?.style?.textAlign || '';

    // Execute standard formatBlock command
    document.execCommand('formatBlock', false, `<${format}>`);

    // Verify if the enclosing block was actually converted (especially when converting H1/H2/H3/blockquote back to <p>)
    const afterSel = window.getSelection();
    const afterBlock = afterSel && afterSel.anchorNode ? getEnclosingBlockElement(afterSel.anchorNode) : null;

    if (afterBlock && afterBlock.tagName.toLowerCase() !== format && afterBlock.tagName.toLowerCase() !== 'li') {
      const replacement = document.createElement(format);
      replacement.innerHTML = afterBlock.innerHTML;
      if (preservedAlign || afterBlock.style.textAlign) {
        replacement.style.textAlign = preservedAlign || afterBlock.style.textAlign;
      }
      afterBlock.replaceWith(replacement);

      // Place caret inside the new element
      if (afterSel) {
        const range = document.createRange();
        range.selectNodeContents(replacement);
        range.collapse(false);
        afterSel.removeAllRanges();
        afterSel.addRange(range);
      }
    } else if (afterBlock && preservedAlign) {
      afterBlock.style.textAlign = preservedAlign;
    }

    setActiveBlock(format);
    emitChange();
  };

  /**
   * Applies text alignment ('left' | 'center' | 'right' | 'justify') and persists inline style="text-align: ..."
   * on the target block element(s) so alignment survives save, re-edit, preview, and publication.
   */
  const applyAlignment = (align: TextAlignOption) => {
    if (!editorRef.current) return;
    editorRef.current.focus();

    const cmdMap: Record<TextAlignOption, string> = {
      left: 'justifyLeft',
      center: 'justifyCenter',
      right: 'justifyRight',
      justify: 'justifyFull'
    };

    document.execCommand(cmdMap[align], false, '');

    // Explicitly stamp style="text-align: <align>" on all affected block elements inside editorRef
    const sel = window.getSelection();
    let stamped = false;

    if (sel && sel.rangeCount > 0) {
      const range = sel.getRangeAt(0);
      const blocks = editorRef.current.querySelectorAll('p, h1, h2, h3, h4, h5, h6, blockquote, li, div');
      blocks.forEach((b) => {
        const blockEl = b as HTMLElement;
        if (range.intersectsNode(blockEl)) {
          blockEl.removeAttribute('align');
          blockEl.style.textAlign = align;
          stamped = true;
        }
      });

      if (!stamped) {
        const enclosing = getEnclosingBlockElement(sel.anchorNode);
        if (enclosing) {
          enclosing.removeAttribute('align');
          enclosing.style.textAlign = align;
          stamped = true;
        }
      }
    }

    // If editor only had bare text nodes with no block wrapper, wrap in <p style="text-align: ...">
    if (!stamped && editorRef.current) {
      const hasBlock = editorRef.current.querySelector('p, h1, h2, h3, h4, blockquote, ul, ol, div');
      if (!hasBlock) {
        const content = editorRef.current.innerHTML || '<br>';
        editorRef.current.innerHTML = `<p style="text-align: ${align};">${content}</p>`;
      }
    }

    setActiveAlign(align);
    emitChange();
  };

  const handleInput = () => {
    emitChange();
  };

  // Auto-linkify URL when user types a URL and presses Space or Enter
  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === ' ' || e.key === 'Enter') {
      const sel = window.getSelection();
      if (sel && sel.isCollapsed && sel.anchorNode && sel.anchorNode.nodeType === Node.TEXT_NODE) {
        const textNode = sel.anchorNode as Text;
        const parentEl = textNode.parentElement;
        if (parentEl && !parentEl.closest('a')) {
          const offset = sel.anchorOffset;
          const textBefore = (textNode.nodeValue || '').slice(0, offset);
          const match = textBefore.match(/((?:https?:\/\/|mailto:|www\.)[^\s<>"'`]+)$/i);
          if (match) {
            const rawUrl = match[1];
            const safeHref = normalizeHyperlinkUrl(rawUrl);
            if (safeHref) {
              const startOffset = offset - rawUrl.length;
              const range = document.createRange();
              range.setStart(textNode, startOffset);
              range.setEnd(textNode, offset);

              const anchor = document.createElement('a');
              anchor.href = safeHref;
              anchor.target = '_blank';
              anchor.rel = 'noopener noreferrer';
              anchor.className = 'text-emerald-700 dark:text-emerald-400 underline font-medium hover:text-emerald-600';
              anchor.textContent = rawUrl;

              range.deleteContents();
              range.insertNode(anchor);

              // Move caret after the newly created anchor
              const afterRange = document.createRange();
              afterRange.setStartAfter(anchor);
              afterRange.collapse(true);
              sel.removeAllRanges();
              sel.addRange(afterRange);
              emitChange();
            }
          }
        }
      }
    }
  };

  // Font family change handler
  const handleFontChange = (fontValue: string) => {
    setSelectedFont(fontValue);
    saveSelection();
    restoreSelection();
    execCommand('fontName', fontValue);
  };

  // Open Link Modal & pre-fill with current selection or active link
  const handleOpenLinkModal = () => {
    saveSelection();
    setLinkModalError(null);
    const sel = window.getSelection();
    const selectedStr = sel ? sel.toString().trim() : '';

    if (activeLinkElement) {
      setLinkUrl(activeLinkElement.getAttribute('href') || '');
      setLinkText(activeLinkElement.textContent || selectedStr || '');
    } else {
      setLinkUrl('');
      setLinkText(selectedStr);
    }
    setShowLinkModal(true);
  };

  // Insert or Update Link
  const handleInsertLink = () => {
    const safeHref = normalizeHyperlinkUrl(linkUrl);
    if (!safeHref) {
      setLinkModalError('Format URL tidak valid atau tidak diizinkan. Gunakan https://, http://, atau mailto:.');
      return;
    }

    restoreSelection();

    if (activeLinkElement && editorRef.current?.contains(activeLinkElement)) {
      activeLinkElement.href = safeHref;
      activeLinkElement.target = '_blank';
      activeLinkElement.rel = 'noopener noreferrer';
      activeLinkElement.className = 'text-emerald-700 dark:text-emerald-400 underline font-medium hover:text-emerald-600';
      if (linkText.trim()) {
        activeLinkElement.textContent = linkText.trim();
      }
      emitChange();
    } else {
      const sel = window.getSelection();
      const currentSelectedText = sel ? sel.toString().trim() : '';
      const label = linkText.trim() || currentSelectedText || safeHref;
      const anchorHtml = `<a href="${escapeHtml(safeHref)}" target="_blank" rel="noopener noreferrer" class="text-emerald-700 dark:text-emerald-400 underline font-medium hover:text-emerald-600">${escapeHtml(label)}</a>`;
      document.execCommand('insertHTML', false, anchorHtml);
      emitChange();
    }

    setLinkUrl('');
    setLinkText('');
    setLinkModalError(null);
    setShowLinkModal(false);
  };

  // Remove Link (Unlink)
  const handleUnlink = () => {
    if (activeLinkElement && editorRef.current?.contains(activeLinkElement)) {
      const textNode = document.createTextNode(activeLinkElement.textContent || '');
      activeLinkElement.replaceWith(textNode);
      setActiveLinkElement(null);
      emitChange();
    } else {
      execCommand('unlink');
    }
  };

  // Insert Image
  const handleInsertImage = () => {
    restoreSelection();
    if (imageUrl) {
      const safeCaption = escapeHtml(imageCaption || '');
      const imgHtml = `<figure class="my-6 max-w-full"><img src="${escapeHtml(imageUrl)}" alt="${safeCaption || 'Gambar Artikel'}" class="w-full h-auto rounded-2xl border border-stone-200 dark:border-stone-800 shadow-xs" />${safeCaption ? `<figcaption class="text-center text-xs text-stone-500 dark:text-stone-400 mt-2 font-medium">${safeCaption}</figcaption>` : ''}</figure><p><br></p>`;
      execCommand('insertHTML', imgHtml);
      setImageUrl('');
      setImageCaption('');
      setShowImageModal(false);
    }
  };

  // Handle image upload to Firebase Storage
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setEditorError('Harap pilih berkas gambar yang valid (JPG, PNG, WebP).');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setEditorError('Ukuran berkas gambar maksimal 5 MB.');
      return;
    }

    setEditorError(null);
    setUploadingImage(true);
    setUploadProgress(10);

    try {
      const downloadUrl = await uploadFileToStorage(file, 'blog_images', (pct) => {
        setUploadProgress(pct);
      });
      setImageUrl(downloadUrl);
    } catch (err: any) {
      setEditorError('Gagal mengunggah gambar: ' + (err.message || String(err)));
    } finally {
      setUploadingImage(false);
    }
  };

  // Table Insertion
  const handleInsertTable = () => {
    restoreSelection();
    const rowsCount = Math.max(1, Math.min(20, tableRows));
    const colsCount = Math.max(1, Math.min(10, tableCols));

    let headerHtml = '';
    if (tableHeader) {
      let ths = '';
      for (let c = 1; c <= colsCount; c++) {
        ths += `<th class="border border-stone-300 dark:border-stone-700 p-2 font-bold text-left bg-stone-100 dark:bg-stone-800">Judul Kolom ${c}</th>`;
      }
      headerHtml = `<thead><tr>${ths}</tr></thead>`;
    }

    let tbodyRows = '';
    for (let r = 1; r <= rowsCount; r++) {
      let tds = '';
      for (let c = 1; c <= colsCount; c++) {
        tds += `<td class="border border-stone-300 dark:border-stone-700 p-2">Baris ${r}, Kolom ${c}</td>`;
      }
      tbodyRows += `<tr>${tds}</tr>`;
    }

    const tableHtml = `<div class="overflow-x-auto my-4"><table class="w-full border-collapse border border-stone-300 dark:border-stone-700 text-xs sm:text-sm">${headerHtml}<tbody>${tbodyRows}</tbody></table></div><p><br></p>`;
    execCommand('insertHTML', tableHtml);
    setShowTableModal(false);
  };

  // Table Manipulation Controls
  const handleAddRow = (above = false) => {
    if (!activeTableInfo) return;
    const { cell } = activeTableInfo;
    const tr = cell.closest('tr');
    if (!tr) return;

    const colsCount = tr.children.length;
    const newTr = document.createElement('tr');
    for (let i = 0; i < colsCount; i++) {
      const td = document.createElement('td');
      td.className = 'border border-stone-300 dark:border-stone-700 p-2';
      td.innerHTML = 'Data Baru';
      newTr.appendChild(td);
    }

    if (above) {
      tr.parentNode?.insertBefore(newTr, tr);
    } else {
      tr.parentNode?.insertBefore(newTr, tr.nextSibling);
    }
    handleInput();
  };

  const handleAddColumn = (left = false) => {
    if (!activeTableInfo) return;
    const { table, cell } = activeTableInfo;
    const colIndex = Array.from(cell.parentNode?.children || []).indexOf(cell);
    if (colIndex < 0) return;

    const rows = Array.from(table.querySelectorAll('tr'));
    rows.forEach(tr => {
      const isHeader = tr.parentNode?.nodeName === 'THEAD' || tr.querySelector('th');
      const newCell = document.createElement(isHeader ? 'th' : 'td');
      newCell.className = 'border border-stone-300 dark:border-stone-700 p-2 font-bold';
      newCell.innerHTML = isHeader ? 'Kolom Baru' : 'Data Baru';

      const targetCell = tr.children[colIndex];
      if (targetCell) {
        if (left) {
          tr.insertBefore(newCell, targetCell);
        } else {
          tr.insertBefore(newCell, targetCell.nextSibling);
        }
      } else {
        tr.appendChild(newCell);
      }
    });
    handleInput();
  };

  const handleDeleteRow = () => {
    if (!activeTableInfo) return;
    const { cell } = activeTableInfo;
    const tr = cell.closest('tr');
    if (tr) {
      tr.remove();
      setActiveTableInfo(null);
      handleInput();
    }
  };

  const handleDeleteColumn = () => {
    if (!activeTableInfo) return;
    const { table, cell } = activeTableInfo;
    const colIndex = Array.from(cell.parentNode?.children || []).indexOf(cell);
    if (colIndex < 0) return;

    const rows = Array.from(table.querySelectorAll('tr'));
    rows.forEach(tr => {
      if (tr.children[colIndex]) {
        tr.children[colIndex].remove();
      }
    });
    setActiveTableInfo(null);
    handleInput();
  };

  const handleDeleteTable = () => {
    if (!activeTableInfo) return;
    const wrapper = activeTableInfo.table.closest('.overflow-x-auto') || activeTableInfo.table;
    wrapper.remove();
    setActiveTableInfo(null);
    handleInput();
  };

  // Insert Arabic Text Block
  const insertArabicBlock = () => {
    const arabicHtml = `<div class="my-4 p-4 bg-emerald-50 dark:bg-emerald-950/60 rounded-2xl border border-emerald-200 dark:border-emerald-800 text-right font-amiri text-xl text-emerald-800 dark:text-emerald-300 shadow-xs leading-relaxed" dir="rtl">نَصٌّ عَرَبِيٌّ مُشَكَّلٌ هُنَا...</div><p><br></p>`;
    execCommand('insertHTML', arabicHtml);
  };

  // Rich Text Copy Event Handler
  const handleCopy = (e: React.ClipboardEvent) => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0 || selection.isCollapsed) return;

    const container = document.createElement('div');
    for (let i = 0; i < selection.rangeCount; i++) {
      container.appendChild(selection.getRangeAt(i).cloneContents());
    }

    const htmlContent = container.innerHTML;
    const plainText = selection.toString();

    if (htmlContent) {
      e.clipboardData.setData('text/html', htmlContent);
      e.clipboardData.setData('text/plain', plainText);
      e.preventDefault();
    }
  };

  // Rich Text Paste Event Handler (Supports Auto-Hyperlink on Paste)
  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const rawHtml = e.clipboardData.getData('text/html');
    const text = e.clipboardData.getData('text/plain');
    const sel = window.getSelection();
    const selectedText = sel && !sel.isCollapsed ? sel.toString().trim() : '';

    // Case 1: Pasting a single standalone URL (especially when text is selected in editor)
    if (text && !/\s/.test(text.trim())) {
      const directUrl = normalizeHyperlinkUrl(text.trim());
      if (directUrl) {
        const htmlToInsert = convertPastedPlainTextToHtml(text.trim(), selectedText);
        document.execCommand('insertHTML', false, htmlToInsert);
        handleInput();
        return;
      }
    }

    // Case 2: Pasting rich HTML from external source
    if (rawHtml) {
      const cleanHtml = sanitizeAndLinkifyHtml(rawHtml);
      document.execCommand('insertHTML', false, cleanHtml);
    } else if (text) {
      // Case 3: Pasting plain text (automatically linkifies any URLs inside the text)
      const formatted = convertPastedPlainTextToHtml(text, selectedText);
      document.execCommand('insertHTML', false, formatted);
    }
    handleInput();
  };

  return (
    <div className="border border-stone-200 dark:border-stone-800 rounded-2xl overflow-hidden bg-white dark:bg-stone-900 transition-colors shadow-xs">
      {/* Inline Editor Error Banner */}
      {editorError && (
        <div className="px-3 py-2 bg-rose-50 dark:bg-rose-950/70 border-b border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200 text-xs flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
            <span>{editorError}</span>
          </div>
          <button
            type="button"
            onClick={() => setEditorError(null)}
            className="p-0.5 text-rose-500 hover:text-rose-700 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Editor Main Toolbar */}
      <div className="p-2 bg-stone-50 dark:bg-stone-800/80 border-b border-stone-200 dark:border-stone-800 flex flex-wrap items-center gap-1.5 text-stone-700 dark:text-stone-300">
        {/* Font Selection Dropdown */}
        <div className="flex items-center gap-1 pr-1 border-r border-stone-300 dark:border-stone-700">
          <Type className="w-3.5 h-3.5 text-stone-400 shrink-0 ml-1" />
          <select
            value={selectedFont}
            onChange={(e) => handleFontChange(e.target.value)}
            className="px-2 py-1 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-emerald-500 text-stone-900 dark:text-white cursor-pointer max-w-[140px] sm:max-w-[165px] truncate"
            title="Pilih Jenis Font Tulisan"
          >
            {FONT_OPTIONS.map(font => (
              <option key={font.value} value={font.value}>{font.label}</option>
            ))}
          </select>
        </div>

        {/* Paragraph (Normal) & Headings (H1, H2, H3) */}
        <button
          type="button"
          data-testid="rte-format-p"
          onClick={() => applyBlockFormat('p')}
          className={`px-2 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
            activeBlock === 'p'
              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
              : 'hover:bg-stone-200 dark:hover:bg-stone-700'
          }`}
          title="Paragraf Normal (Kembalikan ke Teks Biasa)"
        >
          <Pilcrow className="w-3.5 h-3.5" />
          <span>Normal</span>
        </button>
        <button
          type="button"
          data-testid="rte-format-h1"
          onClick={() => applyBlockFormat('h1')}
          className={`p-1.5 rounded-lg transition cursor-pointer ${
            activeBlock === 'h1'
              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-bold border border-emerald-300 dark:border-emerald-800'
              : 'hover:bg-stone-200 dark:hover:bg-stone-700'
          }`}
          title="Heading 1 (Judul Utama)"
        >
          <Heading1 className="w-4 h-4" />
        </button>
        <button
          type="button"
          data-testid="rte-format-h2"
          onClick={() => applyBlockFormat('h2')}
          className={`p-1.5 rounded-lg transition cursor-pointer ${
            activeBlock === 'h2'
              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-bold border border-emerald-300 dark:border-emerald-800'
              : 'hover:bg-stone-200 dark:hover:bg-stone-700'
          }`}
          title="Heading 2 (Subjudul)"
        >
          <Heading2 className="w-4 h-4" />
        </button>
        <button
          type="button"
          data-testid="rte-format-h3"
          onClick={() => applyBlockFormat('h3')}
          className={`p-1.5 rounded-lg transition cursor-pointer ${
            activeBlock === 'h3'
              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-bold border border-emerald-300 dark:border-emerald-800'
              : 'hover:bg-stone-200 dark:hover:bg-stone-700'
          }`}
          title="Heading 3 (Sub-subjudul)"
        >
          <Heading3 className="w-4 h-4" />
        </button>

        <div className="h-4 w-[1px] bg-stone-300 dark:bg-stone-700 mx-1" />

        {/* Inline formatting with active state highlighting */}
        <button
          type="button"
          data-testid="rte-bold"
          onClick={() => execCommand('bold')}
          className={`p-1.5 rounded-lg transition cursor-pointer ${activeStates.bold ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-bold' : 'hover:bg-stone-200 dark:hover:bg-stone-700'}`}
          title="Tebal (Bold)"
        >
          <Bold className="w-4 h-4" />
        </button>
        <button
          type="button"
          data-testid="rte-italic"
          onClick={() => execCommand('italic')}
          className={`p-1.5 rounded-lg transition cursor-pointer ${activeStates.italic ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-bold' : 'hover:bg-stone-200 dark:hover:bg-stone-700'}`}
          title="Miring (Italic)"
        >
          <Italic className="w-4 h-4" />
        </button>
        <button
          type="button"
          data-testid="rte-underline"
          onClick={() => execCommand('underline')}
          className={`p-1.5 rounded-lg transition cursor-pointer ${activeStates.underline ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-bold' : 'hover:bg-stone-200 dark:hover:bg-stone-700'}`}
          title="Garis Bawah (Underline)"
        >
          <Underline className="w-4 h-4" />
        </button>
        <button
          type="button"
          data-testid="rte-strikethrough"
          onClick={() => execCommand('strikeThrough')}
          className={`p-1.5 rounded-lg transition cursor-pointer ${activeStates.strikeThrough ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-bold' : 'hover:bg-stone-200 dark:hover:bg-stone-700'}`}
          title="Coretan (Strikethrough)"
        >
          <Strikethrough className="w-4 h-4" />
        </button>

        <div className="h-4 w-[1px] bg-stone-300 dark:bg-stone-700 mx-1" />

        {/* Alignment: Left, Center, Right, Justify */}
        <button
          type="button"
          data-testid="rte-align-left"
          onClick={() => applyAlignment('left')}
          className={`p-1.5 rounded-lg transition cursor-pointer ${activeAlign === 'left' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800' : 'hover:bg-stone-200 dark:hover:bg-stone-700'}`}
          title="Rata Kiri"
        >
          <AlignLeft className="w-4 h-4" />
        </button>
        <button
          type="button"
          data-testid="rte-align-center"
          onClick={() => applyAlignment('center')}
          className={`p-1.5 rounded-lg transition cursor-pointer ${activeAlign === 'center' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800' : 'hover:bg-stone-200 dark:hover:bg-stone-700'}`}
          title="Rata Tengah"
        >
          <AlignCenter className="w-4 h-4" />
        </button>
        <button
          type="button"
          data-testid="rte-align-right"
          onClick={() => applyAlignment('right')}
          className={`p-1.5 rounded-lg transition cursor-pointer ${activeAlign === 'right' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800' : 'hover:bg-stone-200 dark:hover:bg-stone-700'}`}
          title="Rata Kanan"
        >
          <AlignRight className="w-4 h-4" />
        </button>
        <button
          type="button"
          data-testid="rte-align-justify"
          onClick={() => applyAlignment('justify')}
          className={`p-1.5 rounded-lg transition cursor-pointer ${activeAlign === 'justify' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800' : 'hover:bg-stone-200 dark:hover:bg-stone-700'}`}
          title="Rata Kiri-Kanan (Justify)"
        >
          <AlignJustify className="w-4 h-4" />
        </button>

        <div className="h-4 w-[1px] bg-stone-300 dark:bg-stone-700 mx-1" />

        {/* Lists & Quotes */}
        <button
          type="button"
          data-testid="rte-ul"
          onClick={() => execCommand('insertUnorderedList')}
          className={`p-1.5 rounded-lg transition cursor-pointer ${activeStates.ul ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' : 'hover:bg-stone-200 dark:hover:bg-stone-700'}`}
          title="Daftar Poin (Bullet List)"
        >
          <List className="w-4 h-4" />
        </button>
        <button
          type="button"
          data-testid="rte-ol"
          onClick={() => execCommand('insertOrderedList')}
          className={`p-1.5 rounded-lg transition cursor-pointer ${activeStates.ol ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' : 'hover:bg-stone-200 dark:hover:bg-stone-700'}`}
          title="Daftar Angka (Numbered List)"
        >
          <ListOrdered className="w-4 h-4" />
        </button>
        <button
          type="button"
          data-testid="rte-blockquote"
          onClick={() => applyBlockFormat('blockquote')}
          className={`p-1.5 rounded-lg transition cursor-pointer ${
            activeBlock === 'blockquote'
              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
              : 'hover:bg-stone-200 dark:hover:bg-stone-700'
          }`}
          title="Kutipan (Blockquote)"
        >
          <Quote className="w-4 h-4" />
        </button>

        <div className="h-4 w-[1px] bg-stone-300 dark:bg-stone-700 mx-1" />

        {/* Table Creation */}
        <button
          type="button"
          onClick={() => { saveSelection(); setShowTableModal(true); }}
          className="p-1.5 hover:bg-emerald-100 dark:hover:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 rounded-lg transition flex items-center gap-1 font-semibold text-xs cursor-pointer"
          title="Buat Tabel Baru"
        >
          <TableIcon className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          <span className="hidden sm:inline">Tabel</span>
        </button>

        <div className="h-4 w-[1px] bg-stone-300 dark:bg-stone-700 mx-1" />

        {/* Media & Links */}
        <button
          type="button"
          data-testid="rte-insert-link"
          onClick={handleOpenLinkModal}
          className={`p-1.5 rounded-lg transition cursor-pointer ${
            activeLinkElement
              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
              : 'hover:bg-stone-200 dark:hover:bg-stone-700'
          }`}
          title="Sisipkan atau Edit Tautan (Hyperlink)"
        >
          <LinkIcon className="w-4 h-4" />
        </button>
        {activeLinkElement && (
          <button
            type="button"
            data-testid="rte-unlink"
            onClick={handleUnlink}
            className="p-1.5 hover:bg-rose-100 dark:hover:bg-rose-950/60 text-rose-600 rounded-lg transition cursor-pointer"
            title="Hapus Tautan (Unlink)"
          >
            <Unlink className="w-4 h-4" />
          </button>
        )}
        <button
          type="button"
          data-testid="rte-insert-image"
          onClick={() => { saveSelection(); setShowImageModal(true); }}
          className="p-1.5 hover:bg-stone-200 dark:hover:bg-stone-700 rounded-lg transition cursor-pointer"
          title="Sisipkan Gambar"
        >
          <ImageIcon className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
        </button>

        <div className="h-4 w-[1px] bg-stone-300 dark:bg-stone-700 mx-1" />

        {/* Arabic Text Block Helper */}
        <button
          type="button"
          onClick={insertArabicBlock}
          className="px-2 py-1 bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 rounded-lg text-xs font-bold hover:bg-emerald-200 transition flex items-center gap-1 cursor-pointer"
          title="Sisipkan Blok Teks Bahasa Arab (RTL)"
        >
          <Languages className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">+ Teks Arab</span>
        </button>

        <button
          type="button"
          data-testid="rte-reset-format"
          onClick={() => {
            execCommand('removeFormat');
            applyBlockFormat('p');
          }}
          className="p-1.5 hover:bg-rose-100 dark:hover:bg-rose-950/50 text-rose-600 rounded-lg transition ml-auto cursor-pointer"
          title="Hapus Format & Kembalikan ke Paragraf Normal"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>

      {/* Contextual Active Hyperlink Action Bar */}
      {activeLinkElement && (
        <div className="px-3 py-1.5 bg-emerald-50/90 dark:bg-emerald-950/70 border-b border-emerald-200 dark:border-emerald-800/80 flex flex-wrap items-center justify-between gap-2 text-xs text-emerald-900 dark:text-emerald-200 animate-fade-in">
          <div className="flex items-center gap-2 min-w-0">
            <LinkIcon className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span className="font-semibold shrink-0">Tautan Aktif:</span>
            <a
              href={activeLinkElement.getAttribute('href') || '#'}
              target="_blank"
              rel="noopener noreferrer"
              className="underline text-emerald-700 dark:text-emerald-300 truncate max-w-xs sm:max-w-md inline-flex items-center gap-1 font-medium"
            >
              <span className="truncate">{activeLinkElement.getAttribute('href')}</span>
              <ExternalLink className="w-3 h-3 shrink-0" />
            </a>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleOpenLinkModal}
              className="px-2 py-0.5 bg-white dark:bg-stone-800 border border-emerald-300 dark:border-emerald-700 rounded-md font-semibold hover:bg-emerald-100 transition cursor-pointer"
            >
              Edit URL
            </button>
            <button
              type="button"
              onClick={handleUnlink}
              className="px-2 py-0.5 bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-800 rounded-md font-semibold hover:bg-rose-200 transition cursor-pointer"
            >
              Hapus Tautan
            </button>
          </div>
        </div>
      )}

      {/* Contextual Table Controls Action Bar (shown when cursor is inside a table cell) */}
      {activeTableInfo && (
        <div className="px-3 py-2 bg-emerald-50 dark:bg-emerald-950/80 border-b border-emerald-200 dark:border-emerald-800/80 flex flex-wrap items-center gap-2 text-xs text-emerald-900 dark:text-emerald-200 animate-fade-in">
          <span className="font-bold flex items-center gap-1 mr-1">
            <TableIcon className="w-3.5 h-3.5 text-emerald-600" /> Pengeditan Tabel:
          </span>

          <button
            type="button"
            onClick={() => handleAddRow(true)}
            className="px-2 py-1 bg-white dark:bg-stone-800 border border-emerald-300 dark:border-emerald-700 rounded-lg font-semibold hover:bg-emerald-100 transition cursor-pointer flex items-center gap-1"
          >
            <Rows className="w-3 h-3 text-emerald-600" /> + Baris Atas
          </button>

          <button
            type="button"
            onClick={() => handleAddRow(false)}
            className="px-2 py-1 bg-white dark:bg-stone-800 border border-emerald-300 dark:border-emerald-700 rounded-lg font-semibold hover:bg-emerald-100 transition cursor-pointer flex items-center gap-1"
          >
            <Rows className="w-3 h-3 text-emerald-600" /> + Baris Bawah
          </button>

          <button
            type="button"
            onClick={() => handleAddColumn(true)}
            className="px-2 py-1 bg-white dark:bg-stone-800 border border-emerald-300 dark:border-emerald-700 rounded-lg font-semibold hover:bg-emerald-100 transition cursor-pointer flex items-center gap-1"
          >
            <Columns className="w-3 h-3 text-emerald-600" /> + Kolom Kiri
          </button>

          <button
            type="button"
            onClick={() => handleAddColumn(false)}
            className="px-2 py-1 bg-white dark:bg-stone-800 border border-emerald-300 dark:border-emerald-700 rounded-lg font-semibold hover:bg-emerald-100 transition cursor-pointer flex items-center gap-1"
          >
            <Columns className="w-3 h-3 text-emerald-600" /> + Kolom Kanan
          </button>

          <button
            type="button"
            onClick={handleDeleteRow}
            className="px-2 py-1 bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300 border border-rose-300 dark:border-rose-800 rounded-lg font-semibold hover:bg-rose-200 transition cursor-pointer"
          >
            Hapus Baris
          </button>

          <button
            type="button"
            onClick={handleDeleteColumn}
            className="px-2 py-1 bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300 border border-rose-300 dark:border-rose-800 rounded-lg font-semibold hover:bg-rose-200 transition cursor-pointer"
          >
            Hapus Kolom
          </button>

          <button
            type="button"
            onClick={handleDeleteTable}
            className="px-2 py-1 bg-rose-600 text-white rounded-lg font-bold hover:bg-rose-500 transition cursor-pointer ml-auto flex items-center gap-1"
          >
            <Trash2 className="w-3 h-3" /> Hapus Tabel
          </button>
        </div>
      )}

      {/* Content Editable Body */}
      <div
        ref={editorRef}
        contentEditable
        data-testid="rich-text-editor-body"
        onInput={handleInput}
        onKeyDown={handleKeyDown}
        onCopy={handleCopy}
        onPaste={handlePaste}
        style={{ minHeight }}
        className="p-4 focus:outline-hidden text-sm sm:text-base text-stone-900 dark:text-stone-100 leading-relaxed max-w-none prose dark:prose-invert rich-editor-content"
        data-placeholder={placeholder}
      />

      {/* Table Creation Modal */}
      {showTableModal && (
        <div className="fixed inset-0 z-70 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white dark:bg-stone-900 p-6 rounded-3xl border border-stone-200 dark:border-stone-800 w-full max-w-md space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-stone-200 dark:border-stone-800 pb-3">
              <h4 className="font-bold text-stone-900 dark:text-white text-base flex items-center gap-2">
                <TableIcon className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                <span>Buat Tabel Baru</span>
              </h4>
              <button type="button" onClick={() => setShowTableModal(false)} className="text-stone-400 hover:text-stone-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-stone-700 dark:text-stone-300 block mb-1">
                    Jumlah Baris
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={20}
                    value={tableRows}
                    onChange={(e) => setTableRows(Number(e.target.value) || 1)}
                    className="w-full px-3.5 py-2.5 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl text-xs font-semibold text-stone-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-stone-700 dark:text-stone-300 block mb-1">
                    Jumlah Kolom
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={tableCols}
                    onChange={(e) => setTableCols(Number(e.target.value) || 1)}
                    className="w-full px-3.5 py-2.5 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl text-xs font-semibold text-stone-900 dark:text-white"
                  />
                </div>
              </div>

              <label className="flex items-center gap-2 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={tableHeader}
                  onChange={(e) => setTableHeader(e.target.checked)}
                  className="w-4 h-4 accent-emerald-600 rounded"
                />
                <span className="text-xs font-semibold text-stone-700 dark:text-stone-300">
                  Gunakan Baris Judul Header (Thead)
                </span>
              </label>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-stone-200 dark:border-stone-800">
              <button
                type="button"
                onClick={() => setShowTableModal(false)}
                className="px-4 py-2 bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 rounded-xl text-xs font-semibold"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleInsertTable}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow"
              >
                Sisipkan Tabel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Link Modal */}
      {showLinkModal && (
        <div className="fixed inset-0 z-70 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white dark:bg-stone-900 p-6 rounded-3xl border border-stone-200 dark:border-stone-800 w-full max-w-md space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-stone-200 dark:border-stone-800 pb-3">
              <h4 className="font-bold text-stone-900 dark:text-white text-base flex items-center gap-2">
                <LinkIcon className="w-4 h-4 text-emerald-600" />
                <span>Sisipkan Tautan (Hyperlink)</span>
              </h4>
              <button type="button" onClick={() => setShowLinkModal(false)} className="text-stone-400 hover:text-stone-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {linkModalError && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{linkModalError}</span>
              </div>
            )}

            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-stone-700 dark:text-stone-300 block mb-1">
                  Teks Tautan (Opsional)
                </label>
                <input
                  type="text"
                  data-testid="rte-link-text-input"
                  value={linkText}
                  onChange={(e) => setLinkText(e.target.value)}
                  placeholder="Contoh: Kunjungi Referensi Kitab"
                  className="w-full px-3.5 py-2.5 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 text-stone-900 dark:text-white"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-stone-700 dark:text-stone-300 block mb-1">
                  Alamat URL Tautan *
                </label>
                <input
                  type="url"
                  data-testid="rte-link-url-input"
                  value={linkUrl}
                  onChange={(e) => {
                    setLinkUrl(e.target.value);
                    if (linkModalError) setLinkModalError(null);
                  }}
                  placeholder="https://darswithosama.com"
                  className="w-full px-3.5 py-2.5 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 text-stone-900 dark:text-white"
                />
                <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-1">
                  Tips: Anda juga dapat langsung menempelkan (paste) URL ke dalam editor untuk membuatnya menjadi hyperlink otomatis.
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-stone-200 dark:border-stone-800">
              <button
                type="button"
                onClick={() => setShowLinkModal(false)}
                className="px-4 py-2 bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 rounded-xl text-xs font-semibold cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                data-testid="rte-link-submit-btn"
                onClick={handleInsertLink}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold shadow cursor-pointer"
              >
                Terapkan Tautan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Image Modal */}
      {showImageModal && (
        <div className="fixed inset-0 z-70 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white dark:bg-stone-900 p-6 rounded-3xl border border-stone-200 dark:border-stone-800 w-full max-w-md space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-stone-200 dark:border-stone-800 pb-3">
              <h4 className="font-bold text-stone-900 dark:text-white text-base">Sisipkan Gambar dalam Konten</h4>
              <button type="button" onClick={() => setShowImageModal(false)} className="text-stone-400 hover:text-stone-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-stone-500 dark:text-stone-400 block mb-1">
                  Unggah dari Perangkat:
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="w-full text-xs text-stone-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-emerald-100 file:text-emerald-800 hover:file:bg-emerald-200 cursor-pointer"
                />
                {uploadingImage && (
                  <div className="mt-2 space-y-1">
                    <p className="text-[10px] text-emerald-600">Mengunggah gambar... {uploadProgress}%</p>
                    <div className="w-full h-1.5 bg-stone-200 dark:bg-stone-800 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-500 transition-all duration-300" style={{ width: `${uploadProgress}%` }} />
                    </div>
                  </div>
                )}
              </div>

              <div className="text-center text-xs text-stone-400 font-semibold uppercase">atau</div>

              <div>
                <label className="text-xs font-semibold text-stone-500 dark:text-stone-400 block mb-1">
                  URL Gambar Langsung:
                </label>
                <input
                  type="url"
                  data-testid="rte-image-url-input"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="https://images.unsplash.com/photo-..."
                  className="w-full px-3.5 py-2.5 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 text-stone-900 dark:text-white"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-stone-500 dark:text-stone-400 block mb-1">
                  Keterangan Gambar (Caption):
                </label>
                <input
                  type="text"
                  data-testid="rte-image-caption-input"
                  value={imageCaption}
                  onChange={(e) => setImageCaption(e.target.value)}
                  placeholder="Deskripsi singkat gambar..."
                  className="w-full px-3.5 py-2.5 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 text-stone-900 dark:text-white"
                />
              </div>

              {imageUrl && (
                <div className="aspect-video w-full rounded-xl bg-stone-100 dark:bg-stone-800 overflow-hidden border border-stone-200 dark:border-stone-700 relative">
                  <img src={imageUrl} alt="Preview" className="w-full h-full object-cover" />
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-stone-200 dark:border-stone-800">
              <button
                type="button"
                onClick={() => setShowImageModal(false)}
                className="px-4 py-2 bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 rounded-xl text-xs font-semibold cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                data-testid="rte-image-submit-btn"
                onClick={handleInsertImage}
                disabled={!imageUrl}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl text-xs font-semibold shadow cursor-pointer"
              >
                Sisipkan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
