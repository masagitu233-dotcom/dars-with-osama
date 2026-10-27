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

    doc.querySelectorAll('table').forEach(el => {
      el.className = 'w-full border-collapse border-2 border-[#171717] text-xs sm:text-sm my-4';
    });
    doc.querySelectorAll('td, th').forEach(el => {
      el.classList.add('border', 'border-[#171717]', 'p-2');
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

  const [editorError, setEditorError] = useState<string | null>(null);

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

  const [activeStates, setActiveStates] = useState<Record<string, boolean>>({});
  const [activeBlock, setActiveBlock] = useState<BlockFormatOption>('p');
  const [activeAlign, setActiveAlign] = useState<TextAlignOption>('left');
  const [selectedFont, setSelectedFont] = useState<string>(FONT_OPTIONS[0].value);
  const [activeTableInfo, setActiveTableInfo] = useState<{ table: HTMLTableElement; cell: HTMLTableCellElement } | null>(null);
  const [activeLinkElement, setActiveLinkElement] = useState<HTMLAnchorElement | null>(null);

  const saveSelection = () => {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0 && editorRef.current?.contains(sel.anchorNode)) {
      savedRangeRef.current = sel.getRangeAt(0).cloneRange();
    }
  };

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

  const applyBlockFormat = (format: BlockFormatOption) => {
    if (!editorRef.current) return;
    editorRef.current.focus();

    const sel = window.getSelection();
    const currentBlock = sel && sel.anchorNode ? getEnclosingBlockElement(sel.anchorNode) : null;
    const preservedAlign = currentBlock?.style?.textAlign || '';

    document.execCommand('formatBlock', false, `<${format}>`);

    const afterSel = window.getSelection();
    const afterBlock = afterSel && afterSel.anchorNode ? getEnclosingBlockElement(afterSel.anchorNode) : null;

    if (afterBlock && afterBlock.tagName.toLowerCase() !== format && afterBlock.tagName.toLowerCase() !== 'li') {
      const replacement = document.createElement(format);
      replacement.innerHTML = afterBlock.innerHTML;
      if (preservedAlign || afterBlock.style.textAlign) {
        replacement.style.textAlign = preservedAlign || afterBlock.style.textAlign;
      }
      afterBlock.replaceWith(replacement);

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
              anchor.className = 'text-[#06251D] dark:text-[#D9AC45] underline font-bold hover:opacity-80';
              anchor.textContent = rawUrl;

              range.deleteContents();
              range.insertNode(anchor);

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

  const handleFontChange = (fontValue: string) => {
    setSelectedFont(fontValue);
    saveSelection();
    restoreSelection();
    execCommand('fontName', fontValue);
  };

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
      activeLinkElement.className = 'text-[#06251D] dark:text-[#D9AC45] underline font-bold hover:opacity-80';
      if (linkText.trim()) {
        activeLinkElement.textContent = linkText.trim();
      }
      emitChange();
    } else {
      const sel = window.getSelection();
      const currentSelectedText = sel ? sel.toString().trim() : '';
      const label = linkText.trim() || currentSelectedText || safeHref;
      const anchorHtml = `<a href="${escapeHtml(safeHref)}" target="_blank" rel="noopener noreferrer" class="text-[#06251D] dark:text-[#D9AC45] underline font-bold hover:opacity-80">${escapeHtml(label)}</a>`;
      document.execCommand('insertHTML', false, anchorHtml);
      emitChange();
    }

    setLinkUrl('');
    setLinkText('');
    setLinkModalError(null);
    setShowLinkModal(false);
  };

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

  const handleInsertImage = () => {
    restoreSelection();
    if (imageUrl) {
      const safeCaption = escapeHtml(imageCaption || '');
      const imgHtml = `<figure class="my-6 max-w-full"><img src="${escapeHtml(imageUrl)}" alt="${safeCaption || 'Gambar Artikel'}" class="w-full h-auto rounded-lg border-2 border-[#171717]" />${safeCaption ? `<figcaption class="text-center text-xs text-[#171717]/70 dark:text-[#F8F3E8]/70 mt-2 font-bold">${safeCaption}</figcaption>` : ''}</figure><p><br></p>`;
      execCommand('insertHTML', imgHtml);
      setImageUrl('');
      setImageCaption('');
      setShowImageModal(false);
    }
  };

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

  const handleInsertTable = () => {
    restoreSelection();
    const rowsCount = Math.max(1, Math.min(20, tableRows));
    const colsCount = Math.max(1, Math.min(10, tableCols));

    let headerHtml = '';
    if (tableHeader) {
      let ths = '';
      for (let c = 1; c <= colsCount; c++) {
        ths += `<th class="border-2 border-[#171717] dark:border-[#B8E8D8] px-2.5 py-1.5 sm:px-3 sm:py-2 font-extrabold text-left bg-[#FAF7F0] dark:bg-[#214743] text-[#171717] dark:text-[#F0F7F5]">Judul Kolom ${c}</th>`;
      }
      headerHtml = `<thead><tr>${ths}</tr></thead>`;
    }

    let tbodyRows = '';
    for (let r = 1; r <= rowsCount; r++) {
      let tds = '';
      for (let c = 1; c <= colsCount; c++) {
        tds += `<td class="border-2 border-[#171717] dark:border-[#B8E8D8] px-2.5 py-1.5 sm:px-3 sm:py-2 text-[#171717] dark:text-[#F0F7F5]">Baris ${r}, Kolom ${c}</td>`;
      }
      tbodyRows += `<tr>${tds}</tr>`;
    }

    const tableHtml = `<div class="table-responsive-wrapper w-full overflow-x-auto my-4"><table class="w-full border-collapse border-2 border-[#171717] dark:border-[#B8E8D8] text-xs sm:text-sm">${headerHtml}<tbody>${tbodyRows}</tbody></table></div><p><br></p>`;
    execCommand('insertHTML', tableHtml);
    setShowTableModal(false);
  };

  const handleAddRow = (above = false) => {
    if (!activeTableInfo) return;
    const { cell } = activeTableInfo;
    const tr = cell.closest('tr');
    if (!tr) return;

    const colsCount = tr.children.length;
    const newTr = document.createElement('tr');
    for (let i = 0; i < colsCount; i++) {
      const td = document.createElement('td');
      td.className = 'border-2 border-[#171717] dark:border-[#B8E8D8] px-2.5 py-1.5 sm:px-3 sm:py-2';
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
      newCell.className = 'border-2 border-[#171717] dark:border-[#B8E8D8] px-2.5 py-1.5 sm:px-3 sm:py-2 font-bold';
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

  const insertArabicBlock = () => {
    const arabicHtml = `<div class="my-4 p-4 bg-[#FAF7F0] dark:bg-[#214743] rounded-md border-2 border-[#171717] dark:border-[#B8E8D8] text-right font-amiri text-xl text-[#171717] dark:text-[#F0F7F5] leading-relaxed" dir="rtl">نَصٌّ عَرَبِيٌّ مُشَكَّلٌ هُنَا...</div><p><br></p>`;
    execCommand('insertHTML', arabicHtml);
  };

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

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const rawHtml = e.clipboardData.getData('text/html');
    const text = e.clipboardData.getData('text/plain');
    const sel = window.getSelection();
    const selectedText = sel && !sel.isCollapsed ? sel.toString().trim() : '';

    if (text && !/\s/.test(text.trim())) {
      const directUrl = normalizeHyperlinkUrl(text.trim());
      if (directUrl) {
        const htmlToInsert = convertPastedPlainTextToHtml(text.trim(), selectedText);
        document.execCommand('insertHTML', false, htmlToInsert);
        handleInput();
        return;
      }
    }

    if (rawHtml) {
      const cleanHtml = sanitizeAndLinkifyHtml(rawHtml);
      document.execCommand('insertHTML', false, cleanHtml);
    } else if (text) {
      const formatted = convertPastedPlainTextToHtml(text, selectedText);
      document.execCommand('insertHTML', false, formatted);
    }
    handleInput();
  };

  const activeBtnClass = 'bg-[#F2D98A] text-[#102C2B] border-[#171717] dark:border-[#B8E8D8] font-extrabold';
  const inactiveBtnClass = 'bg-white dark:bg-[#193A37] text-[#171717] dark:text-[#F0F7F5] border-transparent hover:border-[#171717] dark:hover:border-[#B8E8D8]';

  return (
    <div className="border-2 border-[#171717] dark:border-[#B8E8D8] rounded-md overflow-hidden bg-white dark:bg-[#193A37] transition-colors shadow-[4px_4px_0px_#171717] dark:shadow-[4px_4px_0px_#071918]">
      {/* Inline Editor Error Banner */}
      {editorError && (
        <div className="px-3 py-2 bg-[#F04438] border-b-2 border-[#171717] text-white text-xs font-bold flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            <span>{editorError}</span>
          </div>
          <button
            type="button"
            onClick={() => setEditorError(null)}
            className="p-0.5 hover:bg-black/15 rounded cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Editor Main Toolbar */}
      <div className="p-2 bg-[#F8F3E8] dark:bg-[#06251D] border-b-2 border-[#171717] dark:border-[#D9AC45]/60 flex flex-wrap items-center gap-1.5 text-[#171717] dark:text-[#F8F3E8]">
        {/* Font Selection Dropdown */}
        <div className="flex items-center gap-1 pr-1.5 border-r-2 border-[#171717]/25 dark:border-[#D9AC45]/30">
          <Type className="w-3.5 h-3.5 text-[#06251D] dark:text-[#D9AC45] shrink-0 ml-1" />
          <select
            value={selectedFont}
            onChange={(e) => handleFontChange(e.target.value)}
            className="nb-input px-2 py-1 text-xs font-bold cursor-pointer max-w-[140px] sm:max-w-[165px] truncate"
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
          className={`px-2 py-1 rounded-sm border text-xs font-extrabold transition flex items-center gap-1 cursor-pointer ${
            activeBlock === 'p' ? activeBtnClass : inactiveBtnClass
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
          className={`p-1.5 rounded-sm border transition cursor-pointer ${
            activeBlock === 'h1' ? activeBtnClass : inactiveBtnClass
          }`}
          title="Heading 1 (Judul Utama)"
        >
          <Heading1 className="w-4 h-4" />
        </button>
        <button
          type="button"
          data-testid="rte-format-h2"
          onClick={() => applyBlockFormat('h2')}
          className={`p-1.5 rounded-sm border transition cursor-pointer ${
            activeBlock === 'h2' ? activeBtnClass : inactiveBtnClass
          }`}
          title="Heading 2 (Subjudul)"
        >
          <Heading2 className="w-4 h-4" />
        </button>
        <button
          type="button"
          data-testid="rte-format-h3"
          onClick={() => applyBlockFormat('h3')}
          className={`p-1.5 rounded-sm border transition cursor-pointer ${
            activeBlock === 'h3' ? activeBtnClass : inactiveBtnClass
          }`}
          title="Heading 3 (Sub-subjudul)"
        >
          <Heading3 className="w-4 h-4" />
        </button>

        <div className="h-4 w-[2px] bg-[#171717]/20 dark:bg-[#D9AC45]/30 mx-0.5" />

        {/* Inline formatting */}
        <button
          type="button"
          data-testid="rte-bold"
          onClick={() => execCommand('bold')}
          className={`p-1.5 rounded-sm border transition cursor-pointer ${activeStates.bold ? activeBtnClass : inactiveBtnClass}`}
          title="Tebal (Bold)"
        >
          <Bold className="w-4 h-4" />
        </button>
        <button
          type="button"
          data-testid="rte-italic"
          onClick={() => execCommand('italic')}
          className={`p-1.5 rounded-sm border transition cursor-pointer ${activeStates.italic ? activeBtnClass : inactiveBtnClass}`}
          title="Miring (Italic)"
        >
          <Italic className="w-4 h-4" />
        </button>
        <button
          type="button"
          data-testid="rte-underline"
          onClick={() => execCommand('underline')}
          className={`p-1.5 rounded-sm border transition cursor-pointer ${activeStates.underline ? activeBtnClass : inactiveBtnClass}`}
          title="Garis Bawah (Underline)"
        >
          <Underline className="w-4 h-4" />
        </button>
        <button
          type="button"
          data-testid="rte-strikethrough"
          onClick={() => execCommand('strikeThrough')}
          className={`p-1.5 rounded-sm border transition cursor-pointer ${activeStates.strikeThrough ? activeBtnClass : inactiveBtnClass}`}
          title="Coretan (Strikethrough)"
        >
          <Strikethrough className="w-4 h-4" />
        </button>

        <div className="h-4 w-[2px] bg-[#171717]/20 dark:bg-[#D9AC45]/30 mx-0.5" />

        {/* Alignment: Left, Center, Right, Justify */}
        <button
          type="button"
          data-testid="rte-align-left"
          onClick={() => applyAlignment('left')}
          className={`p-1.5 rounded-sm border transition cursor-pointer ${activeAlign === 'left' ? activeBtnClass : inactiveBtnClass}`}
          title="Rata Kiri"
        >
          <AlignLeft className="w-4 h-4" />
        </button>
        <button
          type="button"
          data-testid="rte-align-center"
          onClick={() => applyAlignment('center')}
          className={`p-1.5 rounded-sm border transition cursor-pointer ${activeAlign === 'center' ? activeBtnClass : inactiveBtnClass}`}
          title="Rata Tengah"
        >
          <AlignCenter className="w-4 h-4" />
        </button>
        <button
          type="button"
          data-testid="rte-align-right"
          onClick={() => applyAlignment('right')}
          className={`p-1.5 rounded-sm border transition cursor-pointer ${activeAlign === 'right' ? activeBtnClass : inactiveBtnClass}`}
          title="Rata Kanan"
        >
          <AlignRight className="w-4 h-4" />
        </button>
        <button
          type="button"
          data-testid="rte-align-justify"
          onClick={() => applyAlignment('justify')}
          className={`p-1.5 rounded-sm border transition cursor-pointer ${activeAlign === 'justify' ? activeBtnClass : inactiveBtnClass}`}
          title="Rata Kiri-Kanan (Justify)"
        >
          <AlignJustify className="w-4 h-4" />
        </button>

        <div className="h-4 w-[2px] bg-[#171717]/20 dark:bg-[#D9AC45]/30 mx-0.5" />

        {/* Lists & Quotes */}
        <button
          type="button"
          data-testid="rte-ul"
          onClick={() => execCommand('insertUnorderedList')}
          className={`p-1.5 rounded-sm border transition cursor-pointer ${activeStates.ul ? activeBtnClass : inactiveBtnClass}`}
          title="Daftar Poin (Bullet List)"
        >
          <List className="w-4 h-4" />
        </button>
        <button
          type="button"
          data-testid="rte-ol"
          onClick={() => execCommand('insertOrderedList')}
          className={`p-1.5 rounded-sm border transition cursor-pointer ${activeStates.ol ? activeBtnClass : inactiveBtnClass}`}
          title="Daftar Angka (Numbered List)"
        >
          <ListOrdered className="w-4 h-4" />
        </button>
        <button
          type="button"
          data-testid="rte-blockquote"
          onClick={() => applyBlockFormat('blockquote')}
          className={`p-1.5 rounded-sm border transition cursor-pointer ${
            activeBlock === 'blockquote' ? activeBtnClass : inactiveBtnClass
          }`}
          title="Kutipan (Blockquote)"
        >
          <Quote className="w-4 h-4" />
        </button>

        <div className="h-4 w-[2px] bg-[#171717]/20 dark:bg-[#D9AC45]/30 mx-0.5" />

        {/* Table Creation */}
        <button
          type="button"
          onClick={() => { saveSelection(); setShowTableModal(true); }}
          className={`px-2 py-1 rounded-sm border transition flex items-center gap-1 font-extrabold text-xs cursor-pointer ${inactiveBtnClass}`}
          title="Buat Tabel Baru"
        >
          <TableIcon className="w-4 h-4 text-[#06251D] dark:text-[#D9AC45]" />
          <span className="hidden sm:inline">Tabel</span>
        </button>

        <div className="h-4 w-[2px] bg-[#171717]/20 dark:bg-[#D9AC45]/30 mx-0.5" />

        {/* Media & Links */}
        <button
          type="button"
          data-testid="rte-insert-link"
          onClick={handleOpenLinkModal}
          className={`p-1.5 rounded-sm border transition cursor-pointer ${
            activeLinkElement ? activeBtnClass : inactiveBtnClass
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
            className="p-1.5 bg-[#F04438] text-white border border-[#171717] rounded-sm transition cursor-pointer"
            title="Hapus Tautan (Unlink)"
          >
            <Unlink className="w-4 h-4" />
          </button>
        )}
        <button
          type="button"
          data-testid="rte-insert-image"
          onClick={() => { saveSelection(); setShowImageModal(true); }}
          className={`p-1.5 rounded-sm border transition cursor-pointer ${inactiveBtnClass}`}
          title="Sisipkan Gambar"
        >
          <ImageIcon className="w-4 h-4 text-[#06251D] dark:text-[#D9AC45]" />
        </button>

        <div className="h-4 w-[2px] bg-[#171717]/20 dark:bg-[#D9AC45]/30 mx-0.5" />

        {/* Arabic Text Block Helper */}
        <button
          type="button"
          onClick={insertArabicBlock}
          className="px-2 py-1 bg-[#06251D] text-[#D9AC45] border border-[#171717] rounded-sm text-xs font-extrabold hover:bg-[#0B3026] transition flex items-center gap-1 cursor-pointer"
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
          className="p-1.5 bg-[#F04438] text-white border border-[#171717] rounded-sm transition ml-auto cursor-pointer"
          title="Hapus Format & Kembalikan ke Paragraf Normal"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>

      {/* Contextual Active Hyperlink Action Bar */}
      {activeLinkElement && (
        <div className="px-3 py-1.5 bg-[#F8F3E8] dark:bg-[#06251D] border-b-2 border-[#171717] flex flex-wrap items-center justify-between gap-2 text-xs text-[#171717] dark:text-[#F8F3E8]">
          <div className="flex items-center gap-2 min-w-0">
            <LinkIcon className="w-3.5 h-3.5 text-[#06251D] dark:text-[#D9AC45] shrink-0" />
            <span className="font-extrabold shrink-0">Tautan Aktif:</span>
            <a
              href={activeLinkElement.getAttribute('href') || '#'}
              target="_blank"
              rel="noopener noreferrer"
              className="underline text-[#06251D] dark:text-[#D9AC45] truncate max-w-xs sm:max-w-md inline-flex items-center gap-1 font-bold"
            >
              <span className="truncate">{activeLinkElement.getAttribute('href')}</span>
              <ExternalLink className="w-3 h-3 shrink-0" />
            </a>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleOpenLinkModal}
              className="nb-btn nb-btn-secondary px-2 py-0.5 text-xs"
            >
              Edit URL
            </button>
            <button
              type="button"
              onClick={handleUnlink}
              className="nb-btn nb-btn-danger px-2 py-0.5 text-xs"
            >
              Hapus Tautan
            </button>
          </div>
        </div>
      )}

      {/* Contextual Table Controls Action Bar */}
      {activeTableInfo && (
        <div className="px-3 py-2 bg-[#F8F3E8] dark:bg-[#06251D] border-b-2 border-[#171717] flex flex-wrap items-center gap-2 text-xs text-[#171717] dark:text-[#F8F3E8]">
          <span className="font-extrabold flex items-center gap-1 mr-1">
            <TableIcon className="w-3.5 h-3.5 text-[#06251D] dark:text-[#D9AC45]" /> Pengeditan Tabel:
          </span>

          <button
            type="button"
            onClick={() => handleAddRow(true)}
            className="nb-btn nb-btn-secondary px-2 py-1 text-xs"
          >
            <Rows className="w-3 h-3" /> + Baris Atas
          </button>

          <button
            type="button"
            onClick={() => handleAddRow(false)}
            className="nb-btn nb-btn-secondary px-2 py-1 text-xs"
          >
            <Rows className="w-3 h-3" /> + Baris Bawah
          </button>

          <button
            type="button"
            onClick={() => handleAddColumn(true)}
            className="nb-btn nb-btn-secondary px-2 py-1 text-xs"
          >
            <Columns className="w-3 h-3" /> + Kolom Kiri
          </button>

          <button
            type="button"
            onClick={() => handleAddColumn(false)}
            className="nb-btn nb-btn-secondary px-2 py-1 text-xs"
          >
            <Columns className="w-3 h-3" /> + Kolom Kanan
          </button>

          <button
            type="button"
            onClick={handleDeleteRow}
            className="nb-btn nb-btn-danger px-2 py-1 text-xs"
          >
            Hapus Baris
          </button>

          <button
            type="button"
            onClick={handleDeleteColumn}
            className="nb-btn nb-btn-danger px-2 py-1 text-xs"
          >
            Hapus Kolom
          </button>

          <button
            type="button"
            onClick={handleDeleteTable}
            className="nb-btn nb-btn-danger px-2 py-1 text-xs ml-auto"
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
        className="p-4 focus:outline-hidden text-sm sm:text-base text-[#171717] dark:text-[#F8F3E8] leading-relaxed max-w-none prose dark:prose-invert rich-editor-content"
        data-placeholder={placeholder}
      />

      {/* Table Creation Modal */}
      {showTableModal && (
        <div className="fixed inset-0 z-70 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="nb-card bg-white dark:bg-[#0B3026] p-6 w-full max-w-md space-y-5">
            <div className="flex items-center justify-between border-b-2 border-[#171717] pb-3">
              <h4 className="font-extrabold text-[#171717] dark:text-[#F8F3E8] text-base flex items-center gap-2">
                <TableIcon className="w-5 h-5 text-[#06251D] dark:text-[#D9AC45]" />
                <span>Buat Tabel Baru</span>
              </h4>
              <button type="button" onClick={() => setShowTableModal(false)} className="nb-btn nb-btn-secondary p-1">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-extrabold text-[#171717] dark:text-[#F8F3E8] block mb-1">
                    Jumlah Baris
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={20}
                    value={tableRows}
                    onChange={(e) => setTableRows(Number(e.target.value) || 1)}
                    className="nb-input w-full px-3.5 py-2.5 text-xs font-semibold"
                  />
                </div>

                <div>
                  <label className="text-xs font-extrabold text-[#171717] dark:text-[#F8F3E8] block mb-1">
                    Jumlah Kolom
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={tableCols}
                    onChange={(e) => setTableCols(Number(e.target.value) || 1)}
                    className="nb-input w-full px-3.5 py-2.5 text-xs font-semibold"
                  />
                </div>
              </div>

              <label className="flex items-center gap-2 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={tableHeader}
                  onChange={(e) => setTableHeader(e.target.checked)}
                  className="w-4 h-4 accent-[#06251D] rounded"
                />
                <span className="text-xs font-extrabold text-[#171717] dark:text-[#F8F3E8]">
                  Gunakan Baris Judul Header (Thead)
                </span>
              </label>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t-2 border-[#171717]/20">
              <button
                type="button"
                onClick={() => setShowTableModal(false)}
                className="nb-btn nb-btn-secondary px-4 py-2 text-xs"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleInsertTable}
                className="nb-btn nb-btn-primary px-5 py-2 text-xs"
              >
                Sisipkan Tabel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Link Modal */}
      {showLinkModal && (
        <div className="fixed inset-0 z-70 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="nb-card bg-white dark:bg-[#0B3026] p-6 w-full max-w-md space-y-4">
            <div className="flex items-center justify-between border-b-2 border-[#171717] pb-3">
              <h4 className="font-extrabold text-[#171717] dark:text-[#F8F3E8] text-base flex items-center gap-2">
                <LinkIcon className="w-4 h-4 text-[#06251D] dark:text-[#D9AC45]" />
                <span>Sisipkan Tautan (Hyperlink)</span>
              </h4>
              <button type="button" onClick={() => setShowLinkModal(false)} className="nb-btn nb-btn-secondary p-1">
                <X className="w-4 h-4" />
              </button>
            </div>

            {linkModalError && (
              <div className="p-3 rounded-md bg-[#F04438] border-2 border-[#171717] text-white text-xs font-bold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{linkModalError}</span>
              </div>
            )}

            <div className="space-y-3">
              <div>
                <label className="text-xs font-extrabold text-[#171717] dark:text-[#F8F3E8] block mb-1">
                  Teks Tautan (Opsional)
                </label>
                <input
                  type="text"
                  data-testid="rte-link-text-input"
                  value={linkText}
                  onChange={(e) => setLinkText(e.target.value)}
                  placeholder="Contoh: Kunjungi Referensi Kitab"
                  className="nb-input w-full px-3.5 py-2.5 text-xs"
                />
              </div>

              <div>
                <label className="text-xs font-extrabold text-[#171717] dark:text-[#F8F3E8] block mb-1">
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
                  className="nb-input w-full px-3.5 py-2.5 text-xs"
                />
                <p className="text-[11px] text-[#171717]/70 dark:text-[#F8F3E8]/70 mt-1">
                  Tips: Anda juga dapat langsung menempelkan (paste) URL ke dalam editor untuk membuatnya menjadi hyperlink otomatis.
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t-2 border-[#171717]/20">
              <button
                type="button"
                onClick={() => setShowLinkModal(false)}
                className="nb-btn nb-btn-secondary px-4 py-2 text-xs"
              >
                Batal
              </button>
              <button
                type="button"
                data-testid="rte-link-submit-btn"
                onClick={handleInsertLink}
                className="nb-btn nb-btn-primary px-4 py-2 text-xs"
              >
                Terapkan Tautan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Image Modal */}
      {showImageModal && (
        <div className="fixed inset-0 z-70 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="nb-card bg-white dark:bg-[#0B3026] p-6 w-full max-w-md space-y-4">
            <div className="flex items-center justify-between border-b-2 border-[#171717] pb-3">
              <h4 className="font-extrabold text-[#171717] dark:text-[#F8F3E8] text-base">Sisipkan Gambar dalam Konten</h4>
              <button type="button" onClick={() => setShowImageModal(false)} className="nb-btn nb-btn-secondary p-1">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-extrabold text-[#171717] dark:text-[#F8F3E8] block mb-1">
                  Unggah dari Perangkat:
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="w-full text-xs text-[#171717] dark:text-[#F8F3E8] file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-2 file:border-[#171717] file:text-xs file:font-extrabold file:bg-[#D9AC45] file:text-[#171717] cursor-pointer"
                />
                {uploadingImage && (
                  <div className="mt-2 space-y-1">
                    <p className="text-[10px] font-bold text-[#06251D] dark:text-[#D9AC45]">Mengunggah gambar... {uploadProgress}%</p>
                    <div className="w-full h-2 bg-white border border-[#171717] rounded-sm overflow-hidden">
                      <div className="h-full bg-[#D9AC45] transition-all duration-300" style={{ width: `${uploadProgress}%` }} />
                    </div>
                  </div>
                )}
              </div>

              <div className="text-center text-xs text-[#171717]/60 dark:text-[#F8F3E8]/60 font-extrabold uppercase">atau</div>

              <div>
                <label className="text-xs font-extrabold text-[#171717] dark:text-[#F8F3E8] block mb-1">
                  URL Gambar Langsung:
                </label>
                <input
                  type="url"
                  data-testid="rte-image-url-input"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="https://images.unsplash.com/photo-..."
                  className="nb-input w-full px-3.5 py-2.5 text-xs"
                />
              </div>

              <div>
                <label className="text-xs font-extrabold text-[#171717] dark:text-[#F8F3E8] block mb-1">
                  Keterangan Gambar (Caption):
                </label>
                <input
                  type="text"
                  data-testid="rte-image-caption-input"
                  value={imageCaption}
                  onChange={(e) => setImageCaption(e.target.value)}
                  placeholder="Deskripsi singkat gambar..."
                  className="nb-input w-full px-3.5 py-2.5 text-xs"
                />
              </div>

              {imageUrl && (
                <div className="aspect-video w-full rounded-md bg-white overflow-hidden border-2 border-[#171717] relative">
                  <img src={imageUrl} alt="Preview" className="w-full h-full object-cover" />
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t-2 border-[#171717]/20">
              <button
                type="button"
                onClick={() => setShowImageModal(false)}
                className="nb-btn nb-btn-secondary px-4 py-2 text-xs"
              >
                Batal
              </button>
              <button
                type="button"
                data-testid="rte-image-submit-btn"
                onClick={handleInsertImage}
                disabled={!imageUrl}
                className="nb-btn nb-btn-primary px-4 py-2 text-xs disabled:opacity-50"
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
