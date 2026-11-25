export const GLOBAL_AOS_CONFIG = {
  animation: 'fade-up' as const,
  duration: 600,
  easing: 'ease-out-cubic' as const,
  once: false,
  mirror: true,
  offset: 48,
  /**
   * Vertical lift distance in px (must stay synced with CSS translate3d(0, 28px, 0)).
   * Used to enforce mathematically flicker-proof hysteresis when resetting at top/bottom edges.
   */
  translateY: 28,
  /**
   * Top-edge reset buffer (strictly greater than translateY so applying +28px downward shift
   * when resetting an element above the top edge never pushes it back into the reveal zone).
   */
  topExitBuffer: 40,
  /**
   * Bottom-edge reset buffer (element must be completely below viewport + 16px).
   */
  bottomExitBuffer: 16,
  /**
   * Top-edge re-entry threshold when scrolling back up.
   */
  topEnterThreshold: 36,
  rootMargin: '96px 0px 96px 0px',
  threshold: [0, 0.05, 0.15] as number[],
  staggerStep: 50,
  maxStaggerDelay: 150,
};

export interface AosDebugStatus {
  initialized: boolean;
  enabled: boolean;
  reducedMotion: boolean;
  totalNodes: number;
  animatedNodes: number;
  settledNodes: number;
  pendingPaintNodes: number;
  hiddenNodes: number;
  viewportHeight: number;
  scrollY: number;
}

declare global {
  interface Window {
    __DARS_AOS__?: {
      getStatus: () => AosDebugStatus;
      refresh: () => void;
      replayVisible: () => void;
    };
  }
}

/**
 * Computes a light, row-bounded stagger delay (0, 50, 100, 150ms) so cards animate
 * gracefully without delaying content visibility in long grids.
 */
export function getAosDelay(index: number, columns = 4): number {
  if (index <= 0 || columns <= 1) return 0;
  return Math.min((index % columns) * GLOBAL_AOS_CONFIG.staggerStep, GLOBAL_AOS_CONFIG.maxStaggerDelay);
}

/**
 * Pure viewport visibility check used for first-load reveal, Lenis/native scroll sync,
 * and bidirectional repeat (mirror: true, once: false).
 *
 * Designed with clean hysteresis relative to shouldResetElementInViewport():
 * - Normal elements trigger once comfortably inside the viewport (not on the first 1px sliver).
 * - Very tall elements (>85% viewport height) remain visible whenever intersecting the viewport.
 */
export function isElementVisibleInViewport(
  rect: { top: number; bottom: number; height: number },
  viewportHeight: number,
  bottomOffsetPx: number = GLOBAL_AOS_CONFIG.offset,
  isInitialTopReveal = false
): boolean {
  if (viewportHeight <= 0) return true;
  if (rect.height <= 0) return false;

  if (isInitialTopReveal) {
    return rect.top <= viewportHeight - 16 && rect.bottom >= 16;
  }

  // Never hide elements taller than ~85% of viewport while intersecting the screen
  const isTallElement = rect.height > viewportHeight * 0.85;
  const effectiveBottomOffset = isTallElement
    ? Math.min(24, bottomOffsetPx)
    : Math.min(bottomOffsetPx, Math.round(viewportHeight * 0.12));

  const entersFromBottom = rect.top <= viewportHeight - effectiveBottomOffset;
  const staysBelowTop = rect.bottom >= (isTallElement ? 12 : GLOBAL_AOS_CONFIG.topEnterThreshold);

  return entersFromBottom && staysBelowTop;
}

/**
 * Pure hysteresis exit check: returns true ONLY when an element has completely left
 * the viewport past the safe buffer (so adding +28px hidden transform never causes
 * boundary oscillation/flicker on either top or bottom edge).
 */
export function shouldResetElementInViewport(
  rect: { top: number; bottom: number; height: number },
  viewportHeight: number
): boolean {
  if (viewportHeight <= 0 || rect.height <= 0) return false;
  const leftAboveTop = rect.bottom <= -GLOBAL_AOS_CONFIG.topExitBuffer;
  const leftBelowBottom = rect.top >= viewportHeight + GLOBAL_AOS_CONFIG.bottomExitBuffer;
  return leftAboveTop || leftBelowBottom;
}

class GlobalAOSController {
  private initialized = false;
  private observer: IntersectionObserver | null = null;
  private mutationObserver: MutationObserver | null = null;
  private observedElements = new WeakSet<Element>();
  /**
   * Nodes newly discovered in the DOM that MUST paint at least 1 full frame in their
   * hidden state (opacity: 0; translate3d(0, 28px, 0)) before `.aos-animate` can be added.
   * This prevents the browser from collapsing initial-load and SPA-mount transitions into 0ms.
   */
  private pendingPaintNodes = new Set<HTMLElement>();
  private settleTimers = new WeakMap<HTMLElement, number>();
  private reducedMotionQuery: MediaQueryList | null = null;
  private isReducedMotion = false;
  private scrollRafId: number | null = null;
  private paintBarrierRaf1: number | null = null;
  private paintBarrierRaf2: number | null = null;
  private refreshTimerId: number | null = null;
  private safetyTimers: number[] = [];

  private handleReducedMotionChange = (e: MediaQueryListEvent) => {
    this.isReducedMotion = e.matches;
    this.applyReducedMotionState();
  };

  private handleAnyScroll = () => {
    this.scheduleViewportSync();
  };

  private handleResize = () => {
    this.scheduleRefresh(80);
  };

  private handleWindowLoad = () => {
    this.refreshHard();
  };

  private handlePageShow = () => {
    this.refreshHard();
  };

  public isInitialized(): boolean {
    return this.initialized;
  }

  public init(): void {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;
    if (this.initialized) {
      this.refresh();
      return;
    }

    // Progressive enhancement guard: if IntersectionObserver is unsupported,
    // leave html.aos-enabled OFF so CSS keeps all content visible (opacity: 1).
    if (typeof window.IntersectionObserver === 'undefined') {
      document.documentElement.classList.remove('aos-enabled');
      this.revealAllImmediately();
      return;
    }

    try {
      this.initialized = true;

      if (typeof window.matchMedia === 'function') {
        this.reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
        this.isReducedMotion = this.reducedMotionQuery.matches;
        if (typeof this.reducedMotionQuery.addEventListener === 'function') {
          this.reducedMotionQuery.addEventListener('change', this.handleReducedMotionChange);
        } else if (typeof this.reducedMotionQuery.addListener === 'function') {
          this.reducedMotionQuery.addListener(this.handleReducedMotionChange);
        }
      }

      document.body?.setAttribute('data-aos-easing', GLOBAL_AOS_CONFIG.easing);
      document.body?.setAttribute('data-aos-duration', String(GLOBAL_AOS_CONFIG.duration));
      document.body?.setAttribute('data-aos-delay', '0');

      this.applyReducedMotionState();

      // IntersectionObserver acts strictly as a low-overhead wakeup signal;
      // ALL reveal/reset state changes go through syncViewportElements() so IO and scroll
      // never disagree on thresholds or bypass the paint barrier.
      this.observer = new IntersectionObserver(
        () => {
          if (this.isReducedMotion) return;
          this.scheduleViewportSync();
        },
        {
          root: null,
          rootMargin: GLOBAL_AOS_CONFIG.rootMargin,
          threshold: GLOBAL_AOS_CONFIG.threshold,
        }
      );

      // Register existing DOM nodes behind the paint barrier so initial above-the-fold
      // content paints 1 frame hidden (opacity: 0; translateY(28px)) before animating in!
      this.discoverAndStageNodes();

      // Observe dynamic DOM additions (SPA route switches, async Firebase loads, filter/tab updates)
      if (typeof MutationObserver !== 'undefined' && document.body) {
        this.mutationObserver = new MutationObserver((mutations) => {
          let hasAddedAosNodes = false;
          for (const mutation of mutations) {
            if (mutation.addedNodes.length > 0) {
              for (let i = 0; i < mutation.addedNodes.length; i++) {
                const node = mutation.addedNodes[i];
                if (node.nodeType === 1) {
                  const el = node as Element;
                  if (el.hasAttribute('data-aos') || el.querySelector?.('[data-aos]')) {
                    hasAddedAosNodes = true;
                    break;
                  }
                }
              }
            }
            if (hasAddedAosNodes) break;
          }

          if (hasAddedAosNodes) {
            this.discoverAndStageNodes();
          }
        });

        this.mutationObserver.observe(document.body, {
          childList: true,
          subtree: true,
        });
      }

      // Listen on both window AND capture-phase document so window scroll, Lenis scroll,
      // iframe scroll, AND inner overflow-y:auto containers all stay synchronized!
      window.addEventListener('scroll', this.handleAnyScroll, { passive: true });
      document.addEventListener('scroll', this.handleAnyScroll, { capture: true, passive: true });
      window.addEventListener('resize', this.handleResize, { passive: true });
      window.addEventListener('orientationchange', this.handleResize, { passive: true });
      window.addEventListener('load', this.handleWindowLoad, { passive: true });
      window.addEventListener('pageshow', this.handlePageShow, { passive: true });

      if (document.fonts && typeof document.fonts.ready?.then === 'function') {
        document.fonts.ready.then(() => {
          this.scheduleViewportSync();
        });
      }

      // Safety sweeps after layout/images settle so no visible element can EVER stay stuck hidden
      this.clearSafetyTimers();
      this.safetyTimers.push(
        window.setTimeout(() => this.flushPendingAndSync(true), 360),
        window.setTimeout(() => this.flushPendingAndSync(true), 950),
        window.setTimeout(() => this.flushPendingAndSync(true), 1800)
      );

      // Lightweight diagnostic hook (zero console noise for visitors)
      window.__DARS_AOS__ = {
        getStatus: () => this.getStatus(),
        refresh: () => this.refreshHard(),
        replayVisible: () => this.replayVisible(),
      };
    } catch {
      // Fallback: if anything throws during init, disable AOS hiding so all content stays visible
      document.documentElement.classList.remove('aos-enabled');
      this.revealAllImmediately();
    }
  }

  private clearSafetyTimers(): void {
    if (typeof window === 'undefined') return;
    this.safetyTimers.forEach((id) => window.clearTimeout(id));
    this.safetyTimers = [];
  }

  private applyReducedMotionState(): void {
    if (typeof document === 'undefined') return;
    if (this.isReducedMotion) {
      document.documentElement.classList.add('aos-reduced-motion');
      document.documentElement.classList.remove('aos-enabled');
      this.pendingPaintNodes.clear();
      this.revealAllImmediately();
    } else {
      document.documentElement.classList.remove('aos-reduced-motion');
      document.documentElement.classList.add('aos-enabled');
    }
  }

  private revealAllImmediately(): void {
    if (typeof document === 'undefined') return;
    const nodes = document.querySelectorAll('[data-aos]');
    nodes.forEach((node) => {
      node.classList.add('aos-init', 'aos-animate', 'aos-settled');
    });
  }

  private scheduleSettle(el: HTMLElement): void {
    if (typeof window === 'undefined') return;
    const existing = this.settleTimers.get(el);
    if (existing !== undefined) {
      window.clearTimeout(existing);
    }
    const rawDelay = Number(el.getAttribute('data-aos-delay') || '0');
    const delayMs = Number.isFinite(rawDelay) && rawDelay > 0 ? rawDelay : 0;
    const settleAfterMs = GLOBAL_AOS_CONFIG.duration + delayMs + 60;
    const timerId = window.setTimeout(() => {
      this.settleTimers.delete(el);
      if (el.classList.contains('aos-animate')) {
        el.classList.add('aos-settled');
      }
    }, settleAfterMs);
    this.settleTimers.set(el, timerId);
  }

  private clearSettle(el: HTMLElement): void {
    if (typeof window === 'undefined') return;
    const existing = this.settleTimers.get(el);
    if (existing !== undefined) {
      window.clearTimeout(existing);
      this.settleTimers.delete(el);
    }
    el.classList.remove('aos-settled');
  }

  private markAnimated(el: HTMLElement): void {
    if (el.classList.contains('aos-animate')) return;
    el.classList.remove('aos-settled');
    el.classList.add('aos-animate');
    this.scheduleSettle(el);
  }

  private markHiddenReset(el: HTMLElement): void {
    if (!el.classList.contains('aos-animate')) return;
    this.clearSettle(el);
    el.classList.remove('aos-animate');
  }

  /**
   * Discovers newly mounted [data-aos] nodes and stages them behind a double-rAF paint barrier.
   * This guarantees the browser commits & paints opacity:0 + translate3d(0,28px,0) for at least
   * one rendered frame before `.aos-animate` is applied, making initial-load, route-switch, and
   * async Firebase fade-up animations 100% visible.
   */
  private discoverAndStageNodes(): void {
    if (typeof document === 'undefined') return;
    const nodes = document.querySelectorAll('[data-aos]');
    let stagedCount = 0;

    nodes.forEach((node) => {
      const el = node as HTMLElement;
      const isNew = !this.observedElements.has(el);
      if (!isNew) return;

      el.classList.add('aos-init');
      this.observedElements.add(el);

      if (this.isReducedMotion) {
        el.classList.add('aos-animate', 'aos-settled');
        return;
      }

      // Ensure new nodes start cleanly in the un-animated initial state
      el.classList.remove('aos-animate', 'aos-settled');
      this.pendingPaintNodes.add(el);
      stagedCount += 1;

      if (this.observer) {
        this.observer.observe(el);
      }
    });

    if (stagedCount > 0) {
      this.schedulePaintBarrierFlush();
    }
  }

  private schedulePaintBarrierFlush(): void {
    if (typeof window === 'undefined') return;
    if (this.paintBarrierRaf1 !== null || this.paintBarrierRaf2 !== null) return;

    const raf =
      typeof window.requestAnimationFrame === 'function'
        ? window.requestAnimationFrame.bind(window)
        : (cb: FrameRequestCallback) => window.setTimeout(() => cb(Date.now()), 16);

    // Frame 1: force style commitment of the hidden state (opacity: 0; translate3d(0, 28px, 0))
    this.paintBarrierRaf1 = raf(() => {
      this.paintBarrierRaf1 = null;
      if (typeof document !== 'undefined' && document.documentElement) {
        // Trigger a single synchronous style/layout flush so the browser establishes
        // opacity: 0; translate3d(0, 28px, 0) as the CSS transition "before-change" style.
        void document.documentElement.offsetHeight;
      }

      // Frame 2: release pending nodes and reveal everything currently inside the viewport
      this.paintBarrierRaf2 = raf(() => {
        this.paintBarrierRaf2 = null;
        this.flushPendingAndSync(true);
      });
    });
  }

  private flushPendingAndSync(isInitialReveal = false): void {
    if (this.pendingPaintNodes.size > 0) {
      this.pendingPaintNodes.clear();
    }
    this.syncViewportElements(isInitialReveal, isInitialReveal);
  }

  /**
   * Synchronizes all eligible [data-aos] nodes against live viewport coordinates.
   * Works identically with desktop mouse wheel, trackpad, scrollbar drag, Lenis smooth scroll,
   * capture-phase inner scroll containers, and mobile touch gestures.
   */
  public syncViewportElements(revealOnly = false, allowInitialTopReveal = false): void {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;
    if (this.isReducedMotion) {
      this.revealAllImmediately();
      return;
    }

    const viewportHeight = window.innerHeight || document.documentElement.clientHeight || 0;
    if (viewportHeight <= 0) return;

    const scrollY = window.scrollY || window.pageYOffset || document.documentElement.scrollTop || 0;
    const isInitialTopReveal = allowInitialTopReveal && scrollY <= 12;

    const nodes = document.querySelectorAll('[data-aos]');
    nodes.forEach((node) => {
      const el = node as HTMLElement;

      // Never prematurely animate a brand-new node still waiting for its initial hidden frame paint
      if (this.pendingPaintNodes.has(el)) {
        return;
      }

      if (!this.observedElements.has(el)) {
        // Newly encountered node not yet staged: stage it safely so it animates smoothly
        el.classList.add('aos-init');
        this.observedElements.add(el);
        this.pendingPaintNodes.add(el);
        if (this.observer) {
          this.observer.observe(el);
        }
        this.schedulePaintBarrierFlush();
        return;
      }

      const rect = el.getBoundingClientRect();
      // Skip display:none / collapsed zero-size elements
      if (rect.width === 0 && rect.height === 0) return;

      const isCurrentlyAnimated = el.classList.contains('aos-animate');

      if (!isCurrentlyAnimated) {
        const shouldReveal = isElementVisibleInViewport(
          rect,
          viewportHeight,
          GLOBAL_AOS_CONFIG.offset,
          isInitialTopReveal
        );
        if (shouldReveal) {
          this.markAnimated(el);
        }
      } else if (!revealOnly && !GLOBAL_AOS_CONFIG.once && GLOBAL_AOS_CONFIG.mirror) {
        if (shouldResetElementInViewport(rect, viewportHeight)) {
          this.markHiddenReset(el);
        }
      }
    });
  }

  public scheduleViewportSync(): void {
    if (typeof window === 'undefined' || this.isReducedMotion) return;
    if (this.scrollRafId !== null) return;

    const raf =
      typeof window.requestAnimationFrame === 'function'
        ? window.requestAnimationFrame.bind(window)
        : (cb: FrameRequestCallback) => window.setTimeout(() => cb(Date.now()), 16);

    this.scrollRafId = raf(() => {
      this.scrollRafId = null;
      this.syncViewportElements(false, false);
    });
  }

  private scheduleRefresh(delayMs = 60): void {
    if (typeof window === 'undefined') return;
    if (this.refreshTimerId !== null) {
      window.clearTimeout(this.refreshTimerId);
    }
    this.refreshTimerId = window.setTimeout(() => {
      this.refreshTimerId = null;
      this.refresh();
    }, delayMs);
  }

  public refresh(): void {
    if (!this.initialized) return;
    this.discoverAndStageNodes();
    this.scheduleViewportSync();
  }

  public refreshHard(): void {
    if (!this.initialized) {
      this.init();
      return;
    }
    this.discoverAndStageNodes();
    if (typeof window !== 'undefined') {
      const raf =
        typeof window.requestAnimationFrame === 'function'
          ? window.requestAnimationFrame.bind(window)
          : (cb: FrameRequestCallback) => window.setTimeout(() => cb(Date.now()), 16);

      raf(() => {
        raf(() => {
          this.syncViewportElements(false, true);
        });
      });

      this.clearSafetyTimers();
      this.safetyTimers.push(
        window.setTimeout(() => this.flushPendingAndSync(true), 420)
      );
    }
  }

  /**
   * Diagnostic / manual helper to replay fade-up on currently visible nodes.
   */
  public replayVisible(): void {
    if (typeof document === 'undefined' || this.isReducedMotion) return;
    const nodes = document.querySelectorAll('[data-aos]');
    nodes.forEach((node) => {
      const el = node as HTMLElement;
      this.clearSettle(el);
      el.classList.remove('aos-animate');
      this.pendingPaintNodes.add(el);
    });
    this.schedulePaintBarrierFlush();
  }

  public getStatus(): AosDebugStatus {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      return {
        initialized: this.initialized,
        enabled: false,
        reducedMotion: this.isReducedMotion,
        totalNodes: 0,
        animatedNodes: 0,
        settledNodes: 0,
        pendingPaintNodes: this.pendingPaintNodes.size,
        hiddenNodes: 0,
        viewportHeight: 0,
        scrollY: 0,
      };
    }

    const nodes = Array.from(document.querySelectorAll('[data-aos]'));
    const animatedNodes = nodes.filter((n) => n.classList.contains('aos-animate')).length;
    const settledNodes = nodes.filter((n) => n.classList.contains('aos-settled')).length;
    return {
      initialized: this.initialized,
      enabled: document.documentElement.classList.contains('aos-enabled'),
      reducedMotion: this.isReducedMotion,
      totalNodes: nodes.length,
      animatedNodes,
      settledNodes,
      pendingPaintNodes: this.pendingPaintNodes.size,
      hiddenNodes: nodes.length - animatedNodes,
      viewportHeight: window.innerHeight || document.documentElement.clientHeight || 0,
      scrollY: window.scrollY || window.pageYOffset || 0,
    };
  }

  public destroy(): void {
    if (typeof window !== 'undefined') {
      window.removeEventListener('scroll', this.handleAnyScroll);
      window.removeEventListener('resize', this.handleResize);
      window.removeEventListener('orientationchange', this.handleResize);
      window.removeEventListener('load', this.handleWindowLoad);
      window.removeEventListener('pageshow', this.handlePageShow);

      if (this.scrollRafId !== null && typeof window.cancelAnimationFrame === 'function') {
        window.cancelAnimationFrame(this.scrollRafId);
        this.scrollRafId = null;
      }
      if (this.paintBarrierRaf1 !== null && typeof window.cancelAnimationFrame === 'function') {
        window.cancelAnimationFrame(this.paintBarrierRaf1);
        this.paintBarrierRaf1 = null;
      }
      if (this.paintBarrierRaf2 !== null && typeof window.cancelAnimationFrame === 'function') {
        window.cancelAnimationFrame(this.paintBarrierRaf2);
        this.paintBarrierRaf2 = null;
      }
      if (this.refreshTimerId !== null) {
        window.clearTimeout(this.refreshTimerId);
        this.refreshTimerId = null;
      }
      this.clearSafetyTimers();
      delete window.__DARS_AOS__;
    }

    if (typeof document !== 'undefined') {
      document.removeEventListener('scroll', this.handleAnyScroll, true);
    }

    if (this.reducedMotionQuery) {
      if (typeof this.reducedMotionQuery.removeEventListener === 'function') {
        this.reducedMotionQuery.removeEventListener('change', this.handleReducedMotionChange);
      } else if (typeof this.reducedMotionQuery.removeListener === 'function') {
        this.reducedMotionQuery.removeListener(this.handleReducedMotionChange);
      }
    }

    this.observer?.disconnect();
    this.observer = null;
    this.mutationObserver?.disconnect();
    this.mutationObserver = null;
    this.observedElements = new WeakSet<Element>();
    this.pendingPaintNodes.clear();
    this.initialized = false;
  }
}

const controller = new GlobalAOSController();

export function initGlobalAOS(): void {
  controller.init();
}

export function refreshGlobalAOS(): void {
  controller.refresh();
}

export function refreshHardGlobalAOS(): void {
  controller.refreshHard();
}

export function notifyGlobalAOSScroll(): void {
  controller.scheduleViewportSync();
}

export function isGlobalAOSInitialized(): boolean {
  return controller.isInitialized();
}

export function getGlobalAOSStatus(): AosDebugStatus {
  return controller.getStatus();
}

export function destroyGlobalAOS(): void {
  controller.destroy();
}
