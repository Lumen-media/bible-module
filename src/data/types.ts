export interface Book {
  id: string;
  name: string;
  chapters: number;
  testament: 'old' | 'new';
}

export interface Version {
  id: string;
  name: string;
  language: string;
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
  version: string;
  book: string;
  chapter: number;
  verse: number;
  text: string;
}
