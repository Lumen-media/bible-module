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

/**
 * Limits an Unsplash image URL to the size of the container that will render
 * it (times the device pixel ratio), so the browser never loads the original
 * multi-megabyte asset. Non-Unsplash URLs pass through untouched.
 */
export function optimizeImageUrl(
  src: string,
  width?: number,
  height?: number,
  quality = 80
): string {
  if (!src) return src;
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
