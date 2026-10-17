import React, { useRef, useEffect, useState } from 'react';
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Link as LinkIcon,
  Image as ImageIcon,
  AlignLeft,
  AlignCenter,
  AlignRight,
  RotateCcw,
  Upload,
  X,
  Languages,
  Table as TableIcon,
  Plus,
  Trash2,
  Rows,
  Columns,
  Type
} from 'lucide-react';
import { uploadFileToStorage } from '../../firebase/services';

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

function sanitizeRichHtml(rawHtml: string): string {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(rawHtml, 'text/html');

    // Remove forbidden or dangerous tags
    const FORBIDDEN_TAGS = ['script', 'iframe', 'object', 'embed', 'form', 'input', 'button', 'select', 'textarea', 'style', 'link', 'meta', 'xml'];
    FORBIDDEN_TAGS.forEach(tag => {
      doc.querySelectorAll(tag).forEach(el => el.remove());
    });

    // Remove HTML comment nodes from Word / Google Docs
    const removeComments = (node: Node) => {
      for (let i = node.childNodes.length - 1; i >= 0; i--) {
        const child = node.childNodes[i];
        if (child.nodeType === Node.COMMENT_NODE) {
          child.remove();
        } else if (child.nodeType === Node.ELEMENT_NODE) {
          removeComments(child);
        }
      }
    };
    removeComments(doc.body);

    // Normalize elements and convert Google Docs / Word / web inline styles to semantic HTML
    const allElements = doc.querySelectorAll('*');
    allElements.forEach(el => {
      // Strip inline event attributes and javascript links
      Array.from(el.attributes).forEach(attr => {
        if (attr.name.startsWith('on') || attr.value.toLowerCase().includes('javascript:')) {
          el.removeAttribute(attr.name);
        }
      });

      const style = el.getAttribute('style') || '';

      // Preserve or convert bold styles (e.g., Google Docs <span style="font-weight: 700">)
      if (/font-weight:\s*(bold|[7-9]00)/i.test(style) && !['STRONG', 'B', 'H1', 'H2', 'H3', 'TH'].includes(el.tagName)) {
        const strong = doc.createElement('strong');
        strong.innerHTML = el.innerHTML;
        el.replaceWith(strong);
        return;
      }

      // Preserve or convert italic styles
      if (/font-style:\s*italic/i.test(style) && !['EM', 'I'].includes(el.tagName)) {
        const em = doc.createElement('em');
        em.innerHTML = el.innerHTML;
        el.replaceWith(em);
        return;
      }

      // Preserve or convert underline styles
      if (/text-decoration:\s*underline/i.test(style) && !['U'].includes(el.tagName)) {
        const u = doc.createElement('u');
        u.innerHTML = el.innerHTML;
        el.replaceWith(u);
        return;
      }

      // Format tables pasted from Word / Excel
      if (el.tagName === 'TABLE') {
        el.className = 'w-full border-collapse border border-stone-300 dark:border-stone-700 text-xs sm:text-sm my-4';
      }
      if (el.tagName === 'TD' || el.tagName === 'TH') {
        el.classList.add('border', 'border-stone-300', 'dark:border-stone-700', 'p-2');
      }
    });

    return doc.body.innerHTML;
  } catch (err) {
    return rawHtml;
  }
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export const RichTextEditor: React.FC<RichTextEditorProps> = ({
  value,
  onChange,
  placeholder = 'Tuliskan artikel atau materi pembelajaran di sini...',
  minHeight = '320px'
}) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const savedRangeRef = useRef<Range | null>(null);

  // Modals state
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');

  const [showImageModal, setShowImageModal] = useState(false);
  const [imageUrl, setImageUrl] = useState('');
  const [imageCaption, setImageCaption] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const [showTableModal, setShowTableModal] = useState(false);
  const [tableRows, setTableRows] = useState(3);
  const [tableCols, setTableCols] = useState(3);
  const [tableHeader, setTableHeader] = useState(true);

  // Active States & Table Selection
  const [activeStates, setActiveStates] = useState<Record<string, boolean>>({});
  const [selectedFont, setSelectedFont] = useState<string>(FONT_OPTIONS[0].value);
  const [activeTableInfo, setActiveTableInfo] = useState<{ table: HTMLTableElement; cell: HTMLTableCellElement } | null>(null);

  // Save selection before opening modal or dropdown
  const saveSelection = () => {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
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

  const updateActiveStates = () => {
    if (!editorRef.current) return;

    setActiveStates({
      bold: document.queryCommandState('bold'),
      italic: document.queryCommandState('italic'),
      underline: document.queryCommandState('underline'),
      strikeThrough: document.queryCommandState('strikeThrough'),
      ul: document.queryCommandState('insertUnorderedList'),
      ol: document.queryCommandState('insertOrderedList'),
      justifyLeft: document.queryCommandState('justifyLeft'),
      justifyCenter: document.queryCommandState('justifyCenter'),
      justifyRight: document.queryCommandState('justifyRight')
    });

    // Detect if cursor is inside a table cell
    const sel = window.getSelection();
    if (sel && sel.anchorNode) {
      const parent = sel.anchorNode.nodeType === 3 ? sel.anchorNode.parentNode : sel.anchorNode;
      if (parent && parent instanceof Element) {
        const cell = parent.closest('td, th') as HTMLTableCellElement | null;
        const table = parent.closest('table') as HTMLTableElement | null;
        if (cell && table && editorRef.current.contains(table)) {
          setActiveTableInfo({ table, cell });
        } else {
          setActiveTableInfo(null);
        }
      } else {
        setActiveTableInfo(null);
      }
    } else {
      setActiveTableInfo(null);
    }
  };

  useEffect(() => {
    const handleSelectionChange = () => {
      updateActiveStates();
    };
    document.addEventListener('selectionchange', handleSelectionChange);
    return () => document.removeEventListener('selectionchange', handleSelectionChange);
  }, []);

  const execCommand = (command: string, value: string = '') => {
    if (editorRef.current) {
      editorRef.current.focus();
    }
    document.execCommand(command, false, value);
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
    updateActiveStates();
  };

  const handleInput = () => {
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
    updateActiveStates();
  };

  // Font family change handler
  const handleFontChange = (fontValue: string) => {
    setSelectedFont(fontValue);
    saveSelection();
    restoreSelection();
    execCommand('fontName', fontValue);
  };

  // Insert Link
  const handleInsertLink = () => {
    restoreSelection();
    if (linkUrl) {
      execCommand('createLink', linkUrl);
      setLinkUrl('');
      setShowLinkModal(false);
    }
  };

  // Insert Image
  const handleInsertImage = () => {
    restoreSelection();
    if (imageUrl) {
      const imgHtml = `<figure class="my-6 max-w-full"><img src="${imageUrl}" alt="${imageCaption || 'Gambar Artikel'}" class="w-full h-auto rounded-2xl border border-stone-200 dark:border-stone-800 shadow-xs" />${imageCaption ? `<figcaption class="text-center text-xs text-stone-500 dark:text-stone-400 mt-2 font-medium">${imageCaption}</figcaption>` : ''}</figure><p><br></p>`;
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
      alert('Harap pilih berkas gambar (JPG, PNG, WebP).');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert('Ukuran berkas gambar maksimal 5 MB.');
      return;
    }

    setUploadingImage(true);
    setUploadProgress(10);

    try {
      const downloadUrl = await uploadFileToStorage(file, 'blog_images', (pct) => {
        setUploadProgress(pct);
      });
      setImageUrl(downloadUrl);
    } catch (err: any) {
      alert('Gagal mengunggah gambar: ' + err.message);
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
    const { table, cell } = activeTableInfo;
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

  // Rich Text Paste Event Handler
  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const rawHtml = e.clipboardData.getData('text/html');
    const text = e.clipboardData.getData('text/plain');

    if (rawHtml) {
      const cleanHtml = sanitizeRichHtml(rawHtml);
      document.execCommand('insertHTML', false, cleanHtml);
    } else if (text) {
      const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
      const formatted = lines.map(line => `<p>${escapeHtml(line)}</p>`).join('');
      document.execCommand('insertHTML', false, formatted || escapeHtml(text));
    }
    handleInput();
  };

  return (
    <div className="border border-stone-200 dark:border-stone-800 rounded-2xl overflow-hidden bg-white dark:bg-stone-900 transition-colors shadow-xs">
      {/* Editor Main Toolbar */}
      <div className="p-2 bg-stone-50 dark:bg-stone-800/80 border-b border-stone-200 dark:border-stone-800 flex flex-wrap items-center gap-1.5 text-stone-700 dark:text-stone-300">
        
        {/* Font Selection Dropdown */}
        <div className="flex items-center gap-1 pr-1 border-r border-stone-300 dark:border-stone-700">
          <Type className="w-3.5 h-3.5 text-stone-400 shrink-0 ml-1" />
          <select
            value={selectedFont}
            onChange={(e) => handleFontChange(e.target.value)}
            className="px-2 py-1 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-emerald-500 text-stone-900 dark:text-white cursor-pointer max-w-[140px] sm:max-w-[170px] truncate"
            title="Pilih Jenis Font Tulisan"
          >
            {FONT_OPTIONS.map(font => (
              <option key={font.value} value={font.value}>{font.label}</option>
            ))}
          </select>
        </div>

        {/* Headings */}
        <button
          type="button"
          onClick={() => execCommand('formatBlock', 'h1')}
          className="p-1.5 hover:bg-stone-200 dark:hover:bg-stone-700 rounded-lg transition"
          title="Heading 1"
        >
          <Heading1 className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => execCommand('formatBlock', 'h2')}
          className="p-1.5 hover:bg-stone-200 dark:hover:bg-stone-700 rounded-lg transition"
          title="Heading 2"
        >
          <Heading2 className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => execCommand('formatBlock', 'h3')}
          className="p-1.5 hover:bg-stone-200 dark:hover:bg-stone-700 rounded-lg transition"
          title="Heading 3"
        >
          <Heading3 className="w-4 h-4" />
        </button>

        <div className="h-4 w-[1px] bg-stone-300 dark:bg-stone-700 mx-1" />

        {/* Inline formatting with active state highlighting */}
        <button
          type="button"
          onClick={() => execCommand('bold')}
          className={`p-1.5 rounded-lg transition ${activeStates.bold ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-bold' : 'hover:bg-stone-200 dark:hover:bg-stone-700'}`}
          title="Tebal (Bold)"
        >
          <Bold className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => execCommand('italic')}
          className={`p-1.5 rounded-lg transition ${activeStates.italic ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-bold' : 'hover:bg-stone-200 dark:hover:bg-stone-700'}`}
          title="Miring (Italic)"
        >
          <Italic className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => execCommand('underline')}
          className={`p-1.5 rounded-lg transition ${activeStates.underline ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-bold' : 'hover:bg-stone-200 dark:hover:bg-stone-700'}`}
          title="Garis Bawah (Underline)"
        >
          <Underline className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => execCommand('strikeThrough')}
          className={`p-1.5 rounded-lg transition ${activeStates.strikeThrough ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-bold' : 'hover:bg-stone-200 dark:hover:bg-stone-700'}`}
          title="Coretan (Strikethrough)"
        >
          <Strikethrough className="w-4 h-4" />
        </button>

        <div className="h-4 w-[1px] bg-stone-300 dark:bg-stone-700 mx-1" />

        {/* Alignment */}
        <button
          type="button"
          onClick={() => execCommand('justifyLeft')}
          className={`p-1.5 rounded-lg transition ${activeStates.justifyLeft ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' : 'hover:bg-stone-200 dark:hover:bg-stone-700'}`}
          title="Rata Kiri"
        >
          <AlignLeft className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => execCommand('justifyCenter')}
          className={`p-1.5 rounded-lg transition ${activeStates.justifyCenter ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' : 'hover:bg-stone-200 dark:hover:bg-stone-700'}`}
          title="Rata Tengah"
        >
          <AlignCenter className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => execCommand('justifyRight')}
          className={`p-1.5 rounded-lg transition ${activeStates.justifyRight ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' : 'hover:bg-stone-200 dark:hover:bg-stone-700'}`}
          title="Rata Kanan"
        >
          <AlignRight className="w-4 h-4" />
        </button>

        <div className="h-4 w-[1px] bg-stone-300 dark:bg-stone-700 mx-1" />

        {/* Lists & Quotes */}
        <button
          type="button"
          onClick={() => execCommand('insertUnorderedList')}
          className={`p-1.5 rounded-lg transition ${activeStates.ul ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' : 'hover:bg-stone-200 dark:hover:bg-stone-700'}`}
          title="Daftar Poin (Bullet List)"
        >
          <List className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => execCommand('insertOrderedList')}
          className={`p-1.5 rounded-lg transition ${activeStates.ol ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' : 'hover:bg-stone-200 dark:hover:bg-stone-700'}`}
          title="Daftar Angka (Numbered List)"
        >
          <ListOrdered className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => execCommand('formatBlock', '<blockquote>')}
          className="p-1.5 hover:bg-stone-200 dark:hover:bg-stone-700 rounded-lg transition"
          title="Kutipan (Blockquote)"
        >
          <Quote className="w-4 h-4" />
        </button>

        <div className="h-4 w-[1px] bg-stone-300 dark:bg-stone-700 mx-1" />

        {/* Table Creation */}
        <button
          type="button"
          onClick={() => { saveSelection(); setShowTableModal(true); }}
          className="p-1.5 hover:bg-emerald-100 dark:hover:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 rounded-lg transition flex items-center gap-1 font-semibold text-xs"
          title="Buat Tabel Baru"
        >
          <TableIcon className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          <span className="hidden sm:inline">Tabel</span>
        </button>

        <div className="h-4 w-[1px] bg-stone-300 dark:bg-stone-700 mx-1" />

        {/* Media & Links */}
        <button
          type="button"
          onClick={() => { saveSelection(); setShowLinkModal(true); }}
          className="p-1.5 hover:bg-stone-200 dark:hover:bg-stone-700 rounded-lg transition"
          title="Sisipkan Tautan (Link)"
        >
          <LinkIcon className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => { saveSelection(); setShowImageModal(true); }}
          className="p-1.5 hover:bg-stone-200 dark:hover:bg-stone-700 rounded-lg transition"
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
          onClick={() => execCommand('removeFormat')}
          className="p-1.5 hover:bg-rose-100 dark:hover:bg-rose-950/50 text-rose-600 rounded-lg transition ml-auto"
          title="Hapus Format Teks"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>

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
        onInput={handleInput}
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
              <button onClick={() => setShowTableModal(false)} className="text-stone-400 hover:text-stone-600">
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
              <h4 className="font-bold text-stone-900 dark:text-white text-base">Sisipkan Tautan (URL)</h4>
              <button onClick={() => setShowLinkModal(false)} className="text-stone-400 hover:text-stone-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <input
              type="url"
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              placeholder="https://example.com"
              className="w-full px-3.5 py-2.5 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 text-stone-900 dark:text-white"
            />
            <div className="flex justify-end gap-2 pt-2 border-t border-stone-200 dark:border-stone-800">
              <button
                type="button"
                onClick={() => setShowLinkModal(false)}
                className="px-4 py-2 bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 rounded-xl text-xs font-semibold"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleInsertLink}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold shadow"
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
              <h4 className="font-bold text-stone-900 dark:text-white text-base">Sisipkan Gambar dalam Artikel</h4>
              <button onClick={() => setShowImageModal(false)} className="text-stone-400 hover:text-stone-600">
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
                className="px-4 py-2 bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 rounded-xl text-xs font-semibold"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleInsertImage}
                disabled={!imageUrl}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl text-xs font-semibold shadow"
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
