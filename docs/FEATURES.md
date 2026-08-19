# Feature Ideas — Bible Module

## Already exists in Lumen (host)
- Black screen — controlled by the presenter bar
- Next/previous slide — handled natively by the host for lyrics/PPT, not available for custom modules via events
- Slide transitions — controlled by presenter bar
- Stage display / confidence monitor — native Lumen feature

---

## Recently shipped
Items that were previously in the backlog / wishlist and are now implemented:

- **Reading history** — `HistoryPanel` tab backed by the SQLite `history` table
  (capped at 100 entries), clearable from settings
- **Favorites (bookmarks)** — per-verse toggle (context menu / star), persisted in
  `json` under `bookmarks`, listed in the `FavoritesPanel` tab
- **Version sync / update** — per-version "sync" action in the version manager
  (`syncVersion`) plus an update-badge flow wired through `UPDATED_VERSIONS` +
  `syncedVersions` (localStorage `bibleSyncedVersions`)
- **Typography customization** — text alignment (left/center/justify), line
  spacing, verse number style (superscript/inline/hidden), font family/weight/
  style, uppercase, auto font color

---

## Backlog (build soon)

### Navigation history (remaining)
- Stack of visited books/chapters with explicit back/forward
- Keyboard shortcut: ArrowLeft/ArrowRight to navigate chapters

### Multi-verse selection
- **CTRL + Click**: select non-contiguous verses (e.g. 2 and 5)
- **SHIFT + Click**: select a contiguous range (e.g. click 1, shift+click 4 → 1-4)
- "Project selected" button sends all selected verses at once

### Data sync (remaining)
- Delta sync: re-download only changed books, not all 66 (the current sync clears
  the JSON cache and re-fetches everything)
- Surface "last updated" per version (timestamps are already tracked in
  `bibleSyncedVersions` but not shown in the UI)

### Export/Import settings
- Export settings, favorites, notes, and highlights as JSON
- Import back (device/profile migration)

### Presenter navigation
- Next/previous buttons for verse range via `presenter.controls.item` slot (host does not emit nav events for custom modules)

---

## Wishlist (documented, no deadline)

### Projection
- **Teleprompter mode**: continuous text scroll instead of fixed slides
- **Auto-advance**: configurable per-slide timer

### Favorites & Organization
- Categories/folders for favorites (themes, events, etc.)

### Version comparison
- Side-by-side mode between 2 translations
- Project split-screen comparison

### Cross references
- Links between related verses (e.g. prophecy → fulfillment)
- Quick navigation between references

### Highlights
- Colored highlighting on verses (like physical highlighters)
- Different colors per category/theme
- Persisted alongside settings

### Personal notes
- Per-verse annotations saved to local JSON

### Content
- **TTS (Text-to-Speech)**: verse narration using browser/OS native API
- Bible maps (geographic context)