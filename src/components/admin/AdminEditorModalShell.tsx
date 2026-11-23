import React, { useEffect } from 'react';
import {
  X,
  CheckCircle,
  AlertCircle
} from 'lucide-react';

export interface AdminEditorModalFeedback {
  type: 'success' | 'error';
  text: string;
}

export interface AdminEditorTab {
  id: string;
  label: string;
  shortLabel?: string;
  icon?: React.ReactNode;
  badge?: string | number | null;
  testId?: string;
  content: React.ReactNode;
}

export interface AdminEditorModalShellProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  tabs: AdminEditorTab[];
  activeTabId: string;
  onTabChange: (tabId: string) => void;
  hasUnsavedChanges?: boolean;
  wordCount?: number | null;
  feedback?: AdminEditorModalFeedback | null;
  onDismissFeedback?: () => void;
  footer: React.ReactNode;
  testId?: string;
}

export const AdminEditorModalShell: React.FC<AdminEditorModalShellProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  icon,
  tabs,
  activeTabId,
  onTabChange,
  hasUnsavedChanges = false,
  wordCount = null,
  feedback,
  onDismissFeedback,
  footer,
  testId = 'admin-editor-modal-shell'
}) => {
  // Lock background page scroll while the full-workspace modal is open
  useEffect(() => {
    if (!isOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-0 sm:p-2 lg:p-3 animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div
        data-testid={testId}
        className="w-full h-[100dvh] max-h-[100dvh] sm:w-[96vw] sm:h-[94dvh] sm:max-h-[94dvh] lg:w-[96vw] lg:max-w-[1680px] lg:h-[94vh] lg:max-h-[94vh] rounded-none sm:rounded-lg border-0 sm:border-2 border-[#171717] dark:border-[#D9AC45]/60 sm:shadow-[6px_6px_0px_#171717] dark:sm:shadow-[6px_6px_0px_#04130F] bg-white dark:bg-[#0D2520] overflow-hidden flex flex-col"
      >
        {/* Pinned Neo-Brutalist Workspace Header */}
        <div
          data-testid="admin-editor-modal-header"
          className="px-3.5 py-2 sm:px-5 sm:py-2.5 lg:px-6 border-b-2 border-[#171717] dark:border-[#D9AC45]/45 flex items-center justify-between gap-3 bg-[#06251D] text-[#F8F3E8] shrink-0"
        >
          <div className="min-w-0 flex items-center gap-2.5">
            {icon && <span className="shrink-0">{icon}</span>}
            <div className="min-w-0">
              <h3 className="text-sm sm:text-base font-extrabold text-[#F8F3E8] font-serif-brand truncate leading-tight">
                {title}
              </h3>
              {subtitle && (
                <p className="hidden lg:block text-[11px] text-[#F8F3E8]/70 truncate mt-0.5">
                  {subtitle}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
            {/* Unsaved Changes / Saved Status Indicator */}
            <div
              data-testid="editor-unsaved-indicator"
              aria-live="polite"
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] font-extrabold transition-colors ${
                hasUnsavedChanges
                  ? 'bg-[#D9AC45] text-[#171717] border-2 border-[#171717] shadow-[2px_2px_0px_#171717]'
                  : 'bg-[#0B3026] text-[#F8F3E8]/75 border border-[#F8F3E8]/20'
              }`}
            >
              {hasUnsavedChanges ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-[#171717] animate-pulse shrink-0" />
                  <span className="hidden sm:inline">Perubahan belum disimpan</span>
                  <span className="sm:hidden">Belum disimpan</span>
                </>
              ) : (
                <>
                  <CheckCircle className="w-3 h-3 text-[#D9AC45] shrink-0" />
                  <span className="hidden sm:inline">Tersimpan</span>
                  <span className="sm:hidden">Aman</span>
                </>
              )}
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label="Tutup editor"
              className="nb-btn nb-btn-secondary p-1.5 sm:p-2 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Dynamic Multi-Page Tab Bar (Neo-Brutalist Navigation Chrome) */}
        <div className="bg-[#F8F3E8] dark:bg-[#07261E] border-b-2 border-[#171717] dark:border-[#D9AC45]/40 px-2.5 sm:px-5 lg:px-6 flex items-end justify-between gap-3 shrink-0">
          <div
            role="tablist"
            aria-label="Navigasi halaman editor"
            className="flex items-end gap-1 sm:gap-1.5 pt-2 overflow-x-auto no-scrollbar min-w-0"
          >
            {tabs.map((tab) => {
              const isActive = tab.id === activeTabId;
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  data-testid={tab.testId || `editor-tab-${tab.id}`}
                  onClick={() => onTabChange(tab.id)}
                  className={`relative shrink-0 inline-flex items-center gap-1.5 px-3 sm:px-4 pt-2 pb-2 text-xs font-extrabold rounded-t-md border-t-2 border-x-2 transition-colors cursor-pointer whitespace-nowrap ${
                    isActive
                      ? 'bg-white dark:bg-[#0D2520] text-[#06251D] dark:text-[#F8F3E8] border-[#171717] dark:border-[#D9AC45]/65 -mb-[2px] pb-[10px] z-10'
                      : 'bg-transparent text-[#525855] dark:text-[#A6D6C9] border-transparent hover:text-[#171717] dark:hover:text-[#F8F3E8] hover:bg-black/5 dark:hover:bg-white/5 mb-0'
                  }`}
                >
                  {isActive && (
                    <span
                      aria-hidden="true"
                      className="absolute inset-x-0 top-0 h-[3px] bg-[#D9AC45] rounded-t-xs"
                    />
                  )}
                  {tab.icon && (
                    <span className={isActive ? 'text-[#06251D] dark:text-[#D9AC45]' : 'opacity-75'}>
                      {tab.icon}
                    </span>
                  )}
                  <span className="hidden sm:inline">{tab.label}</span>
                  <span className="sm:hidden">{tab.shortLabel || tab.label}</span>
                  {tab.badge !== undefined && tab.badge !== null && tab.badge !== '' && (
                    <span
                      className={`ml-0.5 px-1.5 py-0.2 rounded text-[10px] font-extrabold leading-tight ${
                        isActive
                          ? 'bg-[#06251D] text-[#D9AC45] dark:bg-[#D9AC45] dark:text-[#171717]'
                          : 'bg-[#171717]/10 text-[#171717] dark:bg-white/10 dark:text-[#F8F3E8]'
                      }`}
                    >
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {typeof wordCount === 'number' && (
            <div
              data-testid="editor-word-count"
              className="hidden md:flex items-center gap-1.5 pb-2 text-[11px] font-bold text-[#525855] dark:text-[#A6D6C9] shrink-0"
            >
              <span>{wordCount.toLocaleString('id-ID')} kata</span>
            </div>
          )}
        </div>

        {/* Inline Feedback Banner (Visible across all tabs) */}
        {feedback && (
          <div
            className={`px-4 sm:px-6 py-2.5 border-b-2 border-[#171717] text-xs font-bold flex items-center justify-between gap-2 shrink-0 animate-fade-in ${
              feedback.type === 'success'
                ? 'bg-[#D9AC45] text-[#171717]'
                : 'bg-[#F04438] text-white'
            }`}
          >
            <div className="flex items-center gap-2 min-w-0">
              {feedback.type === 'success' ? (
                <CheckCircle className="w-4 h-4 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0" />
              )}
              <span className="leading-snug">{feedback.text}</span>
            </div>
            {onDismissFeedback && (
              <button
                type="button"
                onClick={onDismissFeedback}
                className="p-1 rounded hover:bg-black/10 cursor-pointer shrink-0"
                aria-label="Tutup notifikasi"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        )}

        {/* Active Document / Page Viewport (All panels stay mounted to guarantee zero state loss on tab switch) */}
        <div
          data-testid="admin-editor-modal-main"
          className="flex-1 min-h-0 flex flex-col overflow-hidden bg-white dark:bg-[#0D2520] text-xs sm:text-sm"
        >
          {tabs.map((tab) => {
            const isActive = tab.id === activeTabId;
            return (
              <div
                key={tab.id}
                role="tabpanel"
                aria-hidden={!isActive}
                data-testid={`editor-panel-${tab.id}`}
                className={
                  isActive
                    ? 'flex-1 min-h-0 flex flex-col overflow-hidden animate-editor-page'
                    : 'hidden'
                }
              >
                {tab.content}
              </div>
            );
          })}
        </div>

        {/* Pinned Compact Neo-Brutalist Footer */}
        <div
          data-testid="admin-editor-modal-footer"
          className="px-3.5 py-2 sm:px-5 sm:py-2.5 lg:px-6 border-t-2 border-[#171717] dark:border-[#D9AC45]/45 bg-[#F8F3E8] dark:bg-[#06251D] shrink-0"
        >
          {footer}
        </div>
      </div>
    </div>
  );
};
