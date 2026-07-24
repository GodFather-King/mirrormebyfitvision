import { useCallback, useEffect, useState } from 'react';

export type Workspace = 'consumer' | 'brand';

const STORAGE_KEY = 'mirrorme_workspace';
const REMEMBER_KEY = 'mirrorme_workspace_remember';

const readStored = (): Workspace | null => {
  if (typeof window === 'undefined') return null;
  const v = window.localStorage.getItem(STORAGE_KEY);
  return v === 'consumer' || v === 'brand' ? v : null;
};

const readRemember = (): boolean => {
  if (typeof window === 'undefined') return false;
  return window.localStorage.getItem(REMEMBER_KEY) === '1';
};

export const getRememberedWorkspace = (): Workspace | null => {
  return readRemember() ? readStored() : null;
};

export const useWorkspace = () => {
  const [workspace, setWorkspaceState] = useState<Workspace | null>(() => readStored());
  const [remember, setRememberState] = useState<boolean>(() => readRemember());

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) setWorkspaceState(readStored());
      if (e.key === REMEMBER_KEY) setRememberState(readRemember());
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const setWorkspace = useCallback((ws: Workspace, opts?: { remember?: boolean }) => {
    window.localStorage.setItem(STORAGE_KEY, ws);
    setWorkspaceState(ws);
    if (typeof opts?.remember === 'boolean') {
      window.localStorage.setItem(REMEMBER_KEY, opts.remember ? '1' : '0');
      setRememberState(opts.remember);
    }
  }, []);

  const setRemember = useCallback((v: boolean) => {
    window.localStorage.setItem(REMEMBER_KEY, v ? '1' : '0');
    setRememberState(v);
  }, []);

  const clear = useCallback(() => {
    window.localStorage.removeItem(STORAGE_KEY);
    window.localStorage.removeItem(REMEMBER_KEY);
    setWorkspaceState(null);
    setRememberState(false);
  }, []);

  return { workspace, remember, setWorkspace, setRemember, clear };
};
