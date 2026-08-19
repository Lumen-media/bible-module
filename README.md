# Bible Module

> Read, search, and project the Bible from inside [Lumen](https://github.com/Lumen-media/lumen).

The **Bible Module** is your everyday scripture companion for broadcast. Open a
clean book grid, pick a chapter, and send any verse to the presenter with a
single click — or let the operator search the whole text offline while the
service is on air.

## What it does

- **Read** — Browse the Bible through a simple book grid and a comfortable
  chapter reader with previous/next navigation.
- **Search** — Jump straight to any book, chapter, or verse, or search across the
  full text of a translation — fully offline.
- **Project** — Send selected verses to the presenter with large, readable text
  and full control over typography and background.
- **Multiple translations** — Choose from dozens of versions: NAA, ARA, NVI, ARC,
  ACF, KJV, NIV, NLT, RVR1960 and many more.
- **Works offline** — Versions are downloaded and stored locally, so once
  installed the Bible is always ready, even without a connection.
- **Auto-sync** — Your current version, position, and history stay in sync
  across every Lumen window automatically.
- **Fits Lumen** — Follows Lumen's look and feel, including its light and dark
  themes.

## Default versions

On the first run, the module downloads three default translations based on
Lumen's language:

| Language | Default versions |
| -------- | ---------------- |
| Portuguese (BR/PT) | NAA, ARA, NVI |
| English (US) | KJV, NIV, NLT |
| English (GB) | KJV, WEB, YLT |
| Spanish | RVR1960, NTV |

Any other version can be added later from the version manager.

## Screenshots

> Drop your images inside `screenshots/` and reference them here.

### Book grid

![Book grid](screenshots/book-grid.png)

### Chapter reader

![Chapter reader](screenshots/chapter-reader.png)

### Search

![Search](screenshots/search.png)

### Presenter

![Presenter](screenshots/presenter.png)

## Languages

The module ships with translations for **English**, **Portuguese (Brazil)** and
**Spanish**.

## Development

```bash
pnpm install
pnpm dev        # develop with hot reload
pnpm build      # bundle to dist/
pnpm pack       # create the .lumenpack file
pnpm validate   # validate the manifest
pnpm lint       # lint and auto-fix
```

## License

MIT