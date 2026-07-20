import { type LumenHost, LumenPlugin } from '@lumen-media/module-sdk';
import { setupI18n, t } from './i18n.js';
import { BibleController } from './overlay/BibleController.js';
import { BibleSlide } from './presenter/BibleSlide.js';
import { useBibleStore } from './store.js';
import css from './styles.css?inline';

export default class BibleModulePlugin extends LumenPlugin {
  private styleEl: HTMLStyleElement | null = null;

  async onload(host: LumenHost): Promise<void> {
    this.styleEl = document.createElement('style');
    this.styleEl.setAttribute('data-module', host.meta.id);
    this.styleEl.textContent = css;
    document.head.appendChild(this.styleEl);

    setupI18n(host.app.locale);

    host.panels.add({
      id: 'bible-controller',
      slot: 'presenter.content',
      component: BibleController,
    });

    host.panels.add({
      id: 'bible-slide',
      slot: 'presenter.content',
      component: BibleSlide,
    });

    host.commands.add({
      id: 'bible.open',
      title: t('bible.open'),
      run: () => {
        host.overlay.project('bible-controller', {
          windowConfig: {
            maximized: true,
            resizable: false,
            decorations: false,
            title: 'Bíblia',
          },
        });
      },
    });

    host.commands.add({
      id: 'bible.search',
      title: `${t('bible.search')}...`,
      run: () => {
        host.overlay.project('bible-controller', {
          windowConfig: {
            maximized: true,
            resizable: false,
            decorations: false,
            title: 'Bíblia',
          },
        });
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
      presentation: host.presentation,
      t,
    });
  }

  async onunload(): Promise<void> {
    this.styleEl?.remove();
    this.styleEl = null;
  }
}
