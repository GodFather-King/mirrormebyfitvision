import { useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { trackEvent, trackPostSignupEngagement } from '@/hooks/usePageTracking';

const TIMEOUT_MS = 60_000; // 60 seconds

interface TryOnParams {
  body: Record<string, any>;
  functionName: string;
}

interface TryOnResult {
  tryOnUrl: string;
  message?: string;
}

/**
 * Invokes a try-on edge function with a 60s timeout and one automatic retry.
 * Returns the result or throws on failure.
 */
export function useTryOnWithRetry() {
  const abortRef = useRef<AbortController | null>(null);

  const invoke = useCallback(async ({ body, functionName }: TryOnParams): Promise<TryOnResult> => {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < 2; attempt++) {
      // Abort any previous in-flight request
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

      try {
        const fetchPromise = supabase.functions.invoke(functionName, { body });

        // Race between fetch and abort
        const result = await Promise.race([
          fetchPromise,
          new Promise<never>((_, reject) => {
            controller.signal.addEventListener('abort', () =>
              reject(new Error(attempt === 0 ? '__timeout_retry__' : 'Request timed out. Please try again.'))
            );
          }),
        ]);

        clearTimeout(timeoutId);

        const { data, error } = result as { data: any; error: any };
        if (error) throw error;

        if (data?.tryOnUrl) {
          trackEvent('try_on_complete', { function: functionName });
          trackPostSignupEngagement('try_on_complete');
          return { tryOnUrl: data.tryOnUrl, message: data.message };
        }

        throw new Error(data?.error || 'No image was generated');
      } catch (err: any) {
        clearTimeout(timeoutId);
        lastError = err;

        // Only retry on timeout, not on other errors
        if (err?.message === '__timeout_retry__') {
          console.log('Try-on timed out, retrying once...');
          continue;
        }

        // Non-timeout errors: don't retry
        throw err;
      }
    }

    // If we get here, both attempts timed out
    throw new Error('Try-on took too long. Please try again with a simpler image.');
  }, []);

  const cancel = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  return { invoke, cancel };
}
