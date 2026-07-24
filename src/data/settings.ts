export interface BibleSettings {
  background: { type: string; src: string; name: string } | null;
  fontSize: number;
  fontFamily: string;
}

export const defaultSettings: BibleSettings = {
  background: null,
  fontSize: 36,
  fontFamily: 'Inter',
};
