import { useEffect, useRef, useState, useCallback } from 'react';

interface UseRealTimeBoardOptions {
  boardId: string | null;
  enabled?: boolean;
  pollingInterval?: number;
  onUpdate?: (data: any) => void;
}

export function useRealTimeBoard({
  boardId,
  enabled = true,
  pollingInterval = 3000,
  onUpdate,
}: UseRealTimeBoardOptions) {
  const [isPolling, setIsPolling] = useState(false);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const isTabActiveRef = useRef(true);
  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchBoardUpdates = useCallback(async () => {
    if (!boardId || !enabled || !isTabActiveRef.current) return;

    
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    
    abortControllerRef.current = new AbortController();

    try {
      setIsPolling(true);
      
      
      const endpoint = boardId === 'all-notes' 
        ? '/api/boards/all-notes/notes'
        : `/api/boards/${boardId}/notes`;

      const response = await fetch(endpoint, {
        signal: abortControllerRef.current.signal,
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache',
        },
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
        console.error('Polling error:', error);
      }
    } finally {
      setIsPolling(false);
    }
  }, [boardId, enabled, onUpdate]);

  
  useEffect(() => {
    const handleVisibilityChange = () => {
      isTabActiveRef.current = !document.hidden;
      
      if (isTabActiveRef.current && enabled) {
        
        fetchBoardUpdates();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [fetchBoardUpdates, enabled]);

  
  useEffect(() => {
    if (!enabled || !boardId) return;

    
    fetchBoardUpdates();

    
    intervalRef.current = setInterval(() => {
      if (isTabActiveRef.current) {
        fetchBoardUpdates();
      }
    }, pollingInterval);

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
  }, [boardId, enabled, pollingInterval, fetchBoardUpdates]);

  
  const refresh = useCallback(() => {
    return fetchBoardUpdates();
  }, [fetchBoardUpdates]);

  return {
    isPolling,
    lastSync,
    refresh,
  };
}