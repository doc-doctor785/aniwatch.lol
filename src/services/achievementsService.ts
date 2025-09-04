import { API_URL } from '@/services/backendApi';

export interface BaseAchievement { id: number; name: string; description?: string; exp_reward?: number; admin_only?: boolean }
export type Achievement = BaseAchievement & { unlocked?: boolean; unlock_date?: string };
export interface NewAchievement { name: string; description?: string; exp_reward?: number; admin_only?: boolean }

let _cache: Achievement[] = [];
const _subs = new Set<(list: Achievement[]) => void>();
let _lastFetchAt: number | null = null;
let _lastFetchError: string | null = null;

function notify() {
  for (const cb of _subs) {
    try { cb(_cache.slice()); } catch (e) { /* ignore subscriber errors */ }
  }
}

function getToken() {
  return localStorage.getItem('token') || '';
}

function getUserIdFromStorage(): string | null {
  try {
    const s = localStorage.getItem('user');
    if (!s) return null;
    const u = JSON.parse(s);
    return u?.user_id || null;
  } catch (e) {
    return null;
  }
}

export const achievementsService = {
  async getUserAchievements(userId?: string): Promise<Achievement[]> {
    const uid = userId || getUserIdFromStorage();
    if (!uid) return [];
    try {
      const token = getToken();
      const res = await fetch(`${API_URL}/achievements/user/${encodeURIComponent(uid)}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        }
      });
      if (!res.ok) {
        const txt = await res.text().catch(() => '');
        _lastFetchAt = Date.now();
        _lastFetchError = `HTTP ${res.status}: ${txt}`;
        console.warn('achievementsService.getUserAchievements non-ok', res.status, txt);
        notify();
        return [];
      }
      const data = await res.json();
      // Handle common backend shapes: either an array, or object { awarded: [...] }
      let list: any[] | null = null;
      if (Array.isArray(data)) {
        list = data;
      } else if (data && Array.isArray((data as any).awarded)) {
        list = (data as any).awarded;
      }

      if (!list) {
        _lastFetchAt = Date.now();
        _lastFetchError = 'Invalid response format for achievements';
        notify();
        return [];
      }

      // Normalize items to Achievement shape
      _cache = list.map((it: any) => ({
        id: it.id,
        name: it.name,
        description: it.description || it.desc || '',
        exp_reward: it.exp_reward || it.exp || 0,
        admin_only: !!it.admin_only,
        unlocked: Boolean(it.unlocked || it.unlocked_at || it.unlock_date || it.unlock_at),
        unlock_date: it.unlock_date || it.unlocked_at || it.unlock_at || null
      })) as Achievement[];

      _lastFetchAt = Date.now();
      _lastFetchError = null;
      notify();
      return _cache.slice();
    } catch (e) {
      console.error('achievementsService.getUserAchievements error', e);
      _lastFetchAt = Date.now();
      _lastFetchError = e instanceof Error ? e.message : String(e);
      notify();
      return [];
    }
  },

  async getAllAchievementsRaw(): Promise<BaseAchievement[]> {
    try {
      const token = getToken();
      const res = await fetch(`${API_URL}/achievements`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        }
      });
      if (!res.ok) return [];
      const data = await res.json();
      // Accept either array or wrapped object with common keys
      if (Array.isArray(data)) return data as BaseAchievement[];
      if (data && typeof data === 'object') {
        const candidates = ['awarded', 'items', 'results', 'achievements', 'data'];
        for (const key of candidates) {
          if (Array.isArray((data as any)[key])) return (data as any)[key] as BaseAchievement[];
        }
      }
      return [];
    } catch (e) {
      console.error('achievementsService.getAllAchievementsRaw error', e);
      return [];
    }
  },

  async getAchievementByName(name: string): Promise<BaseAchievement | null> {
    try {
      const all = await this.getAllAchievementsRaw();
      return all.find(a => a.name === name) || null;
    } catch (e) {
      return null;
    }
  },

  async ensureAchievementExists(newAch: NewAchievement): Promise<number | null> {
    try {
      const token = getToken();
      const res = await fetch(`${API_URL}/achievements`, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify(newAch)
      });
      if (!res.ok) return null;
      const data = await res.json();
      return data?.id ?? null;
    } catch (e) {
      console.error('ensureAchievementExists error', e);
      return null;
    }
  },

  async awardAchievement(achievementId: number): Promise<boolean> {
    try {
      const uid = getUserIdFromStorage();
      if (!uid) return false;
      // Use check endpoint to award manually
      const payload = { user_id: uid, action: 'manual_award', payload: { achievement_id: achievementId } };
      const token = getToken();
      const res = await fetch(`${API_URL}/achievements/check`, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify(payload)
      });
      if (!res.ok) return false;
      // refresh cache after awarding
      await this.getUserAchievements(uid);
      return true;
    } catch (e) {
      console.error('awardAchievement error', e);
      return false;
    }
  },

  async refresh(): Promise<Achievement[]> {
    try {
      const uid = getUserIdFromStorage();
      const list = await this.getUserAchievements(uid || undefined);
      return list;
    } catch (e) {
      return [];
    }
  },

  async checkAndAwardAchievements(body: { user_id?: string; action: string; payload?: any; }) {
    try {
      const token = getToken();
      const userId = body.user_id || getUserIdFromStorage();
      const res = await fetch(`${API_URL}/achievements/check`, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify(body)
      });
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(`checkAndAwardAchievements failed: ${res.status} ${text}`);
      }
      const data = await res.json().catch(() => ({}));
      // After check, refresh user's achievements
      const uid = body.user_id || getUserIdFromStorage();
      if (uid) await this.getUserAchievements(uid);
      return data;
    } catch (e) {
      console.error('checkAndAwardAchievements error', e);
      throw e;
    }
  },

  getInfo() {
    return { lastFetchAt: _lastFetchAt, lastFetchError: _lastFetchError } as const;
  },

  subscribe(cb: (list: Achievement[]) => void) {
    _subs.add(cb);
    // send current value immediately
    try { cb(_cache.slice()); } catch (e) { /* ignore */ }
    return () => { _subs.delete(cb); };
  }
};

