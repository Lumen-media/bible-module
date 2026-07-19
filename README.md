# bible-module

A [Lumen](https://github.com/Lumen-media/lumen) module.

## Develop

```bash
pnpm install
```

### Dev mode (hot reload)

1. Start Lumen in debug mode: `pnpm tauri dev` (in the Lumen app root).
2. In this directory, run:

   ```bash
   pnpm dev
   ```

This builds the module, registers it with the running Lumen instance, and watches for file changes. On every change, it rebuilds and triggers a hot reload — no manual install needed.

Requires Lumen to be built in debug mode (the default for `pnpm tauri dev`). The dev server runs at `127.0.0.1:5179`.

### Build

```bash
pnpm build        # bundles into dist/
pnpm pack         # creates {id}-{version}.lumenpack in dist/
pnpm validate     # schema-checks manifest.json
```

## Publish

1. Create a GitHub release on this repo with tag `vX.Y.Z` and attach the `.lumenpack` as a release asset.
2. Open a PR against [Lumen-media/community-modules](https://github.com/Lumen-media/community-modules) adding an entry to `modules.json` that points at this repo.

## License

MIT
