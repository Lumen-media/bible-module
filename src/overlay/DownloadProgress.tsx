import { Download } from 'lucide-react';
import type { TFunction } from '../i18n.js';

interface DownloadProgressProps {
  visible: boolean;
  current: number;
  total: number;
  version: string;
  t: TFunction;
}

export function DownloadProgress({ visible, current, total, version, t }: DownloadProgressProps) {
  if (!visible) return null;

  const pct = total > 0 ? Math.round((current / total) * 100) : 0;

  return (
    <div className="absolute inset-x-0 top-0 z-40">
      <div className="flex items-center gap-2 bg-primary/10 px-4 py-1.5 text-xs text-primary">
        <Download className="h-3.5 w-3.5 animate-pulse" />
        <span>
          {t('bible.download-progress', {
            version: version.toUpperCase(),
            current: String(current),
            total: String(total),
          })}
        </span>
        <span className="font-mono tabular-nums">{pct}%</span>
      </div>
      <div className="h-1 bg-muted">
        <div
          className="h-full bg-primary transition-all duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
