import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import useAchievements from '@/hooks/use-achievements';
import { achievementsService } from '@/services/achievementsService';

export default function AchievementsModal({ open, onClose, onOpenRefresh }: { open: boolean; onClose: () => void; onOpenRefresh?: () => void }) {
  const { achievements, loading } = useAchievements();
  // all achievements from server (full list)
  const [allAchievements, setAllAchievements] = useState<any[] | null>(null);
  const [allLoading, setAllLoading] = useState(false);

  // Фильтруем достижения на полученные и неполученные
  const earned = achievements.filter(a => a.unlocked);
  const unearned = achievements.filter(a => !a.unlocked);

  useEffect(() => {
    if (!open) return;
    let mounted = true;
    (async () => {
      setAllLoading(true);
      try {
        const list = await achievementsService.getAllAchievementsRaw();
        if (!mounted) return;
        setAllAchievements(list || []);
      } catch (e) {
        console.warn('Failed to load all achievements', e);
        if (mounted) setAllAchievements([]);
      } finally {
        if (mounted) setAllLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={(val) => { if (!val) onClose(); if (val && onOpenRefresh) void onOpenRefresh(); }}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Достижения</DialogTitle>
          <DialogDescription>Список полученных и не полученных достижений</DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          <div>
            <h3 className="font-semibold mb-2">Полученные</h3>
            {loading ? <div>Загрузка...</div> : (
              <div className="space-y-2">
                {earned.length === 0 && <div className="text-sm text-muted-foreground">Пока нет полученных достижений</div>}
                {earned.map((a: any) => (
                  <div key={a.id ?? a.name} className="p-3 border rounded">
                    <div className="font-medium">{a.name}</div>
                    {a.description && <div className="text-sm text-muted-foreground">{a.description}</div>}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <h3 className="font-semibold mb-2">Не полученные</h3>
            {(loading || allLoading) ? <div>Загрузка...</div> : (
              <div className="space-y-2">
                {(!unearned || unearned.length === 0) && <div className="text-sm text-muted-foreground">Все достижения получены</div>}
                {unearned.map((a: any) => (
                  <div key={a.id ?? a.name} className="p-3 border rounded">
                    <div className="font-medium">{a.name}</div>
                    {a.description && <div className="text-sm text-muted-foreground">{a.description}</div>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <div className="flex items-center gap-2">
            <Button onClick={onClose}>Закрыть</Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// debug panel below modal content
// show raw json and fetch info when toggled
// Note: this section is inside the same file, but visually rendered when showRaw is true
