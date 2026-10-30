import React from 'react';
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
  Image as ImageIcon,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  RotateCcw,
  Languages,
  Table as TableIcon
} from 'lucide-react';
import { BlockFormatOption, TextAlignOption } from '../../utils/richTextHelper';

export interface FloatingContextualToolbarProps {
  visible: boolean;
  position: {
    top: number;
    left: number;
    placement: 'top' | 'bottom';
  };
  activeStates: Record<string, boolean>;
  activeBlock: BlockFormatOption;
  activeAlign: TextAlignOption;
  activeLinkElement: HTMLAnchorElement | null;
  onApplyBlockFormat: (format: BlockFormatOption) => void;
  onExecCommand: (command: string, value?: string) => void;
  onApplyAlignment: (align: TextAlignOption) => void;
  onOpenLinkModal: () => void;
  onUnlink: () => void;
  onOpenImageModal: () => void;
  onOpenTableModal: () => void;
  onInsertArabicBlock: () => void;
  onUndo: () => void;
  onResetFormat: () => void;
  toolbarRef?: React.RefObject<HTMLDivElement | null>;
}

export const FloatingContextualToolbar: React.FC<FloatingContextualToolbarProps> = ({
  visible,
  position,
  activeStates,
  activeBlock,
  activeAlign,
  activeLinkElement,
  onApplyBlockFormat,
  onExecCommand,
  onApplyAlignment,
  onOpenLinkModal,
  onUnlink,
  onOpenImageModal,
  onOpenTableModal,
  onInsertArabicBlock,
  onUndo,
  onResetFormat,
  toolbarRef
}) => {
  if (!visible) return null;

  const activeBtnClass = 'bg-[#F2D98A] text-[#102C2B] border-[#171717] dark:border-[#B8E8D8] font-extrabold shadow-2xs';
  const inactiveBtnClass = 'bg-white dark:bg-[#193A37] text-[#171717] dark:text-[#F0F7F5] border-transparent hover:border-[#171717] dark:hover:border-[#B8E8D8]';

  // Prevent mousedown from blurring contentEditable and collapsing selection
  const handleToolbarMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  return (
    <div
      ref={toolbarRef as any}
      data-testid="floating-contextual-toolbar"
      role="toolbar"
      aria-label="Floating Formatting Toolbar"
      onMouseDown={handleToolbarMouseDown}
      style={{
        position: 'fixed',
        top: `${position.top}px`,
        left: `${position.left}px`,
        zIndex: 60
      }}
      className="bg-[#FAF7F0] dark:bg-[#0E2825] border-2 border-[#171717] dark:border-[#4CA7A1] shadow-[4px_4px_0px_#171717] dark:shadow-[4px_4px_0px_#061715] rounded-md p-1 sm:p-1.5 flex items-center gap-1 max-w-[calc(100vw-20px)] overflow-x-auto select-none transition-all duration-75 text-[#171717] dark:text-[#F8F3E8]"
    >
      {/* 1. Block Formatting (P, H1, H2, H3, Blockquote) */}
      <div className="flex items-center gap-0.5 shrink-0">
        <button
          type="button"
          data-testid="floating-rte-p"
          onMouseDown={handleToolbarMouseDown}
          onClick={() => onApplyBlockFormat('p')}
          className={`px-1.5 py-1 rounded-xs border text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
            activeBlock === 'p' ? activeBtnClass : inactiveBtnClass
          }`}
          title="Paragraf Normal (P)"
        >
          <Pilcrow className="w-3.5 h-3.5" />
          <span className="text-[11px] font-extrabold hidden sm:inline">Normal</span>
        </button>

        <button
          type="button"
          data-testid="floating-rte-h1"
          onMouseDown={handleToolbarMouseDown}
          onClick={() => onApplyBlockFormat('h1')}
          className={`p-1 sm:p-1.5 rounded-xs border transition cursor-pointer ${
            activeBlock === 'h1' ? activeBtnClass : inactiveBtnClass
          }`}
          title="Heading 1 (Judul Utama)"
        >
          <Heading1 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
        </button>

        <button
          type="button"
          data-testid="floating-rte-h2"
          onMouseDown={handleToolbarMouseDown}
          onClick={() => onApplyBlockFormat('h2')}
          className={`p-1 sm:p-1.5 rounded-xs border transition cursor-pointer ${
            activeBlock === 'h2' ? activeBtnClass : inactiveBtnClass
          }`}
          title="Heading 2 (Subjudul)"
        >
          <Heading2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
        </button>

        <button
          type="button"
          data-testid="floating-rte-h3"
          onMouseDown={handleToolbarMouseDown}
          onClick={() => onApplyBlockFormat('h3')}
          className={`p-1 sm:p-1.5 rounded-xs border transition cursor-pointer ${
            activeBlock === 'h3' ? activeBtnClass : inactiveBtnClass
          }`}
          title="Heading 3 (Sub-subjudul)"
        >
          <Heading3 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
        </button>

        <button
          type="button"
          data-testid="floating-rte-blockquote"
          onMouseDown={handleToolbarMouseDown}
          onClick={() => onApplyBlockFormat('blockquote')}
          className={`p-1 sm:p-1.5 rounded-xs border transition cursor-pointer ${
            activeBlock === 'blockquote' ? activeBtnClass : inactiveBtnClass
          }`}
          title="Kutipan (Blockquote)"
        >
          <Quote className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
        </button>
      </div>

      <div className="h-4 w-[1.5px] bg-[#171717]/25 dark:bg-[#D9AC45]/30 mx-0.5 shrink-0" />

      {/* 2. Inline Text Style (Bold, Italic, Underline, Strikethrough) */}
      <div className="flex items-center gap-0.5 shrink-0">
        <button
          type="button"
          data-testid="floating-rte-bold"
          onMouseDown={handleToolbarMouseDown}
          onClick={() => onExecCommand('bold')}
          className={`p-1 sm:p-1.5 rounded-xs border transition cursor-pointer ${
            activeStates.bold ? activeBtnClass : inactiveBtnClass
          }`}
          title="Tebal (Bold)"
        >
          <Bold className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
        </button>

        <button
          type="button"
          data-testid="floating-rte-italic"
          onMouseDown={handleToolbarMouseDown}
          onClick={() => onExecCommand('italic')}
          className={`p-1 sm:p-1.5 rounded-xs border transition cursor-pointer ${
            activeStates.italic ? activeBtnClass : inactiveBtnClass
          }`}
          title="Miring (Italic)"
        >
          <Italic className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
        </button>

        <button
          type="button"
          data-testid="floating-rte-underline"
          onMouseDown={handleToolbarMouseDown}
          onClick={() => onExecCommand('underline')}
          className={`p-1 sm:p-1.5 rounded-xs border transition cursor-pointer ${
            activeStates.underline ? activeBtnClass : inactiveBtnClass
          }`}
          title="Garis Bawah (Underline)"
        >
          <Underline className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
        </button>

        <button
          type="button"
          data-testid="floating-rte-strikethrough"
          onMouseDown={handleToolbarMouseDown}
          onClick={() => onExecCommand('strikeThrough')}
          className={`p-1 sm:p-1.5 rounded-xs border transition cursor-pointer ${
            activeStates.strikeThrough ? activeBtnClass : inactiveBtnClass
          }`}
          title="Coretan (Strikethrough)"
        >
          <Strikethrough className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
        </button>
      </div>

      <div className="h-4 w-[1.5px] bg-[#171717]/25 dark:bg-[#D9AC45]/30 mx-0.5 shrink-0" />

      {/* 3. Text Alignment (Left, Center, Right, Justify) */}
      <div className="flex items-center gap-0.5 shrink-0">
        <button
          type="button"
          data-testid="floating-rte-align-left"
          onMouseDown={handleToolbarMouseDown}
          onClick={() => onApplyAlignment('left')}
          className={`p-1 sm:p-1.5 rounded-xs border transition cursor-pointer ${
            activeAlign === 'left' ? activeBtnClass : inactiveBtnClass
          }`}
          title="Rata Kiri"
        >
          <AlignLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
        </button>

        <button
          type="button"
          data-testid="floating-rte-align-center"
          onMouseDown={handleToolbarMouseDown}
          onClick={() => onApplyAlignment('center')}
          className={`p-1 sm:p-1.5 rounded-xs border transition cursor-pointer ${
            activeAlign === 'center' ? activeBtnClass : inactiveBtnClass
          }`}
          title="Rata Tengah"
        >
          <AlignCenter className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
        </button>

        <button
          type="button"
          data-testid="floating-rte-align-right"
          onMouseDown={handleToolbarMouseDown}
          onClick={() => onApplyAlignment('right')}
          className={`p-1 sm:p-1.5 rounded-xs border transition cursor-pointer ${
            activeAlign === 'right' ? activeBtnClass : inactiveBtnClass
          }`}
          title="Rata Kanan"
        >
          <AlignRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
        </button>

        <button
          type="button"
          data-testid="floating-rte-align-justify"
          onMouseDown={handleToolbarMouseDown}
          onClick={() => onApplyAlignment('justify')}
          className={`p-1 sm:p-1.5 rounded-xs border transition cursor-pointer ${
            activeAlign === 'justify' ? activeBtnClass : inactiveBtnClass
          }`}
          title="Rata Kiri-Kanan (Justify)"
        >
          <AlignJustify className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
        </button>
      </div>

      <div className="h-4 w-[1.5px] bg-[#171717]/25 dark:bg-[#D9AC45]/30 mx-0.5 shrink-0" />

      {/* 4. Lists (Bullet, Numbered) */}
      <div className="flex items-center gap-0.5 shrink-0">
        <button
          type="button"
          data-testid="floating-rte-ul"
          onMouseDown={handleToolbarMouseDown}
          onClick={() => onExecCommand('insertUnorderedList')}
          className={`p-1 sm:p-1.5 rounded-xs border transition cursor-pointer ${
            activeStates.ul ? activeBtnClass : inactiveBtnClass
          }`}
          title="Daftar Poin (Bullet List)"
        >
          <List className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
        </button>

        <button
          type="button"
          data-testid="floating-rte-ol"
          onMouseDown={handleToolbarMouseDown}
          onClick={() => onExecCommand('insertOrderedList')}
          className={`p-1 sm:p-1.5 rounded-xs border transition cursor-pointer ${
            activeStates.ol ? activeBtnClass : inactiveBtnClass
          }`}
          title="Daftar Angka (Numbered List)"
        >
          <ListOrdered className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
        </button>
      </div>

      <div className="h-4 w-[1.5px] bg-[#171717]/25 dark:bg-[#D9AC45]/30 mx-0.5 shrink-0" />

      {/* 5. Hyperlink, Image & Table Insert */}
      <div className="flex items-center gap-0.5 shrink-0">
        <button
          type="button"
          data-testid="floating-rte-link"
          onMouseDown={handleToolbarMouseDown}
          onClick={onOpenLinkModal}
          className={`p-1 sm:p-1.5 rounded-xs border transition cursor-pointer ${
            activeLinkElement ? activeBtnClass : inactiveBtnClass
          }`}
          title="Sisipkan atau Edit Tautan (Hyperlink)"
        >
          <LinkIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
        </button>

        {activeLinkElement && (
          <button
            type="button"
            data-testid="floating-rte-unlink"
            onMouseDown={handleToolbarMouseDown}
            onClick={onUnlink}
            className="p-1 sm:p-1.5 bg-[#F04438] text-white border border-[#171717] rounded-xs transition cursor-pointer"
            title="Hapus Tautan (Unlink)"
          >
            <Unlink className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </button>
        )}

        <button
          type="button"
          data-testid="floating-rte-image"
          onMouseDown={handleToolbarMouseDown}
          onClick={onOpenImageModal}
          className={`p-1 sm:p-1.5 rounded-xs border transition cursor-pointer ${inactiveBtnClass}`}
          title="Sisipkan Gambar"
        >
          <ImageIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#06251D] dark:text-[#D9AC45]" />
        </button>

        <button
          type="button"
          data-testid="floating-rte-table"
          onMouseDown={handleToolbarMouseDown}
          onClick={onOpenTableModal}
          className={`p-1 sm:p-1.5 rounded-xs border transition cursor-pointer ${inactiveBtnClass}`}
          title="Buat Tabel Baru"
        >
          <TableIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#06251D] dark:text-[#D9AC45]" />
        </button>
      </div>

      <div className="h-4 w-[1.5px] bg-[#171717]/25 dark:bg-[#D9AC45]/30 mx-0.5 shrink-0" />

      {/* 6. Arabic block helper, Undo, and Reset format */}
      <div className="flex items-center gap-0.5 shrink-0">
        <button
          type="button"
          data-testid="floating-rte-arabic"
          onMouseDown={handleToolbarMouseDown}
          onClick={onInsertArabicBlock}
          className="px-1.5 py-1 bg-[#06251D] text-[#D9AC45] border border-[#171717] rounded-xs text-xs font-extrabold hover:bg-[#0B3026] transition flex items-center gap-1 cursor-pointer"
          title="Sisipkan Blok Teks Bahasa Arab (RTL)"
        >
          <Languages className="w-3.5 h-3.5" />
          <span className="hidden sm:inline text-[11px]">+ Arab</span>
        </button>

        <button
          type="button"
          data-testid="floating-rte-undo"
          onMouseDown={handleToolbarMouseDown}
          onClick={onUndo}
          className={`p-1 sm:p-1.5 rounded-xs border transition cursor-pointer ${inactiveBtnClass}`}
          title="Batalkan (Undo)"
        >
          <RotateCcw className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
        </button>

        <button
          type="button"
          data-testid="floating-rte-reset-format"
          onMouseDown={handleToolbarMouseDown}
          onClick={onResetFormat}
          className="p-1 sm:p-1.5 bg-[#F04438] text-white border border-[#171717] rounded-xs transition cursor-pointer"
          title="Hapus Format (Kembalikan ke Normal)"
        >
          <span className="text-[11px] font-black px-0.5">Tx</span>
        </button>
      </div>
    </div>
  );
};
