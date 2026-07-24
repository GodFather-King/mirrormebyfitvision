import { useCallback, useEffect, useState } from 'react';

const KEY = 'mirrorme_active_brand_id';

const read = (): string | null => {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(KEY);
};

export const useActiveBrand = () => {
  const [activeBrandId, setActiveBrandIdState] = useState<string | null>(() => read());

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === KEY) setActiveBrandIdState(read());
    };
    window.addEventListener('storage', onStorage);
    const onCustom = () => setActiveBrandIdState(read());
    window.addEventListener('mirrorme:active-brand', onCustom);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('mirrorme:active-brand', onCustom);
    };
  }, []);

  const setActiveBrandId = useCallback((id: string | null) => {
    if (id) window.localStorage.setItem(KEY, id);
    else window.localStorage.removeItem(KEY);
    setActiveBrandIdState(id);
    window.dispatchEvent(new Event('mirrorme:active-brand'));
  }, []);

  return { activeBrandId, setActiveBrandId };
};
