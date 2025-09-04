import { useState, useEffect } from 'react';
import { presenceService } from '@/services/presenceService';

export interface PresenceStatus {
  isConnected: boolean;
  currentUserId: string | null;
  lastConnectionTime: number | null;
}

export function usePresenceStatus(): PresenceStatus {
  const [status, setStatus] = useState<PresenceStatus>({
    isConnected: false,
    currentUserId: null,
    lastConnectionTime: null
  });

  useEffect(() => {
    // Check initial status
    const updateStatus = () => {
      setStatus({
        isConnected: presenceService.isConnected(),
        currentUserId: presenceService.getCurrentUserId(),
        lastConnectionTime: presenceService.isConnected() ? Date.now() : null
      });
    };

    // Update immediately
    updateStatus();

    // Set up periodic status check
    const interval = setInterval(updateStatus, 5000); // Check every 5 seconds

    return () => clearInterval(interval);
  }, []);

  return status;
}