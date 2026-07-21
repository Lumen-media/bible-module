import type { Book } from './types.js';

export interface ParsedReference {
  book: Book;
  chapter: number;
  verse?: number;
}

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

export function parseReference(query: string, books: Book[]): ParsedReference | null {
  const nq = normalize(query).trim();
  if (!nq) return null;

  let best: { book: Book; nameLen: number } | null = null;

  for (const book of books) {
    const nb = normalize(book.name);
    if (nq.startsWith(nb) && (!best || nb.length > best.nameLen)) {
      best = { book, nameLen: nb.length };
    }
  }

  if (!best) return null;

  const after = nq.slice(best.nameLen).trim();
  const match = after.match(/^(\d+)\s*(?::|\s)?\s*(\d+)?/);
  if (!match) return null;

  const chapter = parseInt(match[1], 10);
  if (chapter < 1 || chapter > best.book.chapters) return null;

  const verse = match[2] ? parseInt(match[2], 10) : undefined;

  return { book: best.book, chapter, verse };
}
