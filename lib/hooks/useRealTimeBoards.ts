import { useEffect, useRef, useCallback, useState } from 'react';

interface UseRealTimeBoardsOptions {
  enabled?: boolean;
  pollingInterval?: number;
  onUpdate?: (data: any) => void;
}

export function useRealTimeBoards({
  enabled = true,
  pollingInterval = 5000,
  onUpdate,
}: UseRealTimeBoardsOptions) {
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const isTabActiveRef = useRef(true);
  const [isPolling, setIsPolling] = useState(false);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchBoards = useCallback(async () => {
    if (!enabled || !isTabActiveRef.current) return;

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;

    setIsPolling(true);

    try {
      const response = await fetch('/api/boards', {
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache',
        },
        signal: controller.signal,
      });

      if (response.ok) {
        const data = await response.json();
        setLastSync(new Date());
        if (onUpdate) {
          onUpdate(data);
        }
      }
    } catch (error: any) {
      if (error.name !== 'AbortError') {
        console.error('Boards polling error:', error);
      }
    } finally {
      setIsPolling(false);
    }
  }, [enabled, onUpdate]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      isTabActiveRef.current = !document.hidden;
      
      if (isTabActiveRef.current && enabled) {
        fetchBoards();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [fetchBoards, enabled]);

  useEffect(() => {
    if (!enabled) return;

    fetchBoards();

    intervalRef.current = setInterval(() => {
      if (isTabActiveRef.current) {
        fetchBoards();
      }
    }, pollingInterval);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [enabled, pollingInterval, fetchBoards]);

  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return { isPolling, lastSync };
}