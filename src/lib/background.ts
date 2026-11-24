import { mix, readableColor } from 'polished';
import { analyzeBackgroundColor } from './color-analysis.js';
import { lumenThumbVariant } from './utils.js';

const GENERATOR_PREFIX = 'lumen-bg://generator/';
const DEFAULT_COLOR_A = '#0b1020';
const DEFAULT_COLOR_B = '#1a1030';

type BackgroundLike = { type?: string; src?: string; name?: string; thumb?: string } | null | undefined;

export interface GeneratorRef {
  effect: string;
  params: Record<string, string | number | boolean>;
  seed: number;
  name: string;
}

/**
 * True when a background is a host generator. The host sends `type:
 * 'generator'` with the reference encoded in `src`; some boundaries only carry
 * the URI, so the prefix is checked as well.
 */
export function isGeneratorBackground(bg: BackgroundLike | string): boolean {
  // If bg is a plain string URI (e.g. from host), check the prefix directly
  if (typeof bg === 'string') return bg.startsWith(GENERATOR_PREFIX);
  return !!bg && (bg.type === 'generator' || (bg.src ?? '').startsWith(GENERATOR_PREFIX));
}

function decodeBase64Url(value: string): string {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
  const binary = atob(padded);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

/** Tolerant `lumen-bg://generator/<effect>?...` parser: malformed input is null. */
export function parseGenerator(src: string | null | undefined): GeneratorRef | null {
  if (!src?.startsWith(GENERATOR_PREFIX)) return null;

  const rest = src.slice(GENERATOR_PREFIX.length);
  const queryIndex = rest.indexOf('?');
  const rawEffect = queryIndex === -1 ? rest : rest.slice(0, queryIndex);
  const query = queryIndex === -1 ? '' : rest.slice(queryIndex + 1);

  let effect: string;
  try {
    effect = decodeURIComponent(rawEffect);
  } catch {
    return null;
  }
  if (!effect) return null;

  const search = new URLSearchParams(query);

  let params: Record<string, string | number | boolean> = {};
  const encoded = search.get('p');
  if (encoded) {
    try {
      const parsed = JSON.parse(decodeBase64Url(encoded)) as unknown;
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        params = parsed as Record<string, string | number | boolean>;
      }
    } catch {
      params = {};
    }
  }

  const seed = Number(search.get('seed'));

  return {
    effect,
    params,
    seed: Number.isFinite(seed) ? Math.max(0, Math.trunc(seed)) : 0,
    name: search.get('n')?.trim() || effect,
  };
}

function safeColor(value: unknown, fallback: string): string {
  return typeof value === 'string' && /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(value.trim())
    ? value.trim()
    : fallback;
}

function generatorColors(ref: GeneratorRef): { colorA: string; colorB: string } {
  return {
    colorA: safeColor(ref.params.colorA, DEFAULT_COLOR_A),
    colorB: safeColor(ref.params.colorB, DEFAULT_COLOR_B),
  };
}

/**
 * Drops the host poster (a large data URL) before a background is persisted or
 * shipped to other windows: both sides can regenerate it from the URI.
 */
export function stripPoster<T extends object>(bg: T | null): T | null {
  if (!bg || !('thumb' in bg)) return bg;
  const { thumb: _thumb, ...rest } = bg as T & { thumb?: string };
  return rest as T;
}

/** Readable text color for a generator palette. */
export function generatorTextColor(src: string | null | undefined): '#FFFFFF' | '#000000' | null {
  const ref = parseGenerator(src);
  if (!ref) return null;
  const { colorA, colorB } = generatorColors(ref);
  return readableColor(mix(0.5, colorA, colorB), '#FFFFFF', '#000000', false) as
    | '#FFFFFF'
    | '#000000';
}

/** Text color for any background: sampled from images, derived from the palette. */
export async function backgroundTextColor(bg: BackgroundLike): Promise<'#FFFFFF' | '#000000'> {
  if (!bg?.src) return '#FFFFFF';
  if (isGeneratorBackground(bg)) return generatorTextColor(bg.src) ?? '#FFFFFF';
  // A 64px variant is all the average needs; the original can be a 4K
  // wallpaper and decoding it on the main thread stalls the panel.
  return analyzeBackgroundColor(lumenThumbVariant(bg.src, 64, 40) ?? bg.src);
}

/**
 * Props that make the host render the generator behind the projected view.
 * The host owns the shader runtime, so modules only pass the reference through.
 */
export function generatorBackdropProps(bg: BackgroundLike | string): {
  background: 'media';
  backgroundMedia: { type: 'generator'; src: string; name: string };
} | null {
  if (!isGeneratorBackground(bg)) return null;
  const src = typeof bg === 'string' ? bg : bg?.src;
  if (!src) return null;
  const name =
    (typeof bg === 'string' ? undefined : bg?.name) || parseGenerator(src)?.name || 'Generator';
  return {
    background: 'media',
    backgroundMedia: { type: 'generator', src, name },
  };
}
