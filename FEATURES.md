# Feature Ideas — Bible Module

## Already exists in Lumen (host)
- Black screen — controlled by the presenter bar
- Next/previous slide — handled natively by the host for lyrics/PPT, not available for custom modules via events
- Slide transitions — controlled by presenter bar
- Stage display / confidence monitor — native Lumen feature

---

## Backlog (build soon)

### Navigation history
- Stack of visited books/chapters with back/forward
- Keyboard shortcut: ArrowLeft/ArrowRight to navigate chapters

### Multi-verse selection
- **CTRL + Click**: select non-contiguous verses (e.g. 2 and 5)
- **SHIFT + Click**: select a contiguous range (e.g. click 1, shift+click 4 → 1-4)
- "Project selected" button sends all selected verses at once

### Data sync
- "Sync" button in the downloads section to refresh a specific version
- Re-download only changed books, not all 66
- "Last updated" indicator per version

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
- Bookmark verses for quick access
- Categories/folders for favorites (themes, events, etc)

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

### Customization
- Text alignment: left, center, justify
- Line spacing and letter spacing
- Verse number style: superscript, inline, hidden
