import {
  Badge,
  Button,
  Card,
  Combobox,
  Dialog,
  Label,
  Popover,
  ScrollArea,
  Separator,
  Slider,
  Switch,
  ToggleGroup,
} from '@lumen-media/module-sdk/ui';
import { Database, Download, HardDrive, Palette, Type } from 'lucide-react';
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { HexColorPicker } from 'react-colorful';
import { useDebounceCallback } from 'usehooks-ts';
import { getDownloadedVersions } from '../data/store.js';
import { type TranslationKey, t } from '../i18n.js';
import { cn } from '../lib/utils.js';
import { ALL_VERSIONS, useBibleStore } from '../store.js';
import { SlidePreview } from './SlidePreview.js';

type SectionId = 'typography' | 'theme' | 'downloads' | 'cache';

const FONT_WEIGHTS = ['Light', 'Regular', 'Medium', 'Bold'] as const;
const FONT_STYLES = ['Normal', 'Italic'] as const;

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(k)), sizes.length - 1);
  return `${(bytes / k ** i).toFixed(i === 0 ? 0 : 1)} ${sizes[i]}`;
}

const _LangLabels: Record<string, string> = {
  'pt-br': 'PT-BR',
  'pt-pt': 'PT-PT',
  'en-us': 'EN-US',
  'en-gb': 'EN-GB',
  es: 'ES',
};

const SectionNav = memo(function SectionNav({
  section,
  onSection,
}: {
  section: SectionId;
  onSection: (s: SectionId) => void;
}) {
  return (
    <Card className="w-56 shrink-0 p-0 border-0 rounded-none rounded-bl-xl">
      <div className="flex flex-col gap-1.5 p-2">
        <p className="mb-1 px-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          {t('bible.section-general' as TranslationKey)}
        </p>
        <Button
          variant="ghost"
          onClick={() => onSection('typography')}
          className={cn('w-full justify-start gap-2.5', {
            'bg-primary/10 text-primary font-medium': section === 'typography',
          })}
        >
          <Type className="size-4" />
          {t('bible.typography' as TranslationKey)}
        </Button>
        <Button
          variant="ghost"
          onClick={() => onSection('theme')}
          className={cn('w-full justify-start gap-2.5', {
            'bg-primary/10 text-primary font-medium': section === 'theme',
          })}
        >
          <Palette className="size-4" />
          {t('bible.theme' as TranslationKey)}
        </Button>

        <p className="mb-1 mt-3 px-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          {t('bible.section-data' as TranslationKey)}
        </p>
        <Button
          variant="ghost"
          onClick={() => onSection('downloads')}
          className={cn('w-full justify-start gap-2.5', {
            'bg-primary/10 text-primary font-medium': section === 'downloads',
          })}
        >
          <Download className="size-4" />
          {t('bible.downloads' as TranslationKey)}
        </Button>
        <Button
          variant="ghost"
          onClick={() => onSection('cache')}
          className={cn('w-full justify-start gap-2.5', {
            'bg-primary/10 text-primary font-medium': section === 'cache',
          })}
        >
          <Database className="size-4" />
          {t('bible.cache-storage' as TranslationKey)}
        </Button>
      </div>
    </Card>
  );
});

const TypographySection = memo(function TypographySection() {
  const fontSize = useBibleStore((s) => s.fontSize);
  const fontFamily = useBibleStore((s) => s.fontFamily);
  const fontList = useBibleStore((s) => s.fontList);
  const setFontSize = useBibleStore((s) => s.setFontSize);
  const setFontFamily = useBibleStore((s) => s.setFontFamily);
  const fontWeight = useBibleStore((s) => s.fontWeight);
  const fontStyle = useBibleStore((s) => s.fontStyle);
  const setFontWeight = useBibleStore((s) => s.setFontWeight);
  const setFontStyle = useBibleStore((s) => s.setFontStyle);
  const uppercase = useBibleStore((s) => s.uppercase);
  const showReferenceOnly = useBibleStore((s) => s.showReferenceOnly);
  const showVersion = useBibleStore((s) => s.showVersion);
  const abbreviatedBooks = useBibleStore((s) => s.abbreviatedBooks);
  const setUppercase = useBibleStore((s) => s.setUppercase);
  const setShowReferenceOnly = useBibleStore((s) => s.setShowReferenceOnly);
  const setShowVersion = useBibleStore((s) => s.setShowVersion);
  const setAbbreviatedBooks = useBibleStore((s) => s.setAbbreviatedBooks);
  const fontColor = useBibleStore((s) => s.fontColor);
  const setFontColor = useBibleStore((s) => s.setFontColor);
  const autoFontColor = useBibleStore((s) => s.autoFontColor);
  const setAutoFontColor = useBibleStore((s) => s.setAutoFontColor);

  const [fontInput, setFontInput] = useState(fontFamily);
  const [localFontSize, setLocalFontSize] = useState(String(fontSize));
  const [localFontColor, setLocalFontColor] = useState(fontColor);
  const debouncedSetFontColor = useDebounceCallback(setFontColor, 200);
  const debouncedSetFontSize = useDebounceCallback(setFontSize, 100);

  useEffect(() => {
    setFontInput(fontFamily);
  }, [fontFamily]);
  useEffect(() => {
    setLocalFontSize(String(fontSize));
  }, [fontSize]);
  useEffect(() => {
    setLocalFontColor(fontColor);
  }, [fontColor]);

  const commitFontSize = useCallback(() => {
    const n = parseInt(localFontSize, 10);
    if (!Number.isNaN(n) && n >= 12 && n <= 2000) {
      setLocalFontSize(String(n));
      setFontSize(n);
    } else {
      setLocalFontSize(String(fontSize));
    }
  }, [localFontSize, fontSize, setFontSize]);

  const filteredFonts = useMemo(() => {
    const q = fontInput.trim().toLowerCase();
    return q ? fontList.filter((f) => f.toLowerCase().includes(q)) : fontList;
  }, [fontInput, fontList]);

  return (
    <div className="space-y-4 pb-4">
      <div>
        <h3 className="text-base font-semibold text-foreground">
          {t('bible.typography' as TranslationKey)}
        </h3>
        <p className="text-xs text-muted-foreground">
          {t('bible.typography-desc' as TranslationKey)}
        </p>
      </div>

      <Card>
        <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          {t('bible.live-preview' as TranslationKey)}
        </span>
        <SlidePreview />
      </Card>

      <Card>
        <Card.CardHeader className="pb-2">
          <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            {t('bible.font' as TranslationKey)}
          </span>
        </Card.CardHeader>
        <Card.CardContent className="space-y-4 p-4 pt-0">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground">
                {t('bible.font-family' as TranslationKey)}
              </p>
              <p className="text-xs text-muted-foreground">
                {t('bible.font-family-desc' as TranslationKey)}
              </p>
            </div>
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
                className="h-8 w-44 text-xs"
              />
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
            </Combobox>
          </div>

          <Separator />

          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground">
                {t('bible.font-weight' as TranslationKey)}
              </p>
              <p className="text-xs text-muted-foreground">
                {t('bible.font-weight-desc' as TranslationKey)}
              </p>
            </div>
            <ToggleGroup
              value={[fontWeight]}
              onValueChange={(v) => {
                const next = v.find((w) => w !== fontWeight);
                if (next) setFontWeight(next);
              }}
              size="sm"
              variant="secondary"
              className="bg-background w-fit justify-between overflow-hidden"
            >
              {FONT_WEIGHTS.map((w) => (
                <ToggleGroup.ToggleGroupItem key={w} value={w} className="flex-1 px-4">
                  {w}
                </ToggleGroup.ToggleGroupItem>
              ))}
            </ToggleGroup>
          </div>

          <Separator />

          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground">
                {t('bible.font-style' as TranslationKey)}
              </p>
              <p className="text-xs text-muted-foreground">
                {t('bible.font-style-desc' as TranslationKey)}
              </p>
            </div>
            <ToggleGroup
              value={[fontStyle]}
              onValueChange={(v) => {
                const next = v.find((s) => s !== fontStyle);
                if (next) setFontStyle(next);
              }}
              size="sm"
              variant="secondary"
              className="bg-background w-fit justify-between overflow-hidden"
            >
              {FONT_STYLES.map((s) => (
                <ToggleGroup.ToggleGroupItem
                  key={s}
                  value={s}
                  className={cn('flex-1 px-4', { italic: s === 'Italic' })}
                >
                  {s}
                </ToggleGroup.ToggleGroupItem>
              ))}
            </ToggleGroup>
          </div>

          <Separator />

          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground">
                {t('bible.font-size' as TranslationKey)}
              </p>
              <p className="text-xs text-muted-foreground">
                {t('bible.font-size-desc' as TranslationKey)}
              </p>
            </div>
            <div className="flex w-44 items-center rounded-md border border-border bg-background">
              <input
                type="number"
                min={12}
                max={2000}
                step={1}
                value={localFontSize}
                onChange={(e) => setLocalFontSize(e.target.value)}
                onBlur={commitFontSize}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    commitFontSize();
                    return;
                  }
                  if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
                    e.preventDefault();
                    const current = parseInt(localFontSize, 10);
                    const base = Number.isNaN(current) ? fontSize : current;
                    const delta = e.key === 'ArrowUp' ? 1 : -1;
                    const next = Math.min(2000, Math.max(12, base + delta));
                    setLocalFontSize(String(next));
                    debouncedSetFontSize(next);
                  }
                }}
                className="h-8 w-full bg-transparent px-2 text-xs outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
              />
              <span className="pr-2 text-[11px] text-muted-foreground">px</span>
            </div>
          </div>

          <Separator />

          <Label className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground">
                {t('bible.uppercase' as TranslationKey)}
              </p>
              <p className="text-xs text-muted-foreground">
                {t('bible.uppercase-desc' as TranslationKey)}
              </p>
            </div>
            <Switch checked={uppercase} onCheckedChange={setUppercase} />
          </Label>

          <Separator />

          <Label className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground">
                {t('bible.reference-only' as TranslationKey)}
              </p>
              <p className="text-xs text-muted-foreground">
                {t('bible.reference-only-desc' as TranslationKey)}
              </p>
            </div>
            <Switch checked={showReferenceOnly} onCheckedChange={setShowReferenceOnly} />
          </Label>

          <Separator />

          <Label className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground">
                {t('bible.show-version' as TranslationKey)}
              </p>
              <p className="text-xs text-muted-foreground">
                {t('bible.show-version-desc' as TranslationKey)}
              </p>
            </div>
            <Switch checked={showVersion} onCheckedChange={setShowVersion} />
          </Label>

          <Separator />

          <Label className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground">
                {t('bible.abbreviated-books' as TranslationKey)}
              </p>
              <p className="text-xs text-muted-foreground">
                {t('bible.abbreviated-books-desc' as TranslationKey)}
              </p>
            </div>
            <Switch checked={abbreviatedBooks} onCheckedChange={setAbbreviatedBooks} />
          </Label>

          <Separator />

          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground">
                {t('bible.font-color' as TranslationKey)}
              </p>
              <p className="text-xs text-muted-foreground">
                {t('bible.font-color-desc' as TranslationKey)}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={localFontColor}
                onChange={(e) => {
                  const val = e.target.value;
                  if (/^#[0-9a-fA-F]{0,6}$/.test(val)) {
                    setLocalFontColor(val);
                    if (/^#[0-9a-fA-F]{6}$/.test(val)) debouncedSetFontColor(val);
                  }
                }}
                onBlur={() => {
                  if (!/^#[0-9a-fA-F]{6}$/.test(localFontColor)) {
                    setLocalFontColor('#FFFFFF');
                    setFontColor('#FFFFFF');
                  }
                }}
                disabled={autoFontColor}
                className="h-8 w-20 rounded-md border border-border bg-background px-2 text-xs font-mono text-foreground outline-none disabled:opacity-40 disabled:cursor-not-allowed"
              />
              <Popover>
                <Popover.PopoverTrigger disabled={autoFontColor}>
                  <div
                    className={cn(
                      'h-8 w-8 shrink-0 rounded-md border border-border',
                      autoFontColor ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'
                    )}
                    style={{ backgroundColor: localFontColor }}
                  />
                </Popover.PopoverTrigger>
                <Popover.PopoverContent className="w-fit p-2" align="end">
                  <HexColorPicker
                    color={localFontColor}
                    onChange={(c) => {
                      setLocalFontColor(c);
                      debouncedSetFontColor(c);
                    }}
                  />
                </Popover.PopoverContent>
              </Popover>
              <ToggleGroup
                value={autoFontColor ? ['auto'] : ['manual']}
                onValueChange={(v) => {
                  setAutoFontColor(v.includes('auto'));
                }}
                size="sm"
                variant="secondary"
                className="bg-background w-fit overflow-hidden"
              >
                <ToggleGroup.ToggleGroupItem value="auto" className="px-2 text-[11px]">
                  Auto
                </ToggleGroup.ToggleGroupItem>
                <ToggleGroup.ToggleGroupItem value="manual" className="px-2 text-[11px]">
                  Manual
                </ToggleGroup.ToggleGroupItem>
              </ToggleGroup>
            </div>
          </div>
        </Card.CardContent>
      </Card>
    </div>
  );
});

const ThemeSection = memo(function ThemeSection() {
  const backgroundOpacity = useBibleStore((s) => s.backgroundOpacity);
  const setBackgroundOpacity = useBibleStore((s) => s.setBackgroundOpacity);
  const background = useBibleStore((s) => s.background);
  const profileBackground = useBibleStore((s) => s.profileBackground);
  const setBackground = useBibleStore((s) => s.setBackground);
  const pickBackground = useBibleStore((s) => s.pickBackground);

  const [localBackgroundOpacity, setLocalBackgroundOpacity] = useState(backgroundOpacity);
  const debouncedSetBackgroundOpacity = useDebounceCallback(setBackgroundOpacity, 150);

  useEffect(() => {
    setLocalBackgroundOpacity(backgroundOpacity);
  }, [backgroundOpacity]);

  return (
    <div className="flex-1 min-h-0 flex flex-col gap-4">
      <div>
        <h3 className="text-base font-semibold text-foreground">
          {t('bible.theme' as TranslationKey)}
        </h3>
        <p className="text-xs text-muted-foreground">{t('bible.theme-desc' as TranslationKey)}</p>
      </div>

      <Card>
        <Card.CardContent className="space-y-3 p-4">
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground">
                {t('bible.background' as TranslationKey)}
              </p>
              <p className="text-xs text-muted-foreground">
                {t('bible.choose-background' as TranslationKey)}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {background?.src ? (
                <Badge variant="outline" className="max-w-40 truncate">
                  {background.name ?? background.src}
                </Badge>
              ) : profileBackground?.name ? (
                <Badge variant="outline" className="max-w-40 truncate">
                  {profileBackground.name}
                </Badge>
              ) : (
                <span className="text-xs text-muted-foreground">
                  {t('bible.default' as TranslationKey)}
                </span>
              )}
              <Button size="sm" variant="outline" onClick={pickBackground}>
                {t('bible.choose-background' as TranslationKey)}
              </Button>
              {background?.src ? (
                <Button size="sm" variant="ghost" onClick={() => setBackground(null)}>
                  {t('bible.reset-background' as TranslationKey)}
                </Button>
              ) : null}
            </div>
          </div>

          <Separator />

          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground">
                {t('bible.backdrop-intensity' as TranslationKey)}
              </p>
              <p className="text-xs text-muted-foreground">
                {t('bible.backdrop-intensity-desc' as TranslationKey)}
              </p>
            </div>
            <div className="flex w-52 shrink-0 items-center gap-3">
              <Slider
                value={[localBackgroundOpacity]}
                min={0}
                max={100}
                step={1}
                onValueChange={(v) => {
                  setLocalBackgroundOpacity(v[0]);
                  debouncedSetBackgroundOpacity(v[0]);
                }}
                className="flex-1"
              />
              <span className="w-9 shrink-0 text-right text-xs font-mono tabular-nums text-foreground">
                {localBackgroundOpacity}%
              </span>
            </div>
          </div>
        </Card.CardContent>
      </Card>

      <Card>
        <Card.CardContent className="space-y-2 p-4">
          <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            {t('bible.preview' as TranslationKey)}
          </span>
          <SlidePreview />
        </Card.CardContent>
      </Card>
    </div>
  );
});

const DownloadsSection = memo(function DownloadsSection() {
  const version = useBibleStore((s) => s.version);
  const downloadingVersions = useBibleStore((s) => s.downloadingVersions);
  const downloadVersionOnly = useBibleStore((s) => s.downloadVersionOnly);
  const removeVersion = useBibleStore((s) => s.removeVersion);
  const setVersion = useBibleStore((s) => s.setVersion);
  const json = useBibleStore((s) => s.json);

  const [downloadedIds, setDownloadedIds] = useState<string[]>([]);

  useEffect(() => {
    if (!json) return;
    getDownloadedVersions(json).then(setDownloadedIds);
  }, [json, downloadingVersions]);

  return (
    <div className="flex-1 min-h-0 flex flex-col gap-4">
      <div>
        <h3 className="text-base font-semibold text-foreground">
          {t('bible.downloads' as TranslationKey)}
        </h3>
        <p className="text-xs text-muted-foreground">
          {t('bible.downloads-desc' as TranslationKey)}
        </p>
      </div>

      <Card className="flex-1 min-h-0 flex flex-col">
        <Card.CardContent className="flex-1 overflow-hidden p-0">
          <ScrollArea className="size-full">
            <ul className="divide-y divide-border">
              {ALL_VERSIONS.map((v) => {
                const downloaded = downloadedIds.includes(v.id);
                const downloading = downloadingVersions.includes(v.id);
                const active = version === v.id;
                return (
                  <li key={v.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">{v.name}</p>
                      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                        {v.language} · {v.id}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {active ? (
                        <Badge variant="secondary">{t('bible.active' as TranslationKey)}</Badge>
                      ) : downloaded ? (
                        <Badge variant="outline">{t('bible.downloaded' as TranslationKey)}</Badge>
                      ) : null}
                      {downloading ? (
                        <Badge>{t('bible.downloading' as TranslationKey, { version: v.id })}</Badge>
                      ) : downloaded ? (
                        <>
                          {!active && (
                            <Button
                              size="xs"
                              variant="ghost"
                              onClick={() => {
                                const tabs = useBibleStore.getState().displayedTabs;
                                if (!tabs.includes(v.id) && tabs.length > 0) {
                                  const next = [...tabs];
                                  next[next.length - 1] = v.id;
                                  useBibleStore.getState().setDisplayedTabs(next);
                                }
                                setVersion(v.id);
                              }}
                            >
                              {t('bible.use' as TranslationKey)}
                            </Button>
                          )}
                          <Button
                            size="xs"
                            variant="ghost"
                            disabled={active || downloadedIds.length <= 3}
                            onClick={async () => {
                              await removeVersion(v.id);
                              if (json) getDownloadedVersions(json).then(setDownloadedIds);
                            }}
                          >
                            {t('bible.remove' as TranslationKey)}
                          </Button>
                        </>
                      ) : (
                        <Button
                          size="xs"
                          variant="outline"
                          onClick={() => downloadVersionOnly(v.id)}
                        >
                          <Download className="mr-1 h-3.5 w-3.5" />
                          {t('bible.download' as TranslationKey)}
                        </Button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </ScrollArea>
        </Card.CardContent>
      </Card>
    </div>
  );
});

const CacheSection = memo(function CacheSection() {
  const json = useBibleStore((s) => s.json);
  const fs = useBibleStore((s) => s.fs);

  const [downloadedIds, setDownloadedIds] = useState<string[]>([]);
  const [cacheBytes, setCacheBytes] = useState<number | null>(null);
  const [clearing, setClearing] = useState(false);

  useEffect(() => {
    if (!json) return;
    getDownloadedVersions(json).then(setDownloadedIds);
  }, [json]);

  const cacheCheckRef = useRef(0);
  useEffect(() => {
    if (!fs) return;
    let cancelled = false;
    const requestId = ++cacheCheckRef.current;
    (async () => {
      try {
        const exists = await fs.exists('cache').catch(() => false);
        if (cancelled || requestId !== cacheCheckRef.current) return;
        if (!exists) {
          setCacheBytes(0);
          return;
        }
        const list = await fs.list('cache').catch(() => []);
        if (cancelled || requestId !== cacheCheckRef.current) return;
        let total = 0;
        for (const entry of list as string[]) {
          try {
            const data = await fs.read(`cache/${entry}`);
            if (data instanceof Uint8Array) total += data.byteLength;
            else if (Array.isArray(data)) total += (data as number[]).length;
            else if (typeof data === 'string') total += new Blob([data]).size;
          } catch {}
        }
        if (cancelled || requestId !== cacheCheckRef.current) return;
        setCacheBytes(total);
      } catch {
        if (!cancelled && requestId === cacheCheckRef.current) setCacheBytes(0);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [fs]);

  const handleClearCache = useCallback(async () => {
    if (!fs || !json || clearing) return;
    setClearing(true);
    try {
      try {
        await fs.remove('cache');
      } catch {}
      await json.set('bibleFonts', []);
      setDownloadedIds([]);
      setCacheBytes(0);
    } finally {
      setClearing(false);
    }
  }, [fs, json, clearing]);

  return (
    <div className="flex-1 min-h-0 flex flex-col gap-4">
      <div>
        <h3 className="text-base font-semibold text-foreground">
          {t('bible.cache-storage' as TranslationKey)}
        </h3>
        <p className="text-xs text-muted-foreground">
          {t('bible.cache-storage-desc' as TranslationKey)}
        </p>
      </div>

      <Card className="flex-1">
        <Card.CardContent className="space-y-3 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">
                {t('bible.cache-size' as TranslationKey)}
              </p>
              <p className="text-xs text-muted-foreground">
                {t('bible.cache-size-desc' as TranslationKey)}
              </p>
            </div>
            <span className="text-sm font-mono tabular-nums text-foreground">
              {cacheBytes === null ? '—' : formatBytes(cacheBytes)}
            </span>
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">
                {t('bible.downloaded-versions' as TranslationKey)}
              </p>
              <p className="text-xs text-muted-foreground">
                {t('bible.downloaded-versions-desc' as TranslationKey)}
              </p>
            </div>
            <span className="text-sm font-mono tabular-nums text-foreground">
              {downloadedIds.length}
            </span>
          </div>
          <Separator />
          <div className="flex items-center justify-end gap-2 pt-1">
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                if (fs && json) json.get('bibleFonts').then(() => setCacheBytes(null));
              }}
            >
              {t('bible.refresh' as TranslationKey)}
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={handleClearCache}
              disabled={clearing || !cacheBytes}
            >
              <HardDrive className="mr-1 h-3.5 w-3.5" />
              {t('bible.clear-cache' as TranslationKey)}
            </Button>
          </div>
        </Card.CardContent>
      </Card>
    </div>
  );
});

export const PreferencesModal = ({ children }: { children: React.ReactNode }) => {
  const [section, setSection] = useState<SectionId>('typography');
  const saveSettings = useBibleStore((s) => s.saveSettings);

  useEffect(() => {
    return () => {
      saveSettings();
    };
  }, [saveSettings]);

  const renderContent = () => {
    switch (section) {
      case 'typography':
        return <TypographySection />;
      case 'theme':
        return <ThemeSection />;
      case 'downloads':
        return <DownloadsSection />;
      case 'cache':
        return <CacheSection />;
    }
  };

  return (
    <Dialog>
      <Dialog.DialogTrigger>{children}</Dialog.DialogTrigger>
      <Dialog.DialogContent className="w-full p-0 gap-0 sm:max-w-[60dvw] h-full max-h-[70dvh] flex flex-col">
        <Card className="shrink-0 rounded-b-none border-0 border-none">
          <h3>Preferences</h3>
        </Card>

        <div className="flex flex-1 min-h-0">
          <SectionNav section={section} onSection={setSection} />
          <Separator orientation="vertical" />
          <Card className="flex-1 p-0 border-0 bg-transparent rounded-none rounded-br-xl overflow-hidden">
            <ScrollArea className="size-full">
              <div className="flex flex-col size-full p-4 gap-4">{renderContent()}</div>
            </ScrollArea>
          </Card>
        </div>
      </Dialog.DialogContent>
    </Dialog>
  );
};
