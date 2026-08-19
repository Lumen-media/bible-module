import { animate } from 'animejs';
import { memo, useEffect, useRef, useState } from 'react';
import loadingGif from '../../assets/loading.gif?inline';
import type { TFunction, TranslationKey } from '../i18n.js';
import { displayVersion } from '../lib/utils.js';

const LOADING_MSGS: TranslationKey[] = [
  'bible.dl-msg-1',
  'bible.dl-msg-2',
  'bible.dl-msg-3',
  'bible.dl-msg-4',
];

interface DownloadingStateProps {
  t: TFunction;
  isDownloading: boolean;
  dlVersion: string;
  dlCurrent: number;
  dlTotal: number;
}

export const DownloadingState = memo(function DownloadingState({
  t,
  isDownloading,
  dlVersion,
  dlCurrent,
  dlTotal,
}: DownloadingStateProps) {
  const [idx, setIdx] = useState(0);
  const textRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const id = setInterval(() => setIdx((i) => (i + 1) % LOADING_MSGS.length), 2600);
    return () => clearInterval(id);
  }, []);

  const message = t(LOADING_MSGS[idx]);

  useEffect(() => {
    const el = textRef.current;
    if (!el || !message) return;
    const player = animate(el, {
      opacity: [0.2, 1],
      translateY: [8, 0],
      duration: 500,
      easing: 'easeOutQuad',
    });
    return () => {
      player?.cancel();
    };
  }, [message]);

  const pct = dlTotal > 0 ? Math.round((dlCurrent / dlTotal) * 100) : 0;

  return (
    <div className="flex min-h-full flex-col items-center justify-center gap-2 px-6 text-center text-muted-foreground">
      <img src={loadingGif} alt="" className="h-16 w-16" />
      <span ref={textRef} className="text-sm leading-snug">
        {message}
      </span>
      {isDownloading && dlTotal > 0 && (
        <span className="text-xs opacity-70">
          {dlVersion.split(', ').map(displayVersion).join(', ')}
          {pct > 0 ? ` • ${pct}%` : ''}
        </span>
      )}
    </div>
  );
});
