# Bible Module — Technical Documentation

Technical reference for the `com.bible-module` Lumen module. This doc describes
the actual implementation: surfaces, data pipeline, state management,
internationalization and build tooling. For a non-technical overview, see the
project `README.md`. For the feature backlog, see `docs/FEATURES.md`.

---

## 1. Overview

The module is a full offline Bible reader for [Lumen](https://github.com/anomalyco/lumen)
with two surfaces:

- **Overlay / control** — panel `bible-controller` registered in the
  `surface.window` slot. This is the operator UI: book grid, chapter reader,
  full-text search, favorites, history, version manager and preferences.
  Opened as a detached, undecorated window.
- **Presenter / audience** — component `bible-slide` registered in the
  `presenter.content` slot. Renders only the projected text on the public
  screen, without navigation.

Text is downloaded from an R2 CDN (primary) or the [midvash API](https://api.midvash.com)
(fallback), cached as JSON files in `host.fs` and imported into a module-scoped
SQLite database (`host.data.sqlite()`) with an FTS5 index for search. All UI and
book names are localized in six locales.

---

## 2. Directory Structure

```
src/
├── main.ts                       # Plugin entry point (LumenPlugin)
├── store.ts                      # Zustand store: state, actions, auto-ensure
├── search.ts                     # In-memory MiniSearch index (search panel)
├── i18n.ts                       # Locale resolution, t() / tForVersion()
├── styles.css                    # Global styles injected via ?inline
├── data/
│   ├── types.ts                  # Book, Chapter, Verse, HistoryEntry...
│   ├── store.ts                  # BOOKS catalog, JSON cache + position helpers
│   ├── database.ts               # SQLite migrations, queries, FTS5, history
│   ├── downloader.ts             # Network download (R2 + midvash fallback)
│   ├── ref.ts                    # parseReference("gn 1:2") parser
│   ├── settings.ts               # BibleSettings types + defaults
│   └── settings-persist.ts       # Debounced settings persistence
├── i18n/
│   ├── en.ts                     # English (canonical, source of truth)
│   ├── en-GB.ts                  # British English
│   ├── pt-BR.ts                  # Portuguese (Brazil)
│   ├── pt-PT.ts                  # European Portuguese
│   ├── es.ts                     # Spanish (Spain / neutral)
│   └── es-AR.ts                  # Argentine Spanish (voseo)
├── hooks/
│   └── useFitFontSize.ts         # Auto-fit font size for presenter text
├── lib/
│   ├── utils.ts                  # cn(), displayVersion(), getReferenceSize()
│   └── color-analysis.ts         # Dominant color detection for backgrounds
├── overlay/
│   ├── BibleController.tsx       # Root panel: header, tabs, state wiring
│   ├── BookGrid.tsx              # Testament-filtered book grid
│   ├── ChapterReader.tsx         # Chapter reader (virtualized verses)
│   ├── VersesList.tsx            # Virtualized verse rows
│   ├── ChapterPreview.tsx        # Chapter selector / preview
│   ├── QuickSearch.tsx           # Reference quick-search ("gn 1:2")
│   ├── SearchPanel.tsx           # Full-text search results
│   ├── FavoritesPanel.tsx        # Bookmark list
│   ├── HistoryPanel.tsx          # Reading history
│   ├── SettingsPanel.tsx         # UI preferences section
│   ├── PreferencesModal.tsx      # Preferences + version manager modal
│   ├── PreviewPane.tsx           # Slide preview pane
│   ├── SlidePreview.tsx          # Rendered slide mock
│   ├── DownloadingState.tsx      # Full-screen loading state (GIF + messages)
│   ├── DownloadProgress.tsx      # Top progress bar during downloads
│   └── flags.tsx                 # Locale flag SVGs (BR, PT, UK, US, ES, AR)
└── presenter/
    └── BibleSlide.tsx            # Audience slide
```

---

## 3. Plugin Lifecycle (`main.ts`)

`BibleModulePlugin extends LumenPlugin`.

**`onload(host)`:**

1. Injects `styles.css` into the document (via `css?inline` import).
2. Calls `setupI18n(host.app.locale)`.
3. In the main window, caches the host font list into `json` key `bibleFonts`.
4. Registers the control panel `bible-controller` on `surface.window` and, in
   the presenter window, the `bible-slide` component on `presenter.content`.
5. Registers commands:
   - `bible.open` / `bible.search` — open the surface window.
   - `bible.clear` — `host.presentation.clear()`.
   - Prefix commands `bbl` (+ `biblia` for pt/es locales, `bible` otherwise).
     Each prefix parses the query with `parseReference()` and either opens the
     surface window at a book/chapter/verse or offers a search fallback.
6. Registers the queue action `bible.verse-queue` (main window only) so verses
   can be projected from Lumen's playback queue.
7. Subscribes to `host.themes.onDefaultBackgroundChange` and pushes the result
   into the store (`setProfileBackground`).
8. Initializes the store: `useBibleStore.getState().init({ ... })` with all host
   services (fs, net, json, sqlite factory, presentation, themes, ui, fonts,
   events, t, hostWindow, locale).
9. Clears projection when Lumen emits `module:presenter-clear` or
   `module:presenter-window-closed`.

**`onunload()`:** disposes the theme subscription and removes the injected style.

---

## 4. Store (`src/store.ts`)

The store is a Zustand store (`useBibleStore`). State and actions are typed by
`BibleState` / `BibleActions`.

### 4.1. Version catalog

- `ALL_VERSIONS` — 39 version descriptors `{ id, name, language }`, where
  `language` is one of `pt-br`, `pt-pt`, `en-gb`, `en-us`, `es`.
- `staticVersionLanguage(id)` — maps a version id to its language without DB
  access (falls back to `pt-br`).
- `DEFAULT_VERSIONS_BY_LOCALE` — default 3-version set per locale:
  - `pt-BR` → `naa`, `ara`, `nvi`
  - `pt-pt` → `bpt`, `naa`, `nvi`
  - `en-us` / `en` → `en_kjv`, `niv`, `nlt`
  - `en-gb` → `en_kjv`, `web`, `ylt`
  - `es` → `es_rvr`, `rvr1960`, `ntv`
- `getDefaultVersions(locale)` — exact match, case-insensitive match, then
  prefix fallback (`pt-*` → pt-BR, `en-gb` → en-gb, `en` → en, `es` → es),
  defaulting to pt-BR.
- `UPDATED_VERSIONS` — currently empty; reserved for versions with pending
  content updates (used to show an "update available" badge).
- `chapterCache` — in-memory `Map` of `"version/book/chapter"` → verses. Cleared
  whenever data changes (`setVersion`, after downloads, versions-ready).

### 4.2. Host services

Set by `init()`: `fs`, `net`, `json`, `sqlite`, `presentation`, `themes`, `ui`,
`fonts`, `events`, plus `hostWindow` (`main` | `surface` | `presenter`) and
`appLocale`. Persistence logic branches on `hostWindow === 'main'`.

### 4.3. Key actions

- `init(services)` — stores services, opens SQLite, runs `initDatabase()`,
  loads history, then (main window only) restores downloaded versions, last
  position, verses-per-page, fonts, bookmarks and the full settings blob from
  SQLite `settings` (preferred) or `json`. Picks the active version: restored
  one if downloaded, first downloaded otherwise, or the locale default.
  Finally triggers `_backgroundEnsureVersions()` and `_subscribeVersionsReady()`.
- `setVersion(v)` — switches active version, resets `verses` to null, resolves
  `versionLanguage` (DB → static), persists, clears chapter cache and reloads
  the current chapter.
- `loadChapter(book, chapter)` — serves from `chapterCache`, else SQLite
  (`getChapterFromDb`), else the JSON cache (`getChapter`).
- `setTestament`, `setTab`, `selectBook`, `setChapter`, `goTo`, `setSelectedVerse`
  — navigation state.
- `toggleBookmark` / `setBookmarks` — bookmarks kept in `json` key `bookmarks`
  (a `Record<string, string>` keyed `version:book:chapter:verse`).
- `recordHistory` / `clearHistory` — SQLite `history` table (limit 100 entries).
- `downloadAndSetVersion(v)` / `downloadVersionOnly(v)` — manual download from
  the version manager, inserting chapters into SQLite as they arrive.
- `search(query)` — FTS5 search across all downloaded versions.
- `setProjectedData` / `clearProjection` — holds the currently projected slide
  payload.

### 4.4. Settings

Settings are typed in `data/settings.ts` (background, fontSize, fontFamily) and
extended by `PersistedSettings` in `data/settings-persist.ts` (font weight/style,
displayed tabs, version, uppercase, reference flags, font color, alignment,
spacing, reference position, verse number style, ...). `persistSettings()` is
debounced 500 ms and writes to **both** `json` (`bibleSettings`) and the SQLite
`settings` table. Load order prefers SQLite over `json`.

---

## 5. Download & Auto-Ensure Pipeline

### 5.1. Background auto-ensure (`store.ts`)

On startup (main window) the module ensures the locale's default versions are
available:

1. Computes `needsDownload` (no JSON cache) and `needsSqlite` (JSON cache
   present, not yet in SQLite) from `getPopulatedVersions()`.
2. Acquires a cross-window lock in `localStorage` key `bibleAutoEnsureLock`
   (2-minute expiry). If another window holds it, it skips.
3. Downloads/imports versions with a worker pool (`CONCURRENT_VERSIONS = 3`).
   A download streams chapters straight into SQLite via `insertChapterBatch`.
4. Reports progress via `dlCurrent`/`dlTotal`/`dlVersion` state, throttled to
   ~500 ms, and emits `bible:download-progress` on the host event bus.
5. Marks completion by appending to the `downloadedVersions` JSON array and
   emitting/announcing "versions ready":
   - bus event `bible:versions-ready`
   - `localStorage` key `bibleVersionsReady` (survives reloads; `storage`
     events wake other windows).

`_applyVersionsReady()` (triggered by the bus event or the storage event) syncs
`downloadedVersionList`, rebuilds `displayedTabs`, picks a valid active version,
clears the chapter cache and reloads the chapter — this is what keeps every open
window consistent after a download finishes elsewhere.

### 5.2. `downloadVersion()` (`data/downloader.ts`)

Per version:

- **Primary:** fetch each book from R2 (`R2_BASE`, `cache/{version}/{book}.json`
  layout). A successful book fetch is written to `host.fs` and piped into SQLite
  immediately.
- **Fallback:** books that fail on R2 are fetched chapter-by-chapter from
  midvash (`/v1/{version}/{book}/{chapter}`), buffered per book and flushed to
  `host.fs` when complete.
- Concurrency: 5 workers; 3 attempts per request with backoff
  `[1000, 3000, 5000] ms`; 5 re-queues per failing chapter.
- Progress reported every 15 completed items and always on completion.
- Skipped books already cached in `host.fs` (`fs.exists`).

### 5.3. `importVersionFromJson()` (`data/database.ts`)

Rehydrates SQLite from an existing JSON cache (no network). Iterates the 66
books, reads each `cache/{version}/{book}.json`, flattens chapters/verses into
batches of 500 (`INSERT OR IGNORE`), stores the version language, yields to the
main thread every 8 ms, and rebuilds the FTS index at the end.

---

## 6. Data Layer

### 6.1. Canonical book catalog (`data/store.ts`)

`BOOKS` — the 66 books with `{ id, name, chapters, testament, slug? }`. `name`
is the Portuguese display name; per-locale names come from i18n keys
`book.<id>`. The `slug` (e.g. `1-samuel`, `song-of-solomon`) is used for midvash
URLs via `apiSlug()`. The JSON cache path helper is `bookPath(version, book)`
→ `cache/{version}/{book}.json`.

### 6.2. SQLite (`data/database.ts`)

Migrations (versions 1–8):

| v | Table | Purpose |
|---|-------|---------|
| 1 | `verses` | `(version, book, chapter, verse, text)` PK `(version, book, chapter, verse)` |
| 2 | `download_state` | Legacy per-version chapter counters |
| 4 | `chapter_downloads` | Per-(version, book, chapter) downloaded flag |
| 5/6 | `versions` | `(version, language)` registry (book_names dropped in v6) |
| 7 | `settings` | `(key, value)` KV store |
| 8 | `history` | Reading history, capped at 100 rows |

Plus a separate `verses_fts` virtual table created with FTS5
(`tokenize='porter unicode61'`). If FTS5 is unavailable, search falls back to a
`LIKE` scan.

Key functions: `getChapterFromDb`, `isVersionPopulated`, `getPopulatedVersions`,
`getVersionLanguage`/`setVersionLanguage`, `insertChapterBatch`, `rebuildFts`,
`getSetting`/`setSetting`, `getHistory`/`insertHistory`/`clearHistory`,
`searchVerses`.

### 6.3. Reference parser (`data/ref.ts`)

`parseReference(query, books)` parses inputs like `gn 1:2`, `Genesis 1`, `1 João
3` (accent-insensitive) by longest-match against book names, ids and localized
`book.<id>` translations, then a chapter/verse regex. Used by prefix commands and
QuickSearch.

### 6.4. JSON cache & positions (`data/store.ts`)

`getChapter(fs, ...)` reads a book file from `host.fs` and builds a sparse
1-based verse array. `downloadedVersions`, `lastPosition`, `versesPerPage` live
in `json`. `getSyncedVersions`/`setSyncedVersion` track per-version sync timestamps
in `localStorage` (`bibleSyncedVersions`).

---

## 7. Internationalization (`i18n.ts`)

Six locales: `en`, `en-GB`, `pt-BR`, `pt-PT`, `es`, `es-AR`.

- `en.ts` is the canonical source; `TranslationKey = keyof typeof en` gives full
  type safety — every other locale file is a `Record<TranslationKey, string>`,
  so missing keys fail at compile time.
- `_translations` maps canonical locale ids to message maps.
- `_alias` normalizes common forms: `pt` → `pt-BR`, `pt-br` → `pt-BR`,
  `pt-pt` → `pt-PT`, `en` → `en`, `en-us` → `en`, `en-gb` → `en-GB`,
  `es` → `es`, `es-ar` → `es-AR`.
- `resolve(locale)` — alias lookup first, then language-prefix fallback, else
  English.
- `t(key, params?)` — resolves against `detectLocale()` (document `<html lang>`
  or `navigator.language`) and interpolates `{param}` placeholders.
- `tForVersion(versionLang, key)` — used for book names/abbreviations tied to the
  **translation's** language (e.g. an English KJV shows English book names even
  when the UI is Portuguese), falling back to English.

Version display names use `displayVersion(id)` (`lib/utils.ts`), which strips the
locale prefix (`en_kjv` → `KJV`, `es_rvr` → `RVR`) based on
`ALL_VERSIONS`.

---

## 8. Search

Two complementary search paths:

- **DB FTS5** (`searchVerses`, used by `store.search`) — builds an AND query of
  quoted terms against `verses_fts`, ranked by relevance, restricted to the
  downloaded versions. Falls back to `LIKE` if FTS5 is missing.
- **In-memory MiniSearch** (`search.ts`) — `ensureIndex(fs, version)` lazily
  builds a full-text index from the JSON cache of the active version (fuzzy
  0.15, prefix matching); `searchIndex(query, version?)` returns up to 50
  results. Used by the search panel for instant, incremental results.

---

## 9. Overlay Components

| Component | Role |
|-----------|------|
| `BibleController` | Root panel: header with version tabs, tab navigation (Browse / Search / Favorites / History), wires store actions to children; opens Preferences modal |
| `BookGrid` | Grid of book tiles (abbreviated or full names), filtered by testament, locale-aware |
| `ChapterReader` | Main reading area: header with reference, previous/next chapter, per-verse interaction (select, project, favorite, add to queue) |
| `VersesList` | `@tanstack/react-virtual` list of verse rows for a chapter |
| `ChapterPreview` | Chapter selector / preview dialog |
| `QuickSearch` | Type-to-navigate: resolves references via `parseReference` |
| `SearchPanel` | MiniSearch results across the active version, clickable to open a chapter/verse |
| `FavoritesPanel` | Bookmarks read from the `bookmarks` JSON record |
| `HistoryPanel` | Reading history from the SQLite `history` table |
| `SettingsPanel` | Typography/reading preferences section |
| `PreferencesModal` | Combined modal: appearance settings + version manager (language filter with flags, install/update, storage sizes) |
| `PreviewPane` / `SlidePreview` | Live preview of how the current selection would render on the presenter |
| `DownloadingState` | Full-screen overlay while versions download (animated GIF + rotating messages, animejs) |
| `DownloadProgress` | Top progress bar bound to `dlCurrent`/`dlTotal` |
| `flags.tsx` | Inline SVG flags for BR, PT, UK, US, ES, AR |

The header's version tabs (see `displayedTabs`) let the operator switch between
up to three active translations instantly.

---

## 10. Presenter (`presenter/BibleSlide.tsx`)

Registered on `presenter.content` as `bible-slide`. Receives a `data` payload
via `presentation.project('bible-slide', { data })` (see the queue action in
`main.ts`). Features:

- Auto-fit font size via `useFitFontSize` so long passages never overflow.
- Optional background image + black overlay with `backgroundOpacity`; falls back
  to the store's `background`/`profileBackground`.
- Typography driven by the projected payload (font family/weight, color, text
  align, line spacing, uppercase).
- Reference modes: `inline` reference header or `showReferenceOnly` (big
  book/chapter/verse label), with `verseNumberStyle` superscript/inline/hidden.
- Animated enter/exit (CSS `verse-enter`/`verse-exit`) between passages.
- Empty state prompts the operator to select verses.

`showVersion`, `abbreviatedBooks` and reference label use `tForVersion` so the
label language follows the **translation**, not the UI locale.

---

## 11. Projection & Queue Flow

1. Operator selects verses in `ChapterReader` and triggers "Project" (or adds
   them to Lumen's queue).
2. Projection payload (`version`, `book`, `bookName`, `chapter`, `verses`,
   `text`, plus all typography settings) is stored via `setProjectedData`.
3. The main window calls `host.presentation.project('bible-slide', { data })`;
   the presenter window renders `BibleSlide` with it.
4. `bible.verse-queue` queue action (registered in `main.ts`) builds the same
   payload from the queue config, so queued verses auto-open on the presenter
   when the queue reaches them.
5. `module:presenter-clear` / `module:presenter-window-closed` reset the
   projection.

---

## 12. Tooling

| Command | Purpose |
|---------|---------|
| `pnpm dev` | `lumen-module dev` — watch/dev server |
| `pnpm build` | `lumen-module build` — bundle to `dist/` |
| `pnpm pack` | build + `lumen-module pack` — distributable module file |
| `pnpm validate` | `lumen-module validate` — manifest checks |
| `pnpm lint` / `pnpm format` | `biome check --write src/` / `biome format --write src/` |

Type checking: `npx tsc --noEmit`. Manifest (`manifest.json`) declares the
`^0.15.0` API, MIT license, entry `main.js`, and network permissions for
`api.midvash.com`, the R2 bucket, and `images.unsplash.com`.

## 13. Conventions & Notes

- **Version ids** use the midvash slug convention; locale is inferred by
  `staticVersionLanguage` and persisted in the `versions` table.
- **JSON cache layout** is `cache/{version}/{book}.json` with
  `{ book, bookName, chapters: [{ number, verses: [{ number, text }] }] }`.
- **Data scope** is module-isolated: SQLite is per-module, so no cross-module
  table conflicts.
- **Cross-window sync** relies on the host event bus plus `localStorage`
  (lock + ready marker); keep both channels when adding new sync behavior.
- **Settings** are dual-persisted (SQLite `settings` + `json`) — SQLite is
  authoritative on load.
- The module registers exactly one panel per slot (`surface.window`,
  `presenter.content`); the surface window is opened via `host.surface.openWindow`.
- `docs/FEATURES.md` lists upcoming ideas; `README.md` is the public-facing,
  non-technical overview.