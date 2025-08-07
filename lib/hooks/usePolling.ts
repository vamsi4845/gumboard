import { useEffect, useRef, useState, useCallback } from 'react';

interface UsePollingOptions {
  url: string;
  enabled?: boolean;
  interval?: number;
  onUpdate?: (data: any) => void;
}

export function usePolling({
  url,
  enabled = true,
  interval = 5000,
  onUpdate,
}: UsePollingOptions) {
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const isTabActiveRef = useRef(true);
  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchData = useCallback(async () => {
    if (!enabled || !isTabActiveRef.current) return;

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();

    try {
      const response = await fetch(url, {
        signal: abortControllerRef.current.signal,
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setLastSync(new Date());
        onUpdate?.(data);
      }
    } catch (error: any) {
      if (error.name !== 'AbortError') {
        console.error('Polling error:', error);
      }
    }
  }, [url, enabled, onUpdate]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      isTabActiveRef.current = !document.hidden;
      if (isTabActiveRef.current && enabled) {
        fetchData();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [fetchData, enabled]);

  useEffect(() => {
    if (!enabled) return;

    fetchData();

    intervalRef.current = setInterval(() => {
      if (isTabActiveRef.current) {
        fetchData();
      }
    }, interval);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
    };
  }, [enabled, interval, fetchData]);

  return { lastSync };
}