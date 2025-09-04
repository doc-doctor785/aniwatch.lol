import { useEffect, useState, useCallback } from 'react';
import { achievementsService, Achievement } from '@/services/achievementsService';

export default function useAchievements() {
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(false);
  const [info, setInfo] = useState<{ lastFetchAt: number | null; lastFetchError: string | null }>({ lastFetchAt: null, lastFetchError: null });

  useEffect(() => {
    let mounted = true;
    const unsub = achievementsService.subscribe((list) => {
      if (!mounted) return;
      setAchievements(list);
      // update info snapshot too
      try { setInfo(achievementsService.getInfo()); } catch (e) { /* ignore */ }
    });

    // initial load
    (async () => {
      setLoading(true);
      try {
        await achievementsService.refresh();
      } finally {
        setLoading(false);
      }
    })();

    return () => { mounted = false; unsub(); };
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const list = await achievementsService.refresh();
      setAchievements(list);
      return list;
    } finally {
      setLoading(false);
    }
  }, []);

  const award = useCallback(async (achievementId: number) => {
    setLoading(true);
    try {
      const ok = await achievementsService.awardAchievement(achievementId);
      if (ok) {
        await achievementsService.refresh();
      }
      return ok;
    } finally {
      setLoading(false);
    }
  }, []);

  return { achievements, loading, refresh, award, info } as const;
}
