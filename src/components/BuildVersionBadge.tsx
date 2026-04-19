import { usePWAUpdate } from '@/hooks/usePWAUpdate';

const APP_BUILD_ID = __APP_BUILD_ID__;

const formatBuildId = (id: string) => {
  // Show YYYY-MM-DD HH:mm UTC instead of full ISO
  try {
    const d = new Date(id);
    if (isNaN(d.getTime())) return id;
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())} UTC`;
  } catch {
    return id;
  }
};

const isStandalone = () => {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia?.('(display-mode: standalone)').matches ||
    // iOS Safari
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  );
};

const BuildVersionBadge = () => {
  const { updateAvailable, latestBuildId } = usePWAUpdate();
  const installed = isStandalone();

  return (
    <div className="px-4 pb-4 pt-2 text-[10px] leading-tight text-muted-foreground/80 space-y-0.5">
      <div className="flex items-center justify-between gap-2">
        <span className="uppercase tracking-wider">Build</span>
        <span className="font-mono">{formatBuildId(APP_BUILD_ID)}</span>
      </div>
      {latestBuildId && latestBuildId !== APP_BUILD_ID && (
        <div className="flex items-center justify-between gap-2 text-primary">
          <span className="uppercase tracking-wider">Live</span>
          <span className="font-mono">{formatBuildId(latestBuildId)}</span>
        </div>
      )}
      <div className="flex items-center justify-between gap-2">
        <span>{installed ? 'Installed app' : 'Browser'}</span>
        <span>
          {updateAvailable
            ? 'Update available'
            : latestBuildId && latestBuildId === APP_BUILD_ID
              ? 'Up to date'
              : 'Checking…'}
        </span>
      </div>
    </div>
  );
};

export default BuildVersionBadge;
