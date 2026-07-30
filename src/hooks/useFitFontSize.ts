import { type RefObject, useEffect, useMemo, useState } from 'react';
import { getReferenceSize } from '../lib/utils.js';

interface FitFontSizeOptions {
  maxWidth?: number;
  paddingX?: number;
  heightFraction?: number;
}

export function useFitFontSize(
  containerRef: RefObject<HTMLElement | null>,
  text: string,
  desiredFontSize: number,
  options: FitFontSizeOptions = {}
) {
  const { maxWidth = Infinity, paddingX = 128, heightFraction = 0.85 } = options;
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setContainerSize({ width, height });
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [containerRef]);

  const effectiveFontSize = useMemo(() => {
    const { width: cw, height: ch } = containerSize;
    if (ch <= 0 || !text) return desiredFontSize;
    const innerWidth = Math.min(cw - paddingX, maxWidth);
    const lines = text.split('\n');
    let lo = 12;
    let hi = desiredFontSize;
    let best = 12;
    while (lo <= hi) {
      const mid = Math.floor((lo + hi) / 2);
      const charsPerLine = innerWidth / (mid * 0.6);
      let totalLines = 0;
      for (const line of lines) {
        if (line.length === 0) {
          totalLines += 1;
        } else {
          totalLines += Math.max(1, Math.ceil(line.length / charsPerLine));
        }
      }
      const refHeight = getReferenceSize(mid) + 32;
      const textHeight = totalLines * mid * 1.375 + (totalLines - 1) * 16;
      const total = refHeight + textHeight;
      if (total <= ch * heightFraction) {
        best = mid;
        lo = mid + 1;
      } else {
        hi = mid - 1;
      }
    }
    return best;
  }, [containerSize, text, desiredFontSize, maxWidth, paddingX, heightFraction]);

  const effectiveRefSize = useMemo(() => getReferenceSize(effectiveFontSize), [effectiveFontSize]);

  return { effectiveFontSize, effectiveRefSize };
}
