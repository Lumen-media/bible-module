import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import tailwindcss from "@tailwindcss/postcss";
import { defineConfig } from "vite";

const HOST_EXTERNALS = ["react", "@lumen-media/ui", "@lumen-media/module-sdk"];

export default defineConfig({
  css: {
    postcss: {
      plugins: [tailwindcss()],
    },
  },
  plugins: [
    {
      name: "lumen-module-assets",
      closeBundle() {
        const cwd = process.cwd();
        const out = resolve(cwd, "dist");
        mkdirSync(out, { recursive: true });

        const manifest = JSON.parse(readFileSync(resolve(cwd, "manifest.json"), "utf8"));
        const pkgPath = resolve(cwd, "package.json");
        if (existsSync(pkgPath)) {
          const pkg = JSON.parse(readFileSync(pkgPath, "utf8")) as { version?: string; description?: string };
          if (pkg.version) manifest.version = pkg.version;
          if (pkg.description) manifest.description = pkg.description;
        }
        writeFileSync(resolve(out, "manifest.json"), JSON.stringify(manifest, null, 2));
      },
    },
  ],
  build: {
    lib: {
      entry: resolve(process.cwd(), "src/main.ts"),
      formats: ["es"],
      fileName: () => "main.js",
    },
    rollupOptions: {
      external: (id: string) =>
        HOST_EXTERNALS.some((e) => id === e || id.startsWith(`${e}/`)),
    },
    sourcemap: true,
    emptyOutDir: true,
    outDir: "dist",
    minify: false,
  },
  esbuild: {
    jsx: "transform",
    jsxFactory: "React.createElement",
    jsxFragment: "React.Fragment",
    jsxInject: "import React from 'react'",
  },
});
