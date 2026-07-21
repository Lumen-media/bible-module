import { Button, Input } from '@lumen-media/module-sdk/ui';
import { Loader2, Search } from 'lucide-react';
import { useState } from 'react';
import { BOOKS } from '../data/store.js';
import { useBibleStore } from '../store.js';
import { parseReference } from '../data/ref.js';

interface SearchPanelProps {
  t: (key: string) => string;
}

export function SearchPanel({ t }: SearchPanelProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<{ book: string; chapter: number; verse: number; text: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const search = useBibleStore((s) => s.search);
  const goTo = useBibleStore((s) => s.goTo);
  const setTab = useBibleStore((s) => s.setTab);

  async function handleSearch() {
    if (!query.trim()) return;

    const ref = parseReference(query, BOOKS);
    if (ref) {
      setTab('browse');
      goTo(ref.book, ref.chapter, ref.verse);
      return;
    }

    setLoading(true);
    const r = await search(query);
    setResults(r);
    setLoading(false);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          placeholder={`${t('bible.search')}...`}
          className="flex-1"
        />
        <Button onClick={handleSearch} disabled={loading}>
          {loading ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Search className="mr-1 h-4 w-4" />}
          {t('bible.search')}
        </Button>
      </div>

      <div className="space-y-1">
        {results.map((r, i) => (
          <div key={i} className="rounded-md border border-border bg-card px-3 py-2 text-sm">
            <span className="font-medium text-card-foreground">
              {r.book} {r.chapter}:{r.verse}
            </span>
            <p className="mt-0.5 text-muted-foreground">{r.text}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
