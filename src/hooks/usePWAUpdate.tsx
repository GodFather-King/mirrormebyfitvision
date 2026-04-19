import { createContext, useContext, useEffect, useState, ReactNode, useCallback, useRef } from 'react';
import { toast } from 'sonner';

const APP_BUILD_ID = __APP_BUILD_ID__;

interface PWAUpdateContextValue {
  updateAvailable: boolean;
  isUpdating: boolean;
  isChecking: boolean;
  latestBuildId: string | null;
  applyUpdate: () => Promise<void>;
  checkForUpdates: () => Promise<void>;
}

const PWAUpdateContext = createContext<PWAUpdateContextValue>({
  updateAvailable: false,
  isUpdating: false,
  isChecking: false,
  latestBuildId: null,
  applyUpdate: async () => {},
  checkForUpdates: async () => {},
});

const isPreviewEnvironment = () => {
  if (typeof window === 'undefined') return false;

  const isPreviewHost =
    window.location.hostname.includes('id-preview--') ||
    window.location.hostname.includes('lovableproject.com');

  try {
    return isPreviewHost || window.self !== window.top;
  } catch {
    return true;
  }
};

const showUpdateToast = (onClick: () => void) => {
  toast.info('A new version of MirrorMe is available', {
    duration: 8000,
    action: {
      label: 'Update',
      onClick,
    },
  });
};

export const PWAUpdateProvider = ({ children }: { children: ReactNode }) => {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [latestBuildId, setLatestBuildId] = useState<string | null>(null);
  const updateSWRef = useRef<((reload?: boolean) => Promise<void>) | null>(null);
  const registrationRef = useRef<ServiceWorkerRegistration | null>(null);

  const forceReload = useCallback(async () => {
    if (typeof window === 'undefined') return;

    try {
      if ('caches' in window) {
        const cacheKeys = await caches.keys();
        await Promise.all(cacheKeys.map((key) => caches.delete(key)));
      }
    } catch {
      // Ignore cache cleanup failures and continue with a hard reload attempt
    }

    const nextUrl = new URL(window.location.href);
    nextUrl.searchParams.set('__refresh', Date.now().toString());
    window.location.replace(nextUrl.toString());
  }, []);

  const applyUpdateInternal = useCallback(async (fn: ((reload?: boolean) => Promise<void>) | null) => {
    if (!fn) {
      await forceReload();
      return;
    }

    setIsUpdating(true);
    try {
      const controllerChangePromise = new Promise<void>((resolve) => {
        if (typeof navigator === 'undefined' || !navigator.serviceWorker) {
          resolve();
          return;
        }

        let resolved = false;
        const handleControllerChange = () => {
          if (resolved) return;
          resolved = true;
          navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange);
          resolve();
        };

        navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);

        window.setTimeout(() => {
          if (resolved) return;
          resolved = true;
          navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange);
          resolve();
        }, 4000);
      });

      await fn(true);
      await controllerChangePromise;
      await forceReload();
    } catch {
      await forceReload();
    }
  }, [forceReload]);

  const checkLatestBuild = useCallback(async () => {
    if (typeof window === 'undefined') return false;

    try {
      const response = await fetch(`/version.json?t=${Date.now()}`, {
        cache: 'no-store',
        headers: {
          'cache-control': 'no-cache',
        },
      });

      if (!response.ok) return false;

      const data = (await response.json()) as { buildId?: string };
      if (data.buildId) {
        setLatestBuildId(data.buildId);
      }
      if (data.buildId && data.buildId !== APP_BUILD_ID) {
        setUpdateAvailable((currentValue) => {
          if (!currentValue) {
            showUpdateToast(() => {
              void applyUpdateInternal(updateSWRef.current);
            });
          }

          return true;
        });
        return true;
      }
    } catch {
      // Silent when version metadata cannot be fetched
    }

    return false;
  }, [applyUpdateInternal]);

  const checkForUpdates = useCallback(async () => {
    if (typeof window === 'undefined') return;

    setIsChecking(true);
    const t = toast.loading('Checking for updates…');
    try {
      if (registrationRef.current) {
        await registrationRef.current.update();
      }

      const hasUpdate = await checkLatestBuild();
      if (hasUpdate) {
        toast.success('New version found — tap Update to reload', { id: t });
      } else {
        toast.success('You are on the latest version', { id: t });
      }
    } catch {
      toast.error('Unable to check for updates right now', { id: t });
    } finally {
      setIsChecking(false);
    }
  }, [checkLatestBuild]);

  const applyUpdate = useCallback(async () => {
    await applyUpdateInternal(updateSWRef.current);
  }, [applyUpdateInternal]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    if (isPreviewEnvironment()) {
      navigator.serviceWorker?.getRegistrations().then((registrations) => {
        registrations.forEach((registration) => {
          void registration.unregister();
        });
      });
      return;
    }

    let cancelled = false;
    let intervalId: number | undefined;

    const handleForegroundCheck = () => {
      if (document.visibilityState !== 'visible') return;
      void checkForUpdates();
    };

    window.addEventListener('focus', handleForegroundCheck);
    window.addEventListener('online', handleForegroundCheck);
    document.addEventListener('visibilitychange', handleForegroundCheck);

    void (async () => {
      try {
        const { registerSW } = await import('virtual:pwa-register');
        const update = registerSW({
          onNeedRefresh() {
            if (cancelled) return;
            setUpdateAvailable(true);
            showUpdateToast(() => {
              void applyUpdateInternal(update);
            });
          },
          onRegisteredSW(_swUrl, registration) {
            if (!registration || cancelled) return;

            registrationRef.current = registration;
            void registration.update().catch(() => {});
            void checkLatestBuild();

            registration.addEventListener('updatefound', () => {
              const installingWorker = registration.installing;
              if (!installingWorker) return;

              installingWorker.addEventListener('statechange', () => {
                if (installingWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  setUpdateAvailable(true);
                }
              });
            });

            intervalId = window.setInterval(() => {
              if (document.visibilityState === 'visible') {
                void registration.update().catch(() => {});
                void checkLatestBuild();
              }
            }, 60 * 1000);
          },
        });

        if (!cancelled) {
          updateSWRef.current = update;
        }
      } catch {
        // Silent in environments where PWA registration is unavailable
      } finally {
        if (!cancelled) {
          void checkLatestBuild();
        }
      }
    })();

    return () => {
      cancelled = true;
      if (intervalId) clearInterval(intervalId);
      window.removeEventListener('focus', handleForegroundCheck);
      window.removeEventListener('online', handleForegroundCheck);
      document.removeEventListener('visibilitychange', handleForegroundCheck);
    };
  }, [applyUpdateInternal, checkForUpdates, checkLatestBuild]);

  return (
    <PWAUpdateContext.Provider value={{ updateAvailable, isUpdating, isChecking, latestBuildId, applyUpdate, checkForUpdates }}>
      {children}
    </PWAUpdateContext.Provider>
  );
};

export const usePWAUpdate = () => useContext(PWAUpdateContext);
