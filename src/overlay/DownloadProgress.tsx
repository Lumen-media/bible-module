import { Progress } from '@lumen-media/module-sdk/ui';
import { memo } from 'react';
import { useBibleStore } from '../store.js';

export const DownloadProgress = memo(function DownloadProgress() {
  const downloading = useBibleStore((s) => s.downloading);
  const dlCurrent = useBibleStore((s) => s.dlCurrent);
  const dlTotal = useBibleStore((s) => s.dlTotal);

  if (!downloading || dlTotal <= 0) return null;

  const pct = dlTotal > 0 ? Math.round((dlCurrent / dlTotal) * 100) : 0;

  return (
    <div className="absolute inset-x-0 top-0 z-40">
      <Progress value={pct} className="h-1 rounded-none" />
    </div>
  );
});
