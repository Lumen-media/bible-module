import { useLocale } from '../hooks/useLocale.js';
import { BibleController } from './BibleController.js';

export function BiblePanel(props: Record<string, unknown>) {
  const locale = useLocale();

  return <BibleController key={locale} {...(props as Record<string, unknown>)} />;
}
