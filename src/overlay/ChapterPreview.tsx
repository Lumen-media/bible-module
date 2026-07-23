import { ScrollArea } from '@lumen-media/module-sdk/ui';
import { Loader2 } from 'lucide-react';
import { cn } from '../lib/utils.js';
import { useBibleStore } from '../store.js';

export function ChapterPreview() {
  const verses = useBibleStore((s) => s.verses);
  const versesLoading = useBibleStore((s) => s.versesLoading);
  const selectedVerse = useBibleStore((s) => s.selectedVerse);
  const setSelectedVerse = useBibleStore((s) => s.setSelectedVerse);

  if (versesLoading) {
    return (
      <div className="flex h-72 items-center justify-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
      </div>
    );
  }

  if (!verses || verses.length === 0) {
    return (
      <div className="flex h-72 items-center justify-center text-sm text-muted-foreground">—</div>
    );
  }

  return (
    <ScrollArea className="h-72 pr-3">
      <div className="grid grid-cols-[repeat(auto-fill,minmax(40px,1fr))] gap-1.5">
        {verses.map((v) => (
          <button
            key={v.number}
            type="button"
            onClick={() => setSelectedVerse(v.number)}
            className={cn(
              'flex aspect-square items-center justify-center rounded-md border text-sm font-medium transition-colors',
              selectedVerse === v.number
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-border bg-background text-card-foreground hover:border-primary/40 hover:bg-accent/40'
            )}
          >
            {v.number}
          </button>
        ))}
      </div>
    </ScrollArea>
  );
}
