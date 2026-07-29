import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const PREFIX_REGEX = /^[a-z]{2}_/;

export function displayVersion(id: string): string {
  return id.replace(PREFIX_REGEX, '').toUpperCase();
}
