import { BookOpen } from 'lucide-react';
import type { Book } from '../data/types.js';
import { useBibleStore } from '../store.js';

interface BookGridProps {
  books: Book[];
  onSelect: (book: Book) => void;
}

const ABBREVIATIONS: Record<string, string> = {
  genesis: 'Gn',
  exodus: 'Êx',
  leviticus: 'Lv',
  numbers: 'Nm',
  deuteronomy: 'Dt',
  joshua: 'Js',
  judges: 'Jz',
  ruth: 'Rt',
  '1samuel': '1Sm',
  '2samuel': '2Sm',
  '1kings': '1Rs',
  '2kings': '2Rs',
  '1chronicles': '1Cr',
  '2chronicles': '2Cr',
  ezra: 'Ed',
  nehemiah: 'Ne',
  esther: 'Et',
  job: 'Jó',
  psalms: 'Sl',
  proverbs: 'Pv',
  ecclesiastes: 'Ec',
  songofsolomon: 'Ct',
  isaiah: 'Is',
  jeremiah: 'Jr',
  lamentations: 'Lm',
  ezekiel: 'Ez',
  daniel: 'Dn',
  hosea: 'Os',
  joel: 'Jl',
  amos: 'Am',
  obadiah: 'Ob',
  jonah: 'Jn',
  micah: 'Mq',
  nahum: 'Na',
  habakkuk: 'Hc',
  zephaniah: 'Sf',
  haggai: 'Ag',
  zechariah: 'Zc',
  malachi: 'Ml',
  matthew: 'Mt',
  mark: 'Mc',
  luke: 'Lc',
  john: 'Jo',
  acts: 'At',
  romans: 'Rm',
  '1corinthians': '1Co',
  '2corinthians': '2Co',
  galatians: 'Gl',
  ephesians: 'Ef',
  philippians: 'Fp',
  colossians: 'Cl',
  '1thessalonians': '1Ts',
  '2thessalonians': '2Ts',
  '1timothy': '1Tm',
  '2timothy': '2Tm',
  titus: 'Tt',
  philemon: 'Fm',
  hebrews: 'Hb',
  james: 'Tg',
  '1peter': '1Pe',
  '2peter': '2Pe',
  '1john': '1Jo',
  '2john': '2Jo',
  '3john': '3Jo',
  jude: 'Jd',
  revelation: 'Ap',
};

export function BookGrid({ books, onSelect }: BookGridProps) {
  const t = useBibleStore((s) => s.t);
  const selectedBook = useBibleStore((s) => s.selectedBook);
  const oldBooks = books.filter((b) => b.testament === 'old');
  const newBooks = books.filter((b) => b.testament === 'new');

  function renderSection(title: string, items: Book[]) {
    return (
      <div>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {title}
        </h3>
        <div className="grid grid-cols-[repeat(auto-fill,minmax(100px,1fr))] gap-2">
          {items.map((book) => (
            <button
              key={book.id}
              onClick={() => onSelect(book)}
              className={`flex flex-col items-center gap-1 rounded-lg border p-3 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground ${
                selectedBook?.id === book.id
                  ? 'border-primary bg-accent text-accent-foreground'
                  : 'border-border bg-card text-card-foreground'
              }`}
              title={book.name}
            >
              <span className="text-xs text-muted-foreground">
                {ABBREVIATIONS[book.id] ?? book.id.slice(0, 3)}
              </span>
              <span className="line-clamp-2 text-center text-xs leading-tight">
                {book.name}
              </span>
              <span className="text-[10px] text-muted-foreground/60">
                {book.chapters}
              </span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {renderSection(t('bible.old-testament'), oldBooks)}
      {renderSection(t('bible.new-testament'), newBooks)}
    </div>
  );
}
