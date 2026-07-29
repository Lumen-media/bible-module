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
  return Math.max(14, Math.min(48, Math.round(fontSize * 0.4)));
}
