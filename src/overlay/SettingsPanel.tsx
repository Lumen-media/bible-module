import { Settings } from 'lucide-react';
import { type TranslationKey, t } from '../i18n.js';
import { PreferencesModal } from './PreferencesModal.js';

export function SettingsPanel() {
  return (
    <PreferencesModal>
      <div className="flex items-center" title={t('bible.settings' as TranslationKey)}>
        <Settings className="h-3.5 w-3.5" />
        {t('bible.settings' as TranslationKey)}
      </div>
    </PreferencesModal>
  );
}
