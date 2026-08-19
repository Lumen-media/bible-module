import { useEffect, useState } from 'react';
import { currentLocale, subscribeLocale } from '../i18n.js';

export function useLocale(): string {
  const [locale, setLocale] = useState<string>(() => currentLocale());

  useEffect(() => subscribeLocale(() => setLocale(currentLocale())), []);

  return locale;
}
