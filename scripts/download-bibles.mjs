import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.resolve(__dirname, '..', 'bible-data');
const MIDVASH_API = 'https://api.midvash.com/v1';
const CONCURRENCY = 8;
const RETRY_DELAYS = [1000, 3000, 5000, 10000];

const CANONICAL_BOOKS = [
  { id: 'genesis', chapters: 50 },
  { id: 'exodus', chapters: 40 },
  { id: 'leviticus', chapters: 27 },
  { id: 'numbers', chapters: 36 },
  { id: 'deuteronomy', chapters: 34 },
  { id: 'joshua', chapters: 24 },
  { id: 'judges', chapters: 21 },
  { id: 'ruth', chapters: 4 },
  { id: '1samuel', chapters: 31 },
  { id: '2samuel', chapters: 24 },
  { id: '1kings', chapters: 22 },
  { id: '2kings', chapters: 25 },
  { id: '1chronicles', chapters: 29 },
  { id: '2chronicles', chapters: 36 },
  { id: 'ezra', chapters: 10 },
  { id: 'nehemiah', chapters: 13 },
  { id: 'esther', chapters: 10 },
  { id: 'job', chapters: 42 },
  { id: 'psalms', chapters: 150 },
  { id: 'proverbs', chapters: 31 },
  { id: 'ecclesiastes', chapters: 12 },
  { id: 'songofsolomon', chapters: 8 },
  { id: 'isaiah', chapters: 66 },
  { id: 'jeremiah', chapters: 52 },
  { id: 'lamentations', chapters: 5 },
  { id: 'ezekiel', chapters: 48 },
  { id: 'daniel', chapters: 12 },
  { id: 'hosea', chapters: 14 },
  { id: 'joel', chapters: 3 },
  { id: 'amos', chapters: 9 },
  { id: 'obadiah', chapters: 1 },
  { id: 'jonah', chapters: 4 },
  { id: 'micah', chapters: 7 },
  { id: 'nahum', chapters: 3 },
  { id: 'habakkuk', chapters: 3 },
  { id: 'zephaniah', chapters: 3 },
  { id: 'haggai', chapters: 2 },
  { id: 'zechariah', chapters: 14 },
  { id: 'malachi', chapters: 4 },
  { id: 'matthew', chapters: 28 },
  { id: 'mark', chapters: 16 },
  { id: 'luke', chapters: 24 },
  { id: 'john', chapters: 21 },
  { id: 'acts', chapters: 28 },
  { id: 'romans', chapters: 16 },
  { id: '1corinthians', chapters: 16 },
  { id: '2corinthians', chapters: 13 },
  { id: 'galatians', chapters: 6 },
  { id: 'ephesians', chapters: 6 },
  { id: 'philippians', chapters: 4 },
  { id: 'colossians', chapters: 4 },
  { id: '1thessalonians', chapters: 5 },
  { id: '2thessalonians', chapters: 3 },
  { id: '1timothy', chapters: 6 },
  { id: '2timothy', chapters: 4 },
  { id: 'titus', chapters: 3 },
  { id: 'philemon', chapters: 1 },
  { id: 'hebrews', chapters: 13 },
  { id: 'james', chapters: 5 },
  { id: '1peter', chapters: 5 },
  { id: '2peter', chapters: 3 },
  { id: '1john', chapters: 5 },
  { id: '2john', chapters: 1 },
  { id: '3john', chapters: 1 },
  { id: 'jude', chapters: 1 },
  { id: 'revelation', chapters: 22 },
];

function delay(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function fetchJSON(url, retries = RETRY_DELAYS.length) {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (e) {
      if (attempt < retries - 1) {
        const ms = RETRY_DELAYS[attempt] ?? 5000;
        console.error(`  retry ${attempt + 1}/${retries} in ${ms}ms`);
        await delay(ms);
      } else {
        throw e;
      }
    }
  }
}

async function fetchDamaralVersion(slug, language) {
  const outSlug = slug.toLowerCase();
  const versionDir = path.join(OUT_DIR, outSlug);
  if (fs.existsSync(versionDir)) return;

  const url = `https://github.com/damarals/biblias/releases/latest/download/${slug}.json`;
  console.log(`  Downloading ${slug} (${language}) from damarals...`);
  const books = await fetchJSON(url);

  fs.mkdirSync(versionDir, { recursive: true });
  fs.writeFileSync(path.join(versionDir, 'meta.json'), JSON.stringify({
    slug: outSlug, name: slug, shortName: slug,
    language, source: 'damarals',
  }, null, 2), 'utf-8');

  for (let i = 0; i < books.length; i++) {
    const book = books[i];
    const canon = CANONICAL_BOOKS[i];
    if (!canon) break;

    const chapters = (book.chapters || []).slice(0, canon.chapters).map((chapterVerses, ci) => ({
      number: ci + 1,
      verses: (chapterVerses || []).map((text, vi) => ({ number: vi + 1, text })),
    }));

    const bookData = { book: canon.id, bookName: book.name || '', chapters };
    fs.writeFileSync(path.join(versionDir, `${canon.id}.json`), JSON.stringify(bookData, null, 2), 'utf-8');
  }
  console.log(`  ${slug}: done`);
}

async function downloadMidvashVersion(version) {
  const versionDir = path.join(OUT_DIR, version.slug);
  if (fs.existsSync(versionDir)) return;

  console.log(`\n  MIDVASH ${version.slug} (${version.language}) - ${version.name}`);
  fs.mkdirSync(versionDir, { recursive: true });
  fs.writeFileSync(path.join(versionDir, 'meta.json'), JSON.stringify({
    slug: version.slug, name: version.name, shortName: version.shortName,
    language: version.language, copyright: version.copyright,
    source: 'api.midvash.com',
  }, null, 2), 'utf-8');

  const bookVerses = {};
  const start = Date.now();
  let completed = 0;
  let errors = 0;
  const queue = [];
  for (const book of CANONICAL_BOOKS) {
    for (let ch = 1; ch <= book.chapters; ch++) {
      queue.push({ book: book.id, chapter: ch });
    }
  }
  const total = queue.length;

  async function worker() {
    while (queue.length > 0) {
      const task = queue.shift();
      if (!task) break;

      try {
        const { data } = await fetchJSON(`${MIDVASH_API}/${version.slug}/${task.book}/${task.chapter}`);
        const verses = (data?.verses || []).map((text, i) => ({ number: i + 1, text }));
        if (!bookVerses[task.book]) bookVerses[task.book] = {};
        bookVerses[task.book][task.chapter] = verses;
      } catch (e) {
        errors++;
      }

      completed++;
      if (completed % 300 === 0 || completed === total) {
        const elapsed = ((Date.now() - start) / 1000).toFixed(0);
        console.log(`  ${version.slug}: ${completed}/${total} (${((completed/total)*100).toFixed(1)}%) ${elapsed}s  err:${errors}`);
      }
    }
  }

  const workers = [];
  for (let i = 0; i < CONCURRENCY; i++) workers.push(worker());
  await Promise.all(workers);

  for (const book of CANONICAL_BOOKS) {
    const chapters = bookVerses[book.id];
    if (!chapters) continue;
    const chapterArray = Object.keys(chapters).sort((a, b) => Number(a) - Number(b)).map((chNum) => ({
      number: Number(chNum),
      verses: chapters[chNum],
    }));
    const bookData = { book: book.id, bookName: '', chapters: chapterArray };
    fs.writeFileSync(path.join(versionDir, `${book.id}.json`), JSON.stringify(bookData, null, 2), 'utf-8');
  }

  if (errors > 0) console.error(`  ${version.slug}: ${errors} errors`);
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });

  console.log('=== PT-BR from damarals/biblias ===');
  const damaraSlugs = [
    'ACF', 'ALM1911', 'ARA', 'ARC', 'AS21', 'BLIVRE',
    'JFAA', 'KJA', 'KJF', 'MENS', 'NAA', 'NBV',
    'NTLH', 'NVI', 'NVT', 'OL', 'TB', 'VFL',
  ];
  for (const v of damaraSlugs) await fetchDamaralVersion(v, 'pt-br');

  console.log('\n=== EN + ES repos ===');
  const thiagoMap = {
    'en_kjv': { file: 'en_kjv.json', lang: 'en', source: 'thiagobodruk' },
    'en_bbe': { file: 'en_bbe.json', lang: 'en', source: 'thiagobodruk' },
    'es_rvr': { file: 'es_rvr.json', lang: 'es', source: 'thiagobodruk' },
  };

  for (const [slug, info] of Object.entries(thiagoMap)) {
    const versionDir = path.join(OUT_DIR, slug);
    if (fs.existsSync(versionDir)) {
      console.log(`  ${slug}: already exists`);
      continue;
    }

    const url = `https://github.com/thiagobodruk/bible/blob/master/json/${info.file}?raw=true`;
    console.log(`  Downloading ${slug} (${info.lang}) from thiagobodruk...`);
    const books = await fetchJSON(url);

    fs.mkdirSync(versionDir, { recursive: true });
    fs.writeFileSync(path.join(versionDir, 'meta.json'), JSON.stringify({
      slug, name: slug, shortName: slug,
      language: info.lang, source: info.source,
    }, null, 2), 'utf-8');

    for (let i = 0; i < books.length; i++) {
      const book = books[i];
      const canon = CANONICAL_BOOKS[i];
      if (!canon) break;

      const chapters = (book.chapters || []).slice(0, canon.chapters).map((chapterVerses, ci) => ({
        number: ci + 1,
        verses: (chapterVerses || []).map((text, vi) => ({ number: vi + 1, text })),
      }));

      const bookData = { book: canon.id, bookName: book.name || '', chapters };
      fs.writeFileSync(path.join(versionDir, `${canon.id}.json`), JSON.stringify(bookData, null, 2), 'utf-8');
    }
    console.log(`  ${slug}: done`);
  }

  console.log('\n=== Remaining from Midvash API ===');
  const { data: allVersions } = await fetchJSON(`${MIDVASH_API}/versions`);
  const midvashTargets = allVersions.filter((v) => {
    if (v.language === 'pt-br') return false;
    if (v.language === 'pt-pt') return true;
    if (v.language === 'en') return !['en_kjv', 'en_bbe'].includes(v.slug);
    if (v.language === 'es') return v.slug !== 'es_rvr';
    return false;
  });

  console.log(`${midvashTargets.length} versions:`);
  for (const v of midvashTargets) console.log(`  ${v.slug} (${v.language}) - ${v.name}`);
  for (const v of midvashTargets) await downloadMidvashVersion(v);

  console.log('\nDone!');
}

main().catch((e) => { console.error(e); process.exit(1); });
