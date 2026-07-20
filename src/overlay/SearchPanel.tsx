import { Loader2, Search } from 'lucide-react';
import { useState } from 'react';
import type { SearchResult } from '../data/types.js';
import type { TFunction } from '../i18n.js';
import { ensureIndex, searchIndex } from '../search.js';

interface SearchPanelProps {
  fs: import('@lumen-media/module-sdk').FsAPI;
  version: string;
  t: TFunction;
}

export function SearchPanel({ fs, version, t }: SearchPanelProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [indexed, setIndexed] = useState(false);

  async function handleSearch() {
    if (!query.trim()) return;

    if (!indexed) {
      setLoading(true);
      await ensureIndex(fs, version);
      setIndexed(true);
      setLoading(false);
    }

    const r = searchIndex(query, version);
    setResults(r);
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          placeholder={`${t('bible.search')}...`}
          className="flex-1 rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
        />
        <button
          onClick={handleSearch}
          disabled={loading}
          className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
          {t('bible.search')}
        </button>
      </div>

      {!indexed && !loading && (
        <p className="text-xs text-muted-foreground">First search builds index from cached files</p>
      )}

      <div className="space-y-1">
        {results.map((r) => (
          <div key={r.id} className="rounded-md border border-border bg-card px-3 py-2 text-sm">
            <span className="font-medium text-card-foreground">
              {r.book} {r.chapter}:{r.verse}
            </span>
            <span className="ml-1.5 text-xs text-muted-foreground">({r.version})</span>
            <p className="mt-0.5 text-muted-foreground">{r.text}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
