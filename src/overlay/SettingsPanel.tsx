import { Button } from '@lumen-media/module-sdk/ui';
import { Settings } from 'lucide-react';
import { type TranslationKey, t } from '../i18n.js';
import { PreferencesModal } from './PreferencesModal.js';

export function SettingsPanel() {
  return (
    <PreferencesModal>
      <Button className='p-1' size="icon-xs" variant="outline" title={t('bible.settings' as TranslationKey)}>
        <Settings />
      </Button>
    </PreferencesModal>
  );
}
