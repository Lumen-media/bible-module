import { ScrollArea } from '@lumen-media/module-sdk/ui';
import { useVirtualizer } from '@tanstack/react-virtual';
import { forwardRef, memo, useImperativeHandle, useRef } from 'react';
import { type TFunction, tForVersion } from '../i18n.js';
import { displayVersion } from '../lib/utils.js';
import { staticVersionLanguage } from '../store.js';

export interface VerseCardItem {
  id: string;
  version: string;
  book: string;
  chapter: number;
  verse: number;
  verseEnd?: number;
  text?: string;
}

export interface VersesListHandle {
  scrollToIndex: (index: number, options?: { align?: 'start' | 'center' | 'end' | 'auto' }) => void;
}

interface VersesListProps {
  items: VerseCardItem[];
  t: TFunction;
  emptyMessage?: string;
  focusedIndex?: number;
  onFocusIndex?: (index: number) => void;
  onClick: (index: number) => void;
  suffix?: (index: number) => React.ReactNode;
  estimateHeight?: number;
  gap?: number;
  overscan?: number;
}

const VersesListInner = forwardRef<VersesListHandle, VersesListProps>(function VersesListInner(
  {
    items,
    emptyMessage,
    focusedIndex = -1,
    onFocusIndex,
    onClick,
    suffix,
    estimateHeight = 72,
    gap = 6,
    overscan = 10,
  },
  ref
) {
  const viewportRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => viewportRef.current,
    estimateSize: () => estimateHeight + gap,
    overscan,
  });

  useImperativeHandle(
    ref,
    () => ({
      scrollToIndex: (index, options) => {
        virtualizer.scrollToIndex(index, options);
      },
    }),
    [virtualizer]
  );

  if (items.length === 0 && emptyMessage) {
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center py-16 text-muted-foreground">
        {emptyMessage}
      </div>
    );
  }

  return (
    <ScrollArea className="min-h-0 flex-1 px-3" viewportProps={{ ref: viewportRef }}>
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {virtualizer.getVirtualItems().map((virtualItem) => {
          const r = items[virtualItem.index];
          const isFocused = virtualItem.index === focusedIndex;
          return (
            <div
              key={r.id}
              data-index={virtualItem.index}
              className="absolute left-0 top-0 w-full"
              style={{
                transform: `translateY(${virtualItem.start}px)`,
                height: `${estimateHeight}px`,
                paddingBottom: `${gap}px`,
              }}
            >
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onClick(virtualItem.index);
                }}
                onMouseEnter={() => onFocusIndex?.(virtualItem.index)}
                className={`flex h-full w-full flex-col justify-center overflow-hidden rounded-md border px-3 py-2 text-left text-sm transition-colors outline-none focus:outline-none focus-visible:outline-none ${
                  isFocused
                    ? 'border-primary bg-accent text-accent-foreground'
                    : 'border-border bg-card text-card-foreground hover:bg-accent hover:text-accent-foreground'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="truncate font-medium">
                    {tForVersion(staticVersionLanguage(r.version), `book.${r.book}`)} {r.chapter}:
                    {r.verse}
                    {r.verseEnd != null && r.verseEnd !== r.verse ? `-${r.verseEnd}` : ''}
                  </span>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {displayVersion(r.version)}
                  </span>
                  {suffix && <span className="ml-auto shrink-0">{suffix(virtualItem.index)}</span>}
                </div>
                {r.text && <p className="mt-0.5 line-clamp-1 text-muted-foreground">{r.text}</p>}
              </button>
            </div>
          );
        })}
      </div>
    </ScrollArea>
  );
});

export const VersesList = memo(VersesListInner);
