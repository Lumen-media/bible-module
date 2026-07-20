export interface Book {
  id: string;
  name: string;
  chapters: number;
  testament: 'old' | 'new';
}

export interface Chapter {
  version: string;
  book: string;
  number: number;
  verses: (Verse | null)[];
}

export interface Verse {
  number: number;
  text: string;
}

export interface SearchResult {
  id: string;
  version: string;
  book: string;
  chapter: number;
  verse: number;
  text: string;
}

export interface MidvashVerse {
  number: number;
  text: string;
}

export interface MidvashChapter {
  book: { name: string };
  chapter: { number: number; verses: MidvashVerse[] };
}
