import { useState, useEffect, createContext, useContext, ReactNode, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import type { Json } from '@/integrations/supabase/types';

// Constants for localStorage keys
const AVATAR_URL_KEY = 'mirrorme_latest_avatar_url';
const AVATAR_MEASUREMENTS_KEY = 'mirrorme_latest_measurements';
const AVATAR_ID_KEY = 'mirrorme_latest_avatar_id';

export interface AvatarMeasurements {
  height_cm: number;
  chest_cm: number;
  waist_cm: number;
  hips_cm: number;
  shoulders_cm: number;
  inseam_cm: number;
  body_type: string;
}

export interface SavedAvatar {
  id: string;
  name: string;
  front_view_url: string | null;
  side_view_url: string | null;
  back_view_url: string | null;
  measurements: AvatarMeasurements | null;
  created_at: string;
}

interface AvatarContextType {
  // Core avatar state
  avatar: SavedAvatar | null;
  avatarUrl: string | null;
  measurements: AvatarMeasurements | null;
  
  // Loading and status
  isLoading: boolean;
  isReady: boolean;
  source: 'account' | 'device' | null;
  
  // Actions
  setAvatar: (avatar: SavedAvatar) => void;
  updateAvatarFromGeneration: (
    avatarUrl: string, 
    measurements: AvatarMeasurements, 
    autoSave?: boolean
  ) => Promise<void>;
  refreshAvatar: () => Promise<void>;
  clearAvatar: () => void;
  
  // Helpers
  hasAvatar: boolean;
  requiresAvatar: () => boolean;
}

const defaultMeasurements: AvatarMeasurements = {
  height_cm: 170,
  chest_cm: 92,
  waist_cm: 82,
  hips_cm: 98,
  shoulders_cm: 44,
  inseam_cm: 81,
  body_type: 'average',
};

const AvatarContext = createContext<AvatarContextType | undefined>(undefined);

export const AvatarProvider = ({ children }: { children: ReactNode }) => {
  const { user, loading: authLoading } = useAuth();
  
  // Avatar state
  const [avatar, setAvatarState] = useState<SavedAvatar | null>(null);
  const [localAvatarUrl, setLocalAvatarUrl] = useState<string | null>(null);
  const [localMeasurements, setLocalMeasurements] = useState<AvatarMeasurements | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Derived state
  const avatarUrl = avatar?.front_view_url || localAvatarUrl;
  const measurements = avatar?.measurements || localMeasurements;
  const hasAvatar = Boolean(avatarUrl);
  const isReady = !isLoading && hasAvatar;
  const source: 'account' | 'device' | null = avatar?.front_view_url 
    ? 'account' 
    : localAvatarUrl 
      ? 'device' 
      : null;

  // Load avatar from localStorage on mount
  useEffect(() => {
    try {
      const cachedUrl = localStorage.getItem(AVATAR_URL_KEY);
      const cachedMeasurements = localStorage.getItem(AVATAR_MEASUREMENTS_KEY);
      
      if (cachedUrl) {
        setLocalAvatarUrl(cachedUrl);
      }
      
      if (cachedMeasurements) {
        try {
          setLocalMeasurements(JSON.parse(cachedMeasurements));
        } catch {
          // Ignore parse errors
        }
      }
    } catch {
      // Ignore localStorage errors
    }
  }, []);

  // Fetch avatar from database when user is available
  const fetchDatabaseAvatar = useCallback(async () => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('saved_avatars')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error('Error fetching avatar:', error);
      } else if (data) {
        const parsedMeasurements = data.measurements 
          ? (typeof data.measurements === 'string' 
              ? JSON.parse(data.measurements) 
              : data.measurements) as AvatarMeasurements
          : null;
        
        setAvatarState({
          id: data.id,
          name: data.name,
          front_view_url: data.front_view_url,
          side_view_url: data.side_view_url,
          back_view_url: data.back_view_url,
          measurements: parsedMeasurements,
          created_at: data.created_at,
        });

        // Also cache to localStorage for offline access
        if (data.front_view_url) {
          try {
            localStorage.setItem(AVATAR_URL_KEY, data.front_view_url);
            localStorage.setItem(AVATAR_ID_KEY, data.id);
            if (parsedMeasurements) {
              localStorage.setItem(AVATAR_MEASUREMENTS_KEY, JSON.stringify(parsedMeasurements));
            }
          } catch {
            // Ignore storage errors
          }
        }
      }
    } catch (err) {
      console.error('Failed to fetch avatar:', err);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!authLoading) {
      fetchDatabaseAvatar();
    }
  }, [authLoading, fetchDatabaseAvatar]);

  // Set avatar (from DB or component)
  const setAvatar = useCallback((newAvatar: SavedAvatar) => {
    setAvatarState(newAvatar);
    
    // Update localStorage
    if (newAvatar.front_view_url) {
      try {
        localStorage.setItem(AVATAR_URL_KEY, newAvatar.front_view_url);
        localStorage.setItem(AVATAR_ID_KEY, newAvatar.id);
        if (newAvatar.measurements) {
          localStorage.setItem(AVATAR_MEASUREMENTS_KEY, JSON.stringify(newAvatar.measurements));
        }
      } catch {
        // Ignore
      }
    }
  }, []);

  // Update avatar after generation
  const updateAvatarFromGeneration = useCallback(async (
    newAvatarUrl: string,
    newMeasurements: AvatarMeasurements,
    autoSave: boolean = true
  ) => {
    // Always update local state immediately
    setLocalAvatarUrl(newAvatarUrl);
    setLocalMeasurements(newMeasurements);
    
    // Cache to localStorage
    try {
      localStorage.setItem(AVATAR_URL_KEY, newAvatarUrl);
      localStorage.setItem(AVATAR_MEASUREMENTS_KEY, JSON.stringify(newMeasurements));
    } catch {
      // Ignore
    }

    // If user is signed in and autoSave is enabled, save to database
    if (user && autoSave) {
      try {
        const { data, error } = await supabase
          .from('saved_avatars')
          .insert([{
            user_id: user.id,
            name: `Avatar ${new Date().toLocaleDateString()}`,
            front_view_url: newAvatarUrl,
            measurements: JSON.parse(JSON.stringify(newMeasurements)) as Json
          }])
          .select()
          .single();

        if (error) {
          console.error('Auto-save avatar error:', error);
        } else if (data) {
          const savedAvatar: SavedAvatar = {
            id: data.id,
            name: data.name,
            front_view_url: data.front_view_url,
            side_view_url: data.side_view_url,
            back_view_url: data.back_view_url,
            measurements: newMeasurements,
            created_at: data.created_at,
          };
          setAvatarState(savedAvatar);
          
          // Update localStorage with the saved ID
          try {
            localStorage.setItem(AVATAR_ID_KEY, data.id);
          } catch {
            // Ignore
          }
          
          console.log('Avatar auto-saved to account');
        }
      } catch (saveErr) {
        console.error('Failed to auto-save avatar:', saveErr);
      }
    }
  }, [user]);

  // Refresh avatar from database
  const refreshAvatar = useCallback(async () => {
    setIsLoading(true);
    await fetchDatabaseAvatar();
  }, [fetchDatabaseAvatar]);

  // Clear avatar state
  const clearAvatar = useCallback(() => {
    setAvatarState(null);
    setLocalAvatarUrl(null);
    setLocalMeasurements(null);
    
    try {
      localStorage.removeItem(AVATAR_URL_KEY);
      localStorage.removeItem(AVATAR_MEASUREMENTS_KEY);
      localStorage.removeItem(AVATAR_ID_KEY);
    } catch {
      // Ignore
    }
  }, []);

  // Helper to check if avatar is required
  const requiresAvatar = useCallback(() => {
    return !hasAvatar;
  }, [hasAvatar]);

  return (
    <AvatarContext.Provider 
      value={{ 
        avatar,
        avatarUrl,
        measurements,
        isLoading,
        isReady,
        source,
        setAvatar,
        updateAvatarFromGeneration,
        refreshAvatar,
        clearAvatar,
        hasAvatar,
        requiresAvatar,
      }}
    >
      {children}
    </AvatarContext.Provider>
  );
};

export const useAvatar = () => {
  const context = useContext(AvatarContext);
  if (context === undefined) {
    throw new Error('useAvatar must be used within an AvatarProvider');
  }
  return context;
};

// Export default measurements for components that need initial values
export { defaultMeasurements };
