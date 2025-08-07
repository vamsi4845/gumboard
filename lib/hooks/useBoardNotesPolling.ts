import { usePolling } from './usePolling';

interface UseBoardNotesPollingOptions {
  boardId: string | null;
  enabled?: boolean;
  pollingInterval?: number;
  onUpdate?: (data: any) => void;
}

export function useBoardNotesPolling({
  boardId,
  enabled = true,
  pollingInterval = 4000,
  onUpdate,
}: UseBoardNotesPollingOptions) {
  const url = boardId === 'all-notes' 
    ? '/api/boards/all-notes/notes'
    : `/api/boards/${boardId}/notes`;

  return usePolling({
    url,
    enabled: enabled && !!boardId,
    interval: pollingInterval,
    onUpdate,
  });
}