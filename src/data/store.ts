import type { DataAPI, FsAPI } from '@lumen-media/module-sdk';
import type { Book, Chapter, MidvashChapter, Verse } from './types.js';

export const BOOKS: Book[] = [
  { id: 'genesis', name: 'Gênesis', chapters: 50, testament: 'old' },
  { id: 'exodus', name: 'Êxodo', chapters: 40, testament: 'old' },
  { id: 'leviticus', name: 'Levítico', chapters: 27, testament: 'old' },
  { id: 'numbers', name: 'Números', chapters: 36, testament: 'old' },
  { id: 'deuteronomy', name: 'Deuteronômio', chapters: 34, testament: 'old' },
  { id: 'joshua', name: 'Josué', chapters: 24, testament: 'old' },
  { id: 'judges', name: 'Juízes', chapters: 21, testament: 'old' },
  { id: 'ruth', name: 'Rute', chapters: 4, testament: 'old' },
  { id: '1samuel', name: '1 Samuel', chapters: 31, testament: 'old' },
  { id: '2samuel', name: '2 Samuel', chapters: 24, testament: 'old' },
  { id: '1kings', name: '1 Reis', chapters: 22, testament: 'old' },
  { id: '2kings', name: '2 Reis', chapters: 25, testament: 'old' },
  { id: '1chronicles', name: '1 Crônicas', chapters: 29, testament: 'old' },
  { id: '2chronicles', name: '2 Crônicas', chapters: 36, testament: 'old' },
  { id: 'ezra', name: 'Esdras', chapters: 10, testament: 'old' },
  { id: 'nehemiah', name: 'Neemias', chapters: 13, testament: 'old' },
  { id: 'esther', name: 'Ester', chapters: 10, testament: 'old' },
  { id: 'job', name: 'Jó', chapters: 42, testament: 'old' },
  { id: 'psalms', name: 'Salmos', chapters: 150, testament: 'old' },
  { id: 'proverbs', name: 'Provérbios', chapters: 31, testament: 'old' },
  { id: 'ecclesiastes', name: 'Eclesiastes', chapters: 12, testament: 'old' },
  { id: 'songofsolomon', name: 'Cânticos', chapters: 8, testament: 'old' },
  { id: 'isaiah', name: 'Isaías', chapters: 66, testament: 'old' },
  { id: 'jeremiah', name: 'Jeremias', chapters: 52, testament: 'old' },
  { id: 'lamentations', name: 'Lamentações', chapters: 5, testament: 'old' },
  { id: 'ezekiel', name: 'Ezequiel', chapters: 48, testament: 'old' },
  { id: 'daniel', name: 'Daniel', chapters: 12, testament: 'old' },
  { id: 'hosea', name: 'Oséias', chapters: 14, testament: 'old' },
  { id: 'joel', name: 'Joel', chapters: 3, testament: 'old' },
  { id: 'amos', name: 'Amós', chapters: 9, testament: 'old' },
  { id: 'obadiah', name: 'Obadias', chapters: 1, testament: 'old' },
  { id: 'jonah', name: 'Jonas', chapters: 4, testament: 'old' },
  { id: 'micah', name: 'Miquéias', chapters: 7, testament: 'old' },
  { id: 'nahum', name: 'Naum', chapters: 3, testament: 'old' },
  { id: 'habakkuk', name: 'Habacuque', chapters: 3, testament: 'old' },
  { id: 'zephaniah', name: 'Sofonias', chapters: 3, testament: 'old' },
  { id: 'haggai', name: 'Ageu', chapters: 2, testament: 'old' },
  { id: 'zechariah', name: 'Zacarias', chapters: 14, testament: 'old' },
  { id: 'malachi', name: 'Malaquias', chapters: 4, testament: 'old' },
  { id: 'matthew', name: 'Mateus', chapters: 28, testament: 'new' },
  { id: 'mark', name: 'Marcos', chapters: 16, testament: 'new' },
  { id: 'luke', name: 'Lucas', chapters: 24, testament: 'new' },
  { id: 'john', name: 'João', chapters: 21, testament: 'new' },
  { id: 'acts', name: 'Atos', chapters: 28, testament: 'new' },
  { id: 'romans', name: 'Romanos', chapters: 16, testament: 'new' },
  { id: '1corinthians', name: '1 Coríntios', chapters: 16, testament: 'new' },
  { id: '2corinthians', name: '2 Coríntios', chapters: 13, testament: 'new' },
  { id: 'galatians', name: 'Gálatas', chapters: 6, testament: 'new' },
  { id: 'ephesians', name: 'Efésios', chapters: 6, testament: 'new' },
  { id: 'philippians', name: 'Filipenses', chapters: 4, testament: 'new' },
  { id: 'colossians', name: 'Colossenses', chapters: 4, testament: 'new' },
  { id: '1thessalonians', name: '1 Tessalonicenses', chapters: 5, testament: 'new' },
  { id: '2thessalonians', name: '2 Tessalonicenses', chapters: 3, testament: 'new' },
  { id: '1timothy', name: '1 Timóteo', chapters: 6, testament: 'new' },
  { id: '2timothy', name: '2 Timóteo', chapters: 4, testament: 'new' },
  { id: 'titus', name: 'Tito', chapters: 3, testament: 'new' },
  { id: 'philemon', name: 'Filemom', chapters: 1, testament: 'new' },
  { id: 'hebrews', name: 'Hebreus', chapters: 13, testament: 'new' },
  { id: 'james', name: 'Tiago', chapters: 5, testament: 'new' },
  { id: '1peter', name: '1 Pedro', chapters: 5, testament: 'new' },
  { id: '2peter', name: '2 Pedro', chapters: 3, testament: 'new' },
  { id: '1john', name: '1 João', chapters: 5, testament: 'new' },
  { id: '2john', name: '2 João', chapters: 1, testament: 'new' },
  { id: '3john', name: '3 João', chapters: 1, testament: 'new' },
  { id: 'jude', name: 'Judas', chapters: 1, testament: 'new' },
  { id: 'revelation', name: 'Apocalipse', chapters: 22, testament: 'new' },
];

function chapterPath(version: string, book: string, chapter: number): string {
  return `cache/${version}/${book}/${chapter}.json`;
}

export function versionCacheDir(version: string): string {
  return `cache/${version}`;
}

function decodeBytes(bytes: Uint8Array): string {
  return new TextDecoder().decode(bytes);
}

export async function getChapter(
  fs: FsAPI,
  version: string,
  book: string,
  chapter: number
): Promise<Chapter | null> {
  const path = chapterPath(version, book, chapter);
  const exists = await fs.exists(path).catch(() => false);
  if (!exists) return null;

  try {
    const bytes = await fs.read(path);
    const raw = decodeBytes(bytes);
    const data = JSON.parse(raw) as MidvashChapter;
    const verses = data.chapter.verses;
    const max = verses.length > 0 ? Math.max(...verses.map((v) => v.number)) : 0;
    const result: (Verse | null)[] = new Array(max + 1).fill(null);
    for (const v of verses) {
      result[v.number] = { number: v.number, text: v.text };
    }
    return { version, book, number: chapter, verses: result };
  } catch {
    return null;
  }
}

export async function getDownloadedVersions(json: DataAPI['json']): Promise<string[]> {
  return (await json.get<string[]>('downloadedVersions', [])) ?? [];
}

export async function setDownloadedVersions(
  json: DataAPI['json'],
  versions: string[]
): Promise<void> {
  await json.set('downloadedVersions', versions);
}
