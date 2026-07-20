# Bible Module

Módulo de Bíblia para [Lumen](https://github.com/Lumen-media/lumen) com suporte a
múltiplas versões, busca textual, e projeção no presenter.

## Funcionalidades

- **Overlay dedicado** — Interface de controle em janela separada com grid de livros,
  leitor de capítulos e busca
- **3 versões padrão**: NAA (Nova Almeida Atualizada), ARA (Almeida Revista e
  Atualizada), NVI (Nova Versão Internacional)
- **Busca textual** via FTS5 no SQLite local
- **Presenter** — Projeção do texto selecionado com fonte grande
- **i18n** — Português (Brasil), Inglês, Espanhol
- **Download inteligente** — Paralelo com retry, resumível via cache JSON,
  barra de progresso
- **Tema** — Herda automaticamente o tema ativo do Lumen

## Arquitetura

```
src/
├── data/
│   ├── types.ts          # Tipos (Book, Chapter, Verse, etc.)
│   ├── schema.ts         # Migrations SQLite (verses + FTS5)
│   ├── store.ts          # Queries e operações no banco
│   └── downloader.ts     # Download paralelo da midvash com retry e cache
├── i18n/
│   ├── en.ts             # Inglês
│   ├── pt-BR.ts          # Português
│   └── es.ts             # Espanhol
├── overlay/
│   ├── BibleController   # Painel principal (grid + leitor)
│   ├── BookGrid          # Grid de livros estilo tabela periódica
│   ├── ChapterReader     # Leitor de capítulo com navegação
│   ├── VersionSelector   # Seletor de versão
│   ├── QuickSearch       # Busca rápida por inicial do livro
│   ├── DownloadProgress  # Barra de progresso do download
│   └── SearchPanel       # Busca textual completa
├── presenter/
│   └── BibleSlide        # Slide do presenter (texto grande)
├── store.ts              # Zustand store global
├── main.ts               # Entry point do plugin
├── i18n.ts               # Sistema de tradução
└── styles.css            # Tailwind + CSS variables do tema
```

## API (midvash)

Os dados são baixados de [api.midvash.com](https://api.midvash.com/v1) — sem
autenticação, sem rate limit, cache imutável de 1 ano no Cloudflare.

- `GET /v1/versions` — lista de versões
- `GET /v1/books?version=naa` — lista de livros
- `GET /v1/{version}/{book}/{chapter}` — capítulo individual

## Desenvolvimento

```bash
pnpm install
pnpm dev        # hot reload com Lumen em debug mode
pnpm build      # bundle para dist/
pnpm pack       # empacota como .lumenpack
pnpm validate   # valida manifest.json
pnpm lint       # biome check
```

## Licença

MIT
