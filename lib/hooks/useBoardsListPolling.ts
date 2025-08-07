import { usePolling } from './usePolling';

interface UseBoardsListPollingOptions {
  enabled?: boolean;
  pollingInterval?: number;
  onUpdate?: (data: any) => void;
}

export function useBoardsListPolling({
  enabled = true,
  pollingInterval = 5000,
  onUpdate,
}: UseBoardsListPollingOptions = {}) {
  return usePolling({
    url: '/api/boards',
    enabled,
    interval: pollingInterval,
    onUpdate,
  });
}