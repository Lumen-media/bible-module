import en from './i18n/en.js';
import es from './i18n/es.js';
import ptBR from './i18n/pt-BR.js';

type Messages = Record<string, string>;
type Translations = Record<string, Messages>;

export type TranslationKey = keyof typeof en;
export type TFunction = (key: TranslationKey, params?: Record<string, string>) => string;

let _locale = 'en';

const _translations: Translations = {
  en,
  'pt-BR': ptBR,
  es,
};

const _alias: Record<string, string> = {
  'pt-br': 'pt-BR',
  'pt-pt': 'pt-BR',
  pt: 'pt-BR',
  'en-us': 'en',
  'en-gb': 'en',
  en: 'en',
  es: 'es',
};

function resolve(locale: string): Messages {
  if (!locale) return _translations.en;
  const norm = locale.toLowerCase();
  const aliased = _alias[norm];
  if (aliased) return _translations[aliased] ?? _translations.en;
  const prefix = norm.split('-')[0];
  return _translations[prefix] ?? _translations.en;
}

function detectLocale(): string {
  if (typeof document !== 'undefined') {
    const html = document.documentElement?.lang;
    if (html) return html;
  }
  if (typeof navigator !== 'undefined' && navigator.language) {
    return navigator.language;
  }
  return 'en';
}

export function setupI18n(locale: string) {
  _locale = locale || detectLocale();
}

export function t(key: TranslationKey, params?: Record<string, string>): string {
  const lang = resolve(detectLocale() || _locale || 'en');

  let message: string = lang[key] ?? key;

  if (params) {
    for (const [k, v] of Object.entries(params)) {
      message = message.replaceAll(`{{${k}}}`, v);
    }
  }

  return message;
}
