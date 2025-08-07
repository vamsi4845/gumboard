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
  const lastDataRef = useRef<string | null>(null);
  const dynamicIntervalRef = useRef(interval);
  const lastActivityRef = useRef(Date.now());
  const etagRef = useRef<string | null>(null);

  useEffect(() => {
    const updateActivity = () => {
      lastActivityRef.current = Date.now();
      dynamicIntervalRef.current = interval;
    };
    
    const events = ['mousedown', 'keydown', 'touchstart'];
    events.forEach(e => document.addEventListener(e, updateActivity));
    
    return () => {
      events.forEach(e => document.removeEventListener(e, updateActivity));
    };
  }, [interval]);

  const fetchData = useCallback(async () => {
    if (!enabled || !isTabActiveRef.current) return;

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();

    try {
      const headers: HeadersInit = {
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
      };
      
      if (etagRef.current) {
        headers['If-None-Match'] = etagRef.current;
      }

      const response = await fetch(url, {
        signal: abortControllerRef.current.signal,
        headers,
      });

      if (response.status === 304) {
        const timeSinceActivity = Date.now() - lastActivityRef.current;
        if (timeSinceActivity > 30000) {
          dynamicIntervalRef.current = Math.min(interval * 2, 10000);
        }
        return;
      }

      if (response.ok) {
        const newEtag = response.headers.get('ETag');
        if (newEtag) {
          etagRef.current = newEtag;
        }

        const data = await response.json();
        const dataStr = JSON.stringify(data);
        
        if (dataStr !== lastDataRef.current) {
          lastDataRef.current = dataStr;
          setLastSync(new Date());
          onUpdate?.(data);
        }
        
        const timeSinceActivity = Date.now() - lastActivityRef.current;
        if (timeSinceActivity > 30000) {
          dynamicIntervalRef.current = Math.min(interval * 2, 10000);
        }
      }
    } catch (error: any) {
      if (error.name !== 'AbortError') {
        console.error('Polling error:', error);
      }
    }
  }, [url, enabled, onUpdate, interval]);

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

    const startPolling = () => {
      fetchData();
      
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      
      intervalRef.current = setInterval(() => {
        if (isTabActiveRef.current) {
          fetchData();
          
          if (dynamicIntervalRef.current !== interval) {
            clearInterval(intervalRef.current!);
            intervalRef.current = setInterval(() => {
              if (isTabActiveRef.current) fetchData();
            }, dynamicIntervalRef.current);
          }
        }
      }, dynamicIntervalRef.current);
    };

    startPolling();

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