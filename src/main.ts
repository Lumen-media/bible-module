import { type LumenHost, LumenPlugin, type PrefixSpec } from '@lumen-media/module-sdk';
import { parseReference } from './data/ref.js';
import { BOOKS } from './data/store.js';
import { setupI18n, t, type TranslationKey } from './i18n.js';
import { BibleController } from './overlay/BibleController.js';
import { BibleSlide } from './presenter/BibleSlide.js';
import { useBibleStore } from './store.js';
import css from './styles.css?inline';

const SURFACE_PANEL_ID = 'bible-controller';
const SURFACE_OPTIONS = {
  maximized: true,
  resizable: false,
  decorations: false,
  title: 'Bíblia',
} as const;

export default class BibleModulePlugin extends LumenPlugin {
  private styleEl: HTMLStyleElement | null = null;

  async onload(host: LumenHost): Promise<void> {
    this.styleEl = document.createElement('style');
    this.styleEl.setAttribute('data-module', host.meta.id);
    this.styleEl.textContent = css;
    document.head.appendChild(this.styleEl);

    setupI18n(host.app.locale);

    host.panels.add({
      id: SURFACE_PANEL_ID,
      slot: 'surface.window',
      title: 'Bíblia',
      component: BibleController,
    });

    if (host.window === 'presenter') {
      host.panels.add({
        id: 'bible-slide',
        slot: 'presenter.content',
        component: BibleSlide,
      });
    }

    host.commands.add({
      id: 'bible.open',
      title: t('bible.open'),
      run: () => {
        host.surface.openWindow(SURFACE_PANEL_ID, {}, SURFACE_OPTIONS);
      },
    });

    host.commands.add({
      id: 'bible.search',
      title: `${t('bible.search')}...`,
      run: () => {
        host.surface.openWindow(SURFACE_PANEL_ID, {}, SURFACE_OPTIONS);
      },
    });

    host.commands.add({
      id: 'bible.clear',
      title: t('bible.clear'),
      run: () => {
        host.presentation.clear();
      },
    });

    const makePrefix = (prefix: string): PrefixSpec => ({
      prefix,
      title: t('bible.title'),
      placeholder: t('bible.search-book'),
      handle: async (query) => {
        if (!query.trim()) return [];
        const ref = parseReference(query.trim(), BOOKS);
        if (ref) {
          const label = `${t(`book.${ref.book.id}` as TranslationKey)} ${ref.chapter}${ref.verse ? `:${ref.verse}` : ''}`;
          return [
            {
              id: `bible-go-to-${prefix}`,
              title: `${t('bible.go-to')} ${label}`,
              subtitle: ref.verse
                ? `${ref.verse}° ${t('bible.verse')}`
                : `${t('bible.chapter')} ${ref.chapter}`,
              run: () => {
                host.surface.openWindow(
                  SURFACE_PANEL_ID,
                  {
                    goToBook: ref.book.id,
                    goToChapter: ref.chapter,
                    goToVerse: ref.verse,
                  },
                  SURFACE_OPTIONS
                );
              },
            },
          ];
        }
        return [
          {
            id: `bible-search-${prefix}`,
            title: `${t('bible.search')} "${query}"`,
            subtitle: t('bible.no-results'),
            run: () => {
              host.surface.openWindow(SURFACE_PANEL_ID, {}, SURFACE_OPTIONS);
            },
          },
        ];
      },
    });

    const prefixes = ['bbl'];
    const locale = host.app.locale.toLowerCase();
    if (locale.startsWith('pt')) prefixes.push('biblia');
    else if (locale.startsWith('es')) prefixes.push('biblia');
    else prefixes.push('bible');
    for (const p of prefixes) host.commands.addPrefix(makePrefix(p));

    useBibleStore.getState().init({
      fs: host.fs,
      net: host.net,
      json: host.data.json,
      sqlite: () => host.data.sqlite(),
      presentation: host.presentation,
      t,
    });
  }

  async onunload(): Promise<void> {
    this.styleEl?.remove();
    this.styleEl = null;
  }
}
