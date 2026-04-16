import { createContext, useContext, useEffect, useState, ReactNode, useCallback, useRef } from 'react';
import { toast } from 'sonner';

interface PWAUpdateContextValue {
  updateAvailable: boolean;
  isUpdating: boolean;
  isChecking: boolean;
  applyUpdate: () => Promise<void>;
  checkForUpdates: () => Promise<void>;
}

const PWAUpdateContext = createContext<PWAUpdateContextValue>({
  updateAvailable: false,
  isUpdating: false,
  isChecking: false,
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

export const PWAUpdateProvider = ({ children }: { children: ReactNode }) => {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const updateSWRef = useRef<((reload?: boolean) => Promise<void>) | null>(null);
  const registrationRef = useRef<ServiceWorkerRegistration | null>(null);

  const checkForUpdates = useCallback(async () => {
    const registration = registrationRef.current;
    if (!registration || typeof window === 'undefined') return;

    setIsChecking(true);
    try {
      await registration.update();
    } catch {
      // Silent: no-op if the network is unavailable or no new build exists
    } finally {
      setIsChecking(false);
    }
  }, []);

  const applyUpdateInternal = useCallback(async (fn: ((reload?: boolean) => Promise<void>) | null) => {
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
  }, []);

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

    void (async () => {
      try {
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
                  void applyUpdateInternal(update);
                },
              },
            });
          },
          onRegisteredSW(_swUrl, registration) {
            if (!registration || cancelled) return;

            registrationRef.current = registration;
            void registration.update().catch(() => {});

            intervalId = window.setInterval(() => {
              if (document.visibilityState === 'visible') {
                void registration.update().catch(() => {});
              }
            }, 5 * 60 * 1000);
          },
        });

        if (!cancelled) {
          updateSWRef.current = update;
        }
      } catch {
        // Silent in environments where PWA registration is unavailable
      }
    })();

    window.addEventListener('focus', handleForegroundCheck);
    window.addEventListener('online', handleForegroundCheck);
    document.addEventListener('visibilitychange', handleForegroundCheck);

    return () => {
      cancelled = true;
      if (intervalId) clearInterval(intervalId);
      window.removeEventListener('focus', handleForegroundCheck);
      window.removeEventListener('online', handleForegroundCheck);
      document.removeEventListener('visibilitychange', handleForegroundCheck);
    };
  }, [applyUpdateInternal, checkForUpdates]);

  return (
    <PWAUpdateContext.Provider value={{ updateAvailable, isUpdating, isChecking, applyUpdate, checkForUpdates }}>
      {children}
    </PWAUpdateContext.Provider>
  );
};

export const usePWAUpdate = () => useContext(PWAUpdateContext);
