import { Progress } from '@lumen-media/module-sdk/ui';
import { memo, useState } from 'react';
import type { TFunction } from '../i18n.js';

export const DownloadProgress = memo(function DownloadProgress({ t }: { t: TFunction }) {
  const [state, setState] = useState({
    downloading: false,
    dlCurrent: 0,
    dlTotal: 0,
    dlVersion: '',
  });

  if (!state.downloading || state.dlTotal <= 0) return null;

  const pct = state.dlTotal > 0 ? Math.round((state.dlCurrent / state.dlTotal) * 100) : 0;

  return (
    <div className="absolute inset-x-0 top-0 z-40">
      <Progress value={pct} className="h-1 rounded-none" />
    </div>
  );
});
