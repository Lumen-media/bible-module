import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const PREFIX_REGEX = /^[a-z]{2}_/;

export function displayVersion(id: string): string {
  return id.replace(PREFIX_REGEX, '').toUpperCase();
}

export function getReferenceSize(fontSize: number): number {
  return Math.max(14, Math.min(48, Math.round(fontSize * 0.8)));
}

const UNSPLASH_HOSTS = new Set(['images.unsplash.com', 'source.unsplash.com']);
const UNRESIZABLE_EXT_REGEX = /\.(mp4|webm|mov|m4v|avi|mkv|gif|svg)$/i;

/**
 * Small variant of a lumen-served image. `lumen.localhost` serves the original
 * file, which is often a multi-megabyte wallpaper; `lumen-thumb` downscales and
 * caches it off the main thread. Returns null for sources the host cannot
 * resize (theme/module routes, remote URLs, videos, animated GIFs).
 */
export function lumenThumbVariant(src: string, width: number, quality = 60): string | null {
  let url: URL;
  try {
    url = new URL(src);
  } catch {
    return null;
  }
  if (url.hostname !== 'lumen.localhost') return null;
  const path = url.searchParams.get('src');
  if (!path || UNRESIZABLE_EXT_REGEX.test(path)) return null;
  const query = new URLSearchParams({
    src: path,
    w: String(Math.max(1, Math.round(width))),
    q: String(quality),
  });
  return `http://lumen-thumb.localhost?${query.toString()}`;
}

/**
 * Limits an image URL to the size of the container that will render it (times
 * the device pixel ratio), so the browser never loads the original
 * multi-megabyte asset. Handles Unsplash and `lumen.localhost` files; every
 * other URL passes through untouched.
 */
export function optimizeImageUrl(
  src: string,
  width?: number,
  height?: number,
  quality = 80
): string {
  if (!src) return src;

  if (width) {
    // Width is measured after the first paint, so round it to a 320px bucket:
    // an exact width would make the browser fetch the image a second time.
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const bucket = Math.ceil((width * dpr) / 320) * 320;
    const sized = lumenThumbVariant(src, bucket, quality);
    if (sized) return sized;
  }

  try {
    const url = new URL(src, 'https://images.unsplash.com');
    if (!UNSPLASH_HOSTS.has(url.hostname)) return src;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    if (width) url.searchParams.set('w', String(Math.round(width * dpr)));
    if (height) url.searchParams.set('h', String(Math.round(height * dpr)));
    url.searchParams.set('q', String(quality));
    url.searchParams.set('fit', 'crop');
    url.searchParams.set('auto', 'format');
    return url.toString();
  } catch {
    return src;
  }
}
