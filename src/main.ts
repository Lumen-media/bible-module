import { type LumenHost, LumenPlugin } from '@lumen-media/module-sdk';
import { setupI18n, t } from './i18n.js';
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
