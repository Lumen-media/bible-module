import en from './i18n/en.js';
import enGB from './i18n/en-GB.js';
import es from './i18n/es.js';
import esAR from './i18n/es-AR.js';
import ptBR from './i18n/pt-BR.js';
import ptPT from './i18n/pt-PT.js';

type Messages = Record<string, string>;
type Translations = Record<string, Messages>;

export type TranslationKey = keyof typeof en;
export type TFunction = (key: TranslationKey, params?: Record<string, string>) => string;

let _locale = 'en';

const _localeListeners = new Set<() => void>();

const _translations: Translations = {
  en,
  'en-GB': enGB,
  'pt-BR': ptBR,
  'pt-PT': ptPT,
  es,
  'es-AR': esAR,
};

const _alias: Record<string, string> = {
  'pt-br': 'pt-BR',
  'pt-pt': 'pt-PT',
  pt: 'pt-BR',
  'en-us': 'en',
  'en-gb': 'en-GB',
  en: 'en',
  es: 'es',
  'es-ar': 'es-AR',
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
  for (const listener of _localeListeners) listener();
}

export function currentLocale(): string {
  return _locale || detectLocale();
}

export function subscribeLocale(listener: () => void): () => void {
  _localeListeners.add(listener);
  return () => {
    _localeListeners.delete(listener);
  };
}

export function t(key: TranslationKey, params?: Record<string, string>): string {
  const lang = resolve(_locale || detectLocale() || 'en');

  let message: string = lang[key] ?? key;

  if (params) {
    for (const [k, v] of Object.entries(params)) {
      message = message.replaceAll(`{${k}}`, v);
    }
  }

  return message;
}

export function tForVersion(versionLang: string, key: string): string {
  const resolved = _alias[versionLang.toLowerCase()] ?? versionLang;
  const messages = _translations[resolved] ?? _translations.en;
  return (messages as Record<string, string>)[key] ?? (en as Record<string, string>)[key] ?? key;
}
