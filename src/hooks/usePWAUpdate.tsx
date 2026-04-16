import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { toast } from 'sonner';

interface PWAUpdateContextValue {
  updateAvailable: boolean;
  isUpdating: boolean;
  applyUpdate: () => Promise<void>;
}

const PWAUpdateContext = createContext<PWAUpdateContextValue>({
  updateAvailable: false,
  isUpdating: false,
  applyUpdate: async () => {},
});

export const PWAUpdateProvider = ({ children }: { children: ReactNode }) => {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateSW, setUpdateSW] = useState<((reload?: boolean) => Promise<void>) | null>(null);

  useEffect(() => {
    let cancelled = false;
    let intervalId: number | undefined;

    (async () => {
      try {
        // Dynamic import — virtual module is only available when PWA plugin is active
        const { registerSW } = await import('virtual:pwa-register');
        const update = registerSW({
          onNeedRefresh() {
            if (cancelled) return;
            setUpdateAvailable(true);
            toast.info('A new version of MirrorMe is available', {
              duration: 8000,
              action: {
                label: 'Update',
                onClick: () => {
                  applyUpdateInternal(update);
                },
              },
            });
          },
          onRegisteredSW(_swUrl, registration) {
            // Periodically check for updates (every 30 min)
            if (registration) {
              intervalId = window.setInterval(() => {
                registration.update().catch(() => {});
              }, 30 * 60 * 1000);
            }
          },
        });
        if (!cancelled) setUpdateSW(() => update);
      } catch {
        // PWA not registered (dev mode) — silent
      }
    })();

    return () => {
      cancelled = true;
      if (intervalId) clearInterval(intervalId);
    };
  }, []);

  const applyUpdateInternal = async (fn: ((reload?: boolean) => Promise<void>) | null) => {
    if (!fn) {
      window.location.reload();
      return;
    }
    setIsUpdating(true);
    try {
      await fn(true);
    } catch {
      window.location.reload();
    }
  };

  const applyUpdate = useCallback(async () => {
    await applyUpdateInternal(updateSW);
  }, [updateSW]);

  return (
    <PWAUpdateContext.Provider value={{ updateAvailable, isUpdating, applyUpdate }}>
      {children}
    </PWAUpdateContext.Provider>
  );
};

export const usePWAUpdate = () => useContext(PWAUpdateContext);
