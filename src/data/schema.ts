import type { Migration } from '@lumen-media/module-sdk';

export const MIGRATIONS: Migration[] = [
  {
    version: 1,
    up: `
      CREATE TABLE IF NOT EXISTS verses (
        id        INTEGER PRIMARY KEY AUTOINCREMENT,
        version   TEXT NOT NULL,
        book      TEXT NOT NULL,
        chapter   INTEGER NOT NULL,
        verse     INTEGER NOT NULL,
        text      TEXT NOT NULL,
        UNIQUE(version, book, chapter, verse)
      );
      CREATE INDEX IF NOT EXISTS idx_verses_version_book_chapter
        ON verses(version, book, chapter);
    `,
  },
  {
    version: 2,
    up: `
      CREATE TABLE IF NOT EXISTS metadata (
        key   TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );
    `,
  },
  {
    version: 3,
    up: `
      CREATE VIRTUAL TABLE IF NOT EXISTS verses_fts USING fts5(
        text,
        version UNINDEXED,
        book    UNINDEXED,
        chapter UNINDEXED,
        verse   UNINDEXED,
        content=verses,
        content_rowid=id
      );
      CREATE TRIGGER IF NOT EXISTS verses_ai AFTER INSERT ON verses BEGIN
        INSERT INTO verses_fts(rowid, text, version, book, chapter, verse)
        VALUES (new.id, new.text, new.version, new.book, new.chapter, new.verse);
      END;
    `,
  },
];
