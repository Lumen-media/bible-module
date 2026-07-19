import en from "./i18n/en.js";
import ptBR from "./i18n/pt-BR.js";

type Messages = Record<string, string>;
type Translations = Record<string, Messages>;

export type TranslationKey = keyof typeof en;

let _locale = "en";

const _translations: Translations = { en, "pt-BR": ptBR };

export function setupI18n(locale: string) {
  _locale = locale;
}

export function t(key: TranslationKey, params?: Record<string, string | number>): string {
  const lang =
    _translations[_locale] ??
    _translations[_locale.split("-")[0]] ??
    _translations["en"] ??
    {};

  let message = lang[key] ?? key;

  if (params) {
    for (const [k, v] of Object.entries(params)) {
      message = message.replaceAll(`{{${k}}}`, String(v));
    }
  }

  return message;
}
