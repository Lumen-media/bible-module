import en from './i18n/en.js';
import es from './i18n/es.js';
import ptBR from './i18n/pt-BR.js';

type Messages = Record<string, string>;
type Translations = Record<string, Messages>;

export type TranslationKey = keyof typeof en;
export type TFunction = (key: TranslationKey, params?: Record<string, string>) => string;

let _locale = 'en';

const _translations: Translations = { en, 'pt-BR': ptBR, es };

export function setupI18n(locale: string) {
  _locale = locale;
}

export function t(key: TranslationKey, params?: Record<string, string>): string {
  const lang =
    _translations[_locale] ?? _translations[_locale.split('-')[0]] ?? _translations.en ?? {};

  let message: string = lang[key] ?? key;

  if (params) {
    for (const [k, v] of Object.entries(params)) {
      message = message.replaceAll(`{{${k}}}`, v);
    }
  }

  return message;
}
