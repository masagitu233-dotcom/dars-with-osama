/**
 * Floating Contextual Toolbar positioning and selection helper
 * Dars with Osama - Global Rich Text Editor Enhancement
 */

export interface SelectionRect {
  top: number;
  bottom: number;
  left: number;
  right: number;
  width: number;
  height: number;
}

export interface FloatingToolbarPositionResult {
  top: number;
  left: number;
  placement: 'top' | 'bottom';
  isVisible: boolean;
}

export interface CalculatePositionOptions {
  minTopBoundary?: number; // Minimum distance from viewport top (e.g. 70px to clear sticky header, or 12px in modal)
  padding?: number; // Minimum padding from left/right viewport edges
  offset?: number; // Distance in pixels from the selection boundary
  containerRect?: {
    top: number;
    bottom: number;
    left?: number;
    right?: number;
  }; // Optional bounding rect of the scroll container / modal body for clipping and collision avoidance
}

/**
 * Calculates clamped viewport coordinates for the floating contextual toolbar.
 * Ensures the toolbar stays directly above the selection (or below if headroom is restricted)
 * and stays within visible viewport and container bounds.
 */
export function calculateFloatingToolbarPosition(
  selectionRect: SelectionRect,
  toolbarDimensions: { width: number; height: number },
  viewportDimensions: { width: number; height: number },
  options: CalculatePositionOptions = {}
): FloatingToolbarPositionResult {
  const { minTopBoundary = 70, padding = 12, offset = 8, containerRect } = options;
  const { width: tWidth, height: tHeight } = toolbarDimensions;
  const { width: vWidth, height: vHeight } = viewportDimensions;

  // 1. If selection is completely outside viewport
  if (
    selectionRect.bottom <= 0 ||
    selectionRect.top >= vHeight ||
    selectionRect.right <= 0 ||
    selectionRect.left >= vWidth
  ) {
    return { top: 0, left: 0, placement: 'top', isVisible: false };
  }

  // 2. If a scroll container (e.g. modal body or editor wrapper) is specified,
  // ensure the selection has not scrolled out of its visible clipping window
  if (containerRect) {
    if (
      selectionRect.bottom <= containerRect.top ||
      selectionRect.top >= containerRect.bottom ||
      (containerRect.left !== undefined && selectionRect.right <= containerRect.left) ||
      (containerRect.right !== undefined && selectionRect.left >= containerRect.right)
    ) {
      return { top: 0, left: 0, placement: 'top', isVisible: false };
    }
  }

  // 3. If selection has scrolled behind sticky header (when outside modal)
  const effectiveMinTop = containerRect
    ? Math.max(minTopBoundary, containerRect.top)
    : minTopBoundary;

  if (!containerRect && selectionRect.bottom <= minTopBoundary) {
    return { top: 0, left: 0, placement: 'top', isVisible: false };
  }

  // 4. Calculate horizontal center directly over the selected text
  const selCenter = selectionRect.left + selectionRect.width / 2;
  let left = selCenter - tWidth / 2;

  // Clamp within viewport
  const maxLeft = Math.max(padding, vWidth - tWidth - padding);
  if (left < padding) {
    left = padding;
  } else if (left > maxLeft) {
    left = maxLeft;
  }

  // 5. Vertical placement: prefer placing directly ABOVE selection
  let top: number;
  let placement: 'top' | 'bottom';

  const spaceAbove = selectionRect.top - effectiveMinTop;
  const neededHeight = tHeight + offset;

  if (spaceAbove >= neededHeight) {
    // Placed directly above the first line of the selected text
    top = selectionRect.top - neededHeight;
    placement = 'top';
  } else {
    // Insufficient headroom above: flip directly below the selection
    top = selectionRect.bottom + offset;
    placement = 'bottom';

    // Clamp against bottom boundary
    const effectiveMaxBottom = containerRect
      ? Math.min(vHeight - padding, containerRect.bottom)
      : (vHeight - padding);

    if (top + tHeight > effectiveMaxBottom) {
      top = Math.max(effectiveMinTop, effectiveMaxBottom - tHeight);
    }
  }

  return {
    top: Math.round(top),
    left: Math.round(left),
    placement,
    isVisible: true
  };
}

/**
 * Checks if a selection is active, non-collapsed, and contains readable text
 */
export function isTextSelectionActive(
  selection: { isCollapsed: boolean; text: string } | null
): boolean {
  if (!selection) return false;
  if (selection.isCollapsed) return false;
  return selection.text.trim().length > 0;
}
