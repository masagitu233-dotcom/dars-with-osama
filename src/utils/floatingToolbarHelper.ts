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
  minTopBoundary?: number; // Minimum distance from viewport top (e.g. 70px to clear sticky header)
  padding?: number; // Minimum padding from left/right viewport edges
  offset?: number; // Distance in pixels from the selection boundary
}

/**
 * Calculates clamped viewport coordinates for the floating contextual toolbar.
 * Ensures the toolbar stays within viewport bounds and flips above/below selection appropriately.
 */
export function calculateFloatingToolbarPosition(
  selectionRect: SelectionRect,
  toolbarDimensions: { width: number; height: number },
  viewportDimensions: { width: number; height: number },
  options: CalculatePositionOptions = {}
): FloatingToolbarPositionResult {
  const { minTopBoundary = 70, padding = 12, offset = 8 } = options;
  const { width: tWidth, height: tHeight } = toolbarDimensions;
  const { width: vWidth, height: vHeight } = viewportDimensions;

  // If selection is zero-size or completely outside viewport
  if (
    selectionRect.bottom <= minTopBoundary ||
    selectionRect.top >= vHeight ||
    selectionRect.right <= 0 ||
    selectionRect.left >= vWidth
  ) {
    return { top: 0, left: 0, placement: 'top', isVisible: false };
  }

  // Calculate horizontal center
  const selCenter = selectionRect.left + selectionRect.width / 2;
  let left = selCenter - tWidth / 2;

  // Clamp within viewport
  const maxLeft = Math.max(padding, vWidth - tWidth - padding);
  if (left < padding) {
    left = padding;
  } else if (left > maxLeft) {
    left = maxLeft;
  }

  // Vertical placement: prefer ABOVE selection if enough space above minTopBoundary
  let top: number;
  let placement: 'top' | 'bottom';

  const spaceAbove = selectionRect.top - minTopBoundary;
  const neededHeight = tHeight + offset;

  if (spaceAbove >= neededHeight) {
    top = selectionRect.top - neededHeight;
    placement = 'top';
  } else {
    // Place below selection
    top = selectionRect.bottom + offset;
    placement = 'bottom';

    // If placing below exceeds viewport bottom, clamp it
    if (top + tHeight > vHeight - padding) {
      top = Math.max(minTopBoundary, vHeight - tHeight - padding);
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
