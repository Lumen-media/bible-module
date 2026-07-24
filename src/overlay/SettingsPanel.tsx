import { Combobox, Dialog } from '@lumen-media/module-sdk/ui';
import { Settings } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { type TranslationKey, t } from '../i18n.js';
import { useBibleStore } from '../store.js';

export function SettingsPanel() {
  const fontSize = useBibleStore((s) => s.fontSize);
  const fontFamily = useBibleStore((s) => s.fontFamily);
  const fontList = useBibleStore((s) => s.fontList);
  const setFontSize = useBibleStore((s) => s.setFontSize);
  const setFontFamily = useBibleStore((s) => s.setFontFamily);

  const [localFontSize, setLocalFontSize] = useState(String(fontSize));
  const [fontInput, setFontInput] = useState(fontFamily);

  useEffect(() => {
    setLocalFontSize(String(fontSize));
  }, [fontSize]);

  useEffect(() => {
    setFontInput(fontFamily);
  }, [fontFamily]);

  const commitFontSize = useCallback(() => {
    const n = parseInt(localFontSize, 10);
    if (!Number.isNaN(n) && n >= 12 && n <= 120) {
      setLocalFontSize(String(n));
      setFontSize(n);
    } else {
      setLocalFontSize(String(fontSize));
    }
  }, [localFontSize, fontSize, setFontSize]);

  const filteredFonts = fontInput.trim()
    ? fontList.filter((f) => f.toLowerCase().includes(fontInput.trim().toLowerCase()))
    : fontList;

  return (
    <Dialog>
      <Dialog.DialogTrigger
        className='flex items-center'
        title={t('bible.settings' as TranslationKey)}
      >
        <Settings className="h-3.5 w-3.5" />
        {t('bible.settings' as TranslationKey)}
      </Dialog.DialogTrigger>
      <Dialog.DialogContent className="w-85 p-0">
        <Dialog.DialogHeader className="px-4 pt-4 pb-0">
          <Dialog.DialogTitle className="text-sm">
            {t('bible.settings' as TranslationKey)}
          </Dialog.DialogTitle>
        </Dialog.DialogHeader>

        <div className="space-y-5 px-4 py-3">
          <div>
            <span className="mb-2 block text-xs font-medium">
              {t('bible.typography' as TranslationKey)}
            </span>
            <div className="space-y-3">
              <div>
                <span className="mb-1 flex items-center gap-1 text-[11px] text-muted-foreground">
                  {t('bible.font-size' as TranslationKey)}
                </span>
                <div className="flex items-center rounded-md border border-border bg-background">
                  <input
                    type="text"
                    inputMode="numeric"
                    value={localFontSize}
                    onChange={(e) => setLocalFontSize(e.target.value)}
                    onBlur={commitFontSize}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') commitFontSize();
                    }}
                    className="h-8 w-full bg-transparent px-2 text-xs outline-none"
                  />
                  <span className="pr-2 text-[11px] text-muted-foreground">px</span>
                </div>
              </div>
              <div>
                <span className="mb-1 block text-[11px] text-muted-foreground">
                  {t('bible.font-family' as TranslationKey)}
                </span>
                <Combobox
                  value={fontFamily}
                  onValueChange={(v) => {
                    if (v) {
                      setFontFamily(v);
                      setFontInput(v);
                    }
                  }}
                  inputValue={fontInput}
                  onInputValueChange={setFontInput}
                >
                  <Combobox.ComboboxInput
                    placeholder={t('bible.font-family' as TranslationKey)}
                    className="w-full rounded-md border border-border bg-background text-xs"
                  />
                  {fontInput.trim() && (
                    <Combobox.ComboboxContent className="max-h-60">
                      <Combobox.ComboboxList>
                        {filteredFonts.length > 0 ? (
                          filteredFonts.map((f) => (
                            <Combobox.ComboboxItem key={f} value={f} className="text-xs">
                              <span style={{ fontFamily: f }}>{f}</span>
                            </Combobox.ComboboxItem>
                          ))
                        ) : (
                          <div className="py-3 text-center text-xs text-muted-foreground">
                            {t('bible.no-results' as TranslationKey)}
                          </div>
                        )}
                      </Combobox.ComboboxList>
                    </Combobox.ComboboxContent>
                  )}
                </Combobox>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-border bg-muted/30 p-3">
            <span className="mb-2 block text-[11px] text-muted-foreground">
              {t('bible.preview' as TranslationKey)}
            </span>
            <p
              className="text-center leading-snug text-foreground"
              style={{ fontSize: `${Math.max(10, fontSize * 0.4)}px`, fontFamily }}
            >
              "Porque Deus amou o mundo de tal maneira que deu o seu Filho unigênito..."
            </p>
            <p
              className="mt-1 text-center text-[10px] text-muted-foreground"
              style={{ fontFamily }}
            >
              João 3:16
            </p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 px-4 py-3">
          <Dialog.DialogClose >
            {t('bible.close' as TranslationKey)}
          </Dialog.DialogClose>
        </div>
      </Dialog.DialogContent>
    </Dialog>
  );
}
