import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Header } from '@/components/Header';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { API_URL } from '@/services/backendApi';
import { usePresenceStatus } from '@/hooks/usePresenceStatus';
import { 
  Users, 
  Settings, 
  BarChart3, 
  RefreshCw, 
  Download, 
  Search, 
  Filter, 
  MoreHorizontal, 
  UserCheck, 
  UserX, 
  Shield, 
  ShieldOff,
  Eye,
  EyeOff,
  Activity,
  Clock,
  UserPlus,
  TrendingUp,
  Database,
  Server
} from 'lucide-react';

type UserItem = {
  user_id: string;
  username: string;
  email?: string;
  role?: string;
  banned?: boolean;
  level?: number;
  lastSeen?: string;
  joinedAt?: string;
  avatarUrl?: string;
  status?: 'online' | 'offline' | 'banned';
  watchTime?: number;
  favoriteCount?: number;
};

type SystemStats = {
  totalUsers: number;
  activeUsers: number;
  bannedUsers: number;
  adminUsers: number;
  newUsersToday: number;
  totalWatchTime: number;
  totalAnime: number;
  systemUptime: number;
  serverLoad: number;
  memoryUsage: number;
};

type AdminAction = {
  id: string;
  admin: string;
  action: string;
  target?: string;
  timestamp: string;
  details?: string;
};

const DEFAULT_PAGE_SIZE = 24;

const fetchJson = async (url: string, opts: RequestInit = {}) => {
  const res = await fetch(url, opts);
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
  try { return await res.json(); } catch { return await res.text(); }
};

const avatar = (seed?: string) => `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(seed || 'user')}`;



const formatBytes = (bytes: number) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const formatDuration = (seconds: number) => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
};

const StatusIndicator: React.FC<{ status?: 'online'|'offline'|'banned'; showLabel?: boolean; isRealTime?: boolean }> = ({ status, showLabel = false, isRealTime = false }) => {
  const config = {
    online: { 
      color: 'bg-primary', 
      label: 'Online', 
      pulseColor: 'animate-pulse bg-primary/80',
      textColor: 'text-primary'
    },
    banned: { 
      color: 'bg-destructive', 
      label: 'Banned', 
      pulseColor: '',
      textColor: 'text-destructive'
    },
    offline: { 
      color: 'bg-muted-foreground', 
      label: 'Offline', 
      pulseColor: '',
      textColor: 'text-muted-foreground'
    }
  };
  const { color, label, pulseColor, textColor } = config[status || 'offline'];
  
  // Only show LIVE indicator if user is actually online AND we have real-time tracking
  const showLiveIndicator = isRealTime && status === 'online';
  
  return (
    <div className="flex items-center gap-2">
      <div className="relative">
        <span className={`inline-block w-3 h-3 rounded-full ${color} shadow-sm`} aria-hidden="true" />
        {showLiveIndicator && (
          <span className={`absolute inset-0 w-3 h-3 rounded-full ${pulseColor}`} aria-hidden="true" />
        )}
      </div>
      {showLabel && <span className={`text-sm font-medium ${textColor}`}>{label}</span>}
      {showLiveIndicator && (
        <span className="text-xs text-primary font-semibold px-1.5 py-0.5 bg-primary/10 rounded-full border border-primary/20">
          LIVE
        </span>
      )}
    </div>
  );
};

const StatCard: React.FC<{ title: string; value: string | number; change?: string; icon: React.ReactNode; trend?: 'up' | 'down' | 'neutral' }> = ({ 
  title, value, change, icon, trend = 'neutral' 
}) => {
  const trendColors = {
    up: 'text-primary',
    down: 'text-destructive',
    neutral: 'text-muted-foreground'
  };

  return (
    <Card className="hover:shadow-lg transition-all duration-200 border-border bg-card">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="text-sm font-semibold text-card-foreground">{title}</CardTitle>
        <div className="text-muted-foreground p-2 bg-muted rounded-lg">{icon}</div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="text-3xl font-bold text-card-foreground mb-1">{value}</div>
        {change && (
          <p className={`text-sm ${trendColors[trend]} flex items-center gap-1 font-medium`}>
            {trend === 'up' && <TrendingUp className="w-4 h-4" />}
            {change}
          </p>
        )}
      </CardContent>
    </Card>
  );
};

const AdminPanel: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const presenceStatus = usePresenceStatus();

  // Main navigation
  const [activeTab, setActiveTab] = useState<'users' | 'statistics' | 'tools' | 'logs'>('users');
  const [view, setView] = useState<'cards' | 'table'>('cards');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Data states
  const [users, setUsers] = useState<UserItem[]>([]);
  const [systemStats, setSystemStats] = useState<SystemStats | null>(null);
  const [adminLogs, setAdminLogs] = useState<AdminAction[]>([]);
  
  // Loading states
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [loadingStats, setLoadingStats] = useState(false);
  const [loadingLogs, setLoadingLogs] = useState(false);

  // Search and filters
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all'|'user'|'admin'|'banned'>('all');
  const [statusFilter, setStatusFilter] = useState<'all'|'online'|'offline'|'banned'>('all');
  const [sortBy, setSortBy] = useState<'recent'|'name'|'level'|'watchTime'>('recent');

  // Pagination
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);

  // Selection and actions
  const [selectedUsers, setSelectedUsers] = useState<Record<string, boolean>>({});
  const [activeUserId, setActiveUserId] = useState<string | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [bulkAction, setBulkAction] = useState<'ban' | 'unban' | null>(null);
  
  // Admin tools
  const [expAmount, setExpAmount] = useState<number>(1000);
  const [broadcastMessage, setBroadcastMessage] = useState('');
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  
  // Real-time presence pinging (no continuous tracking needed)
  const [lastPresencePing, setLastPresencePing] = useState<number | null>(null);

  // Manual refresh of online users - uses aggregated endpoint under admin privileges
  const [lastRefresh, setLastRefresh] = useState<number | null>(null);
  const [refreshInterval, setRefreshInterval] = useState<NodeJS.Timeout | null>(null);
  // mounted guard to prevent setState after unmount
  const isMountedRef = React.useRef(true);
  useEffect(() => {
    isMountedRef.current = true;
    return () => { isMountedRef.current = false; };
  }, []);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Manual refresh for statistics when users data changes (only for fallback calculations)
  const refreshStatsFromUsers = useCallback(() => {
    // Recalculate minimal stats from loaded users when server stats unavailable
    if (users.length > 0 && !systemStats) {
      const total = users.length;
      const banned = users.filter(u => u.banned).length;
      const admins = users.filter(u => u.role === 'admin').length;
      const active = users.filter(u => effectiveStatus(u) === 'online').length;
      setSystemStats({
        totalUsers: total,
        activeUsers: active,
        bannedUsers: banned,
        adminUsers: admins,
        newUsersToday: 0,
        totalWatchTime: users.reduce((s, u) => s + (u.watchTime || 0), 0),
        totalAnime: 0,
        systemUptime: 0,
        serverLoad: 0,
        memoryUsage: 0
      });
    }
  }, [users, systemStats]);

  // Load online users via aggregated admin endpoint. This is a safe read-only
  // operation and preferred over per-user POST heartbeats.
  const loadOnlineUsers = useCallback(async () => {
    try {
      const dRaw: any = await fetchJson(`${API_URL}/admin/online-users`, {
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${localStorage.getItem('authToken') || ''}`
        }
      });

      // Normalize various possible response shapes:
      // - Array of ids or objects
      // - { online: [...] } or { users: [...] }
      // - JSON string
      // - Single string
      let arr: any[] = [];
      const d = dRaw;
      // Debug log - helpful when backend schema differs
      // eslint-disable-next-line no-console
      console.debug('/admin/online-users response', d);

      if (!d) arr = [];
      else if (Array.isArray(d)) arr = d;
      else if (typeof d === 'string') {
        try { arr = JSON.parse(d); } catch { arr = [d]; }
      } else if (d.online && Array.isArray(d.online)) arr = d.online;
      else if (d.users && Array.isArray(d.users)) arr = d.users;
      else if (d.data && Array.isArray(d.data)) arr = d.data;
      else if (typeof d === 'object') {
        // Try to extract array-like values from object
        const possible = Object.values(d).find(v => Array.isArray(v));
        if (possible) arr = possible as any[];
        else arr = Object.values(d);
      }

      const onlineSet = new Set(arr.map((it: any) => {
        if (!it && it !== 0) return undefined;
        if (typeof it === 'string') return it;
        if (typeof it === 'number') return String(it);
        if (it.user_id || it.id || it.userId) return it.user_id || it.id || it.userId;
        if (it.uuid) return it.uuid;
        // fallback: try to stringify and extract id-like substrings (rare)
        return undefined;
      }).filter(Boolean));

      if (isMountedRef.current) {
        setUsers(prev => prev.map(u => {
          if (u.banned) return { ...u, status: 'banned' };
          const isOnline = onlineSet.has(u.user_id);
          return { ...u, status: isOnline ? 'online' : 'offline' };
        }));

        setLastPresencePing(Date.now());
        toast({ title: 'Статусы обновлены' });
      }
    } catch (err) {
      console.error('Error loading online users:', err);
      toast({ title: 'Ошибка', description: 'Не удалось загрузить статусы присутствия', variant: 'destructive' });
    }
  }, [toast]);

  // Manual refresh of online users - uses aggregated endpoint under admin privileges
  const manualPingAllUsers = useCallback(async () => {
    await loadOnlineUsers();
  }, [loadOnlineUsers]);

  // Load users list from server
  const loadUsers = useCallback(async () => {
    setLoadingUsers(true);
    try {
      const data: any = await fetchJson(`${API_URL}/admin/users`, {
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${localStorage.getItem('authToken') || ''}`
        }
      });

      const list = (data.users || data || []).map((it: any) => ({
        user_id: it.user_id || it.id || it.userId || String(Math.random()),
        username: it.username || it.name || 'Unknown',
        email: it.email,
        role: it.role || 'user',
        banned: !!it.banned,
        level: it.level || 1,
        lastSeen: it.lastSeen || it.last_seen || it.last_online,
        joinedAt: it.joinedAt || it.createdAt,
        avatarUrl: it.avatarUrl || it.avatar || avatar(it.username),
        status: undefined,
        watchTime: it.watchTime || 0,
        favoriteCount: it.favoriteCount || 0
      })) as UserItem[];

      if (isMountedRef.current) {
        setUsers(list);
        setLastRefresh(Date.now());
        toast({ title: 'Успешно', description: `Загружено ${list.length} пользователей` });
      }
    } catch (err) {
      console.error('Error loading users:', err);
      if (isMountedRef.current) toast({ title: 'Ошибка', description: 'Не удалось загрузить пользователей', variant: 'destructive' });
    } finally {
      if (isMountedRef.current) setLoadingUsers(false);
    }
  }, [toast]);

  // presence is loaded via aggregated /admin/online-users endpoint

  const loadSystemStats = useCallback(async () => {
    setLoadingStats(true);
    try {
      const data: any = await fetchJson(`${API_URL}/admin/statistics`, { 
        headers: { 
          Accept: 'application/json',
          Authorization: `Bearer ${localStorage.getItem('authToken') || ''}` 
        } 
      });
      
      setSystemStats({
        totalUsers: data.totalUsers || 0,
        activeUsers: data.activeUsers || 0,
        bannedUsers: data.bannedUsers || 0,
        adminUsers: data.adminUsers || 0,
        newUsersToday: data.newUsersToday || 0,
        totalWatchTime: data.totalWatchTime || 0,
        totalAnime: data.totalAnime || 0,
        systemUptime: data.systemUptime || 0,
        serverLoad: data.serverLoad || 0,
        memoryUsage: data.memoryUsage || 0
      });
    } catch (err) {
      console.error('Error loading stats:', err);
      // Fallback to calculated stats only if we have users data
      setSystemStats({
        totalUsers: 0,
        activeUsers: 0,
        bannedUsers: 0,
        adminUsers: 0,
        newUsersToday: 0,
        totalWatchTime: 0,
        totalAnime: 1200, // Fallback value
        systemUptime: 0,
        serverLoad: 0,
        memoryUsage: 0
      });
    } finally { 
      setLoadingStats(false); 
    }
  }, []);

  const loadAdminLogs = useCallback(async () => {
    setLoadingLogs(true);
    try {
      const data: any = await fetchJson(`${API_URL}/admin/logs`, { 
        headers: { 
          Accept: 'application/json',
          Authorization: `Bearer ${localStorage.getItem('authToken') || ''}` 
        } 
      });
      
      setAdminLogs((data.logs || []).map((log: any) => ({
        id: log.id || String(Math.random()),
        admin: log.admin || 'Unknown',
        action: log.action || 'Unknown action',
        target: log.target,
        timestamp: log.timestamp || new Date().toISOString(),
        details: log.details
      })));
    } catch (err) {
      console.error('Error loading logs:', err);
      // Fallback to empty logs
      setAdminLogs([]);
    } finally { 
      setLoadingLogs(false); 
    }
  }, []);

  // Initial data loading - only load once when component mounts and user is admin
  useEffect(() => {
    if (user?.role === 'admin') {
      loadUsers();
      loadSystemStats();
      loadAdminLogs();
    }
  }, [user?.role]); // Only depend on user role, not the functions

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === 'INPUT' || (e.target as HTMLElement)?.isContentEditable) return;
      
      switch (e.key.toLowerCase()) {
        case 'r':
          if (e.ctrlKey || e.metaKey) return; // Don't interfere with browser refresh
          e.preventDefault();
          if (activeTab === 'users') loadUsers();
          else if (activeTab === 'statistics') loadSystemStats();
          else if (activeTab === 'logs') loadAdminLogs();
          break;
        case 'v':
          if (activeTab === 'users') {
            setView(currentView => currentView === 'cards' ? 'table' : 'cards');
          }
          break;
        case 'f':
          if (e.ctrlKey || e.metaKey) return; // Don't interfere with browser find
          e.preventDefault();
          (document.querySelector('input[placeholder*="Search"], input[placeholder*="Поиск"]') as HTMLInputElement)?.focus();
          break;
        case 'escape':
          setActiveUserId(null);
          setSelectedUsers({});
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [activeTab]); // Only depend on activeTab

  // Filtering and sorting logic
  const filteredUsers = useMemo(() => {
    const query = (debouncedQuery || '').trim().toLowerCase();
    let filtered = users.slice();
    
    // Apply search filter
    if (query) {
      filtered = filtered.filter(user => 
        (user.username || '').toLowerCase().includes(query) ||
        (user.email || '').toLowerCase().includes(query) ||
        (user.user_id || '').toLowerCase().includes(query)
      );
    }
    
    // Apply role filter
    if (roleFilter !== 'all') {
      if (roleFilter === 'banned') {
        filtered = filtered.filter(user => !!user.banned);
      } else {
        filtered = filtered.filter(user => (user.role || 'user') === roleFilter);
      }
    }
    
    // Apply status filter (use effective status)
    if (statusFilter !== 'all') {
      filtered = filtered.filter(user => {
        const st = effectiveStatus(user);
        if (statusFilter === 'banned') return st === 'banned';
        return st === statusFilter;
      });
    }
    
    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return (a.username || '').localeCompare(b.username || '');
        case 'level':
          return (b.level || 0) - (a.level || 0);
        case 'watchTime':
          return (b.watchTime || 0) - (a.watchTime || 0);
        case 'recent':
        default:
          const timeA = a.lastSeen ? new Date(a.lastSeen).getTime() : 0;
          const timeB = b.lastSeen ? new Date(b.lastSeen).getTime() : 0;
          return timeB - timeA;
      }
    });
    
    return filtered;
  }, [users, debouncedQuery, roleFilter, statusFilter, sortBy]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / pageSize));
  const paginatedUsers = useMemo(() => 
    filteredUsers.slice((page-1) * pageSize, page * pageSize), 
    [filteredUsers, page, pageSize]
  );

  const activeUser = useMemo(() => 
    users.find(user => user.user_id === activeUserId) || null, 
    [users, activeUserId]
  );

  // Load online users when list is loaded and set up periodic refresh
  useEffect(() => {
    if (users.length > 0) {
      // Load initial status
      loadOnlineUsers();
      
      // Set up auto-refresh every 30 seconds for real-time status updates
      const interval = setInterval(() => {
        if (document.visibilityState === 'visible') {
          loadOnlineUsers();
        }
      }, 30000);
      
      return () => clearInterval(interval);
    }
  }, [users.length, loadOnlineUsers]);

  // Helper: determine effective status from lastSeen and banned flag
  const effectiveStatus = (u: UserItem): 'online'|'offline'|'banned' => {
    if (u.banned) return 'banned';
    if (!u.lastSeen) return 'offline';
    const delta = Date.now() - new Date(u.lastSeen).getTime();
    return delta < 5 * 60 * 1000 ? 'online' : 'offline';
  };

  // Computed status used for UI: prefer real-time `status` if present, otherwise fallback to effectiveStatus
  const getComputedStatus = (u: UserItem): 'online'|'offline'|'banned' => {
    if (u.banned) return 'banned';
    if (u.status) return u.status;
    return effectiveStatus(u);
  };

  const isStatusRealTime = (u: UserItem) => {
    return typeof u.status !== 'undefined' && u.status !== null;
  };

  // Selection management
  const selectedCount = Object.values(selectedUsers).filter(Boolean).length;
  const isAllPageSelected = paginatedUsers.length > 0 && 
    paginatedUsers.every(user => selectedUsers[user.user_id]);

  const toggleUserSelection = (userId: string) => {
    setSelectedUsers(prev => ({ ...prev, [userId]: !prev[userId] }));
  };

  const selectAllOnPage = () => {
    const updates: Record<string, boolean> = {};
    paginatedUsers.forEach(user => {
      updates[user.user_id] = true;
    });
    setSelectedUsers(prev => ({ ...prev, ...updates }));
  };

  const deselectAllOnPage = () => {
    setSelectedUsers(prev => {
      const updated = { ...prev };
      paginatedUsers.forEach(user => {
        delete updated[user.user_id];
      });
      return updated;
    });
  };

  const togglePageSelection = () => {
    if (isAllPageSelected) {
      deselectAllOnPage();
    } else {
      selectAllOnPage();
    }
  };

  const clearSelection = () => setSelectedUsers({});
  const clearFilters = () => {
    setRoleFilter('all');
    setStatusFilter('all');
    setSortBy('recent');
    setSearchQuery('');
    setPage(1);
  };

  // Utility functions
  const exportUsersToCSV = () => {
    const headers = ['ID', 'Username', 'Email', 'Role', 'Status', 'Level', 'Watch Time', 'Last Seen', 'Joined'];
    const rows = [headers];
    
    filteredUsers.forEach(user => {
      rows.push([
        user.user_id,
        user.username,
        user.email || '',
        user.role || 'user',
        user.banned ? 'banned' : user.status || 'offline',
        String(user.level || 1),
        formatDuration(user.watchTime || 0),
        user.lastSeen ? new Date(user.lastSeen).toLocaleString() : 'Never',
        user.joinedAt ? new Date(user.joinedAt).toLocaleString() : 'Unknown'
      ]);
    });
    
    const csvContent = rows.map(row => 
      row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')
    ).join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `users_export_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    toast({ title: 'Экспорт завершён', description: `Якспортировано ${filteredUsers.length} пользователей` });
  };

  // Admin action functions
  const performBulkAction = async (action: 'ban' | 'unban', userIds: string[]) => {
    if (!userIds.length) {
      toast({ title: 'Нет выбора', description: 'Выберите пользователей', variant: 'destructive' });
      return;
    }

    const isBanning = action === 'ban';
    const actionText = isBanning ? 'Забанить' : 'Разбанить';
    
    try {
      await fetchJson(`${API_URL}/admin/bulk-${action}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('authToken') || ''}`
        },
        body: JSON.stringify({ user_ids: userIds, ban: isBanning })
      });

      setUsers(prevUsers => 
        prevUsers.map(u => 
          userIds.includes(u.user_id) 
            ? { ...u, banned: isBanning, status: isBanning ? 'banned' as const : 'offline' as const }
            : u
        )
      );

      toast({ 
        title: 'Успешно', 
        description: `${actionText} ${userIds.length} пользователей` 
      });
      
      clearSelection();
    } catch (error) {
      console.error(`Error performing bulk ${action}:`, error);
      toast({ 
        title: 'Ошибка', 
        description: `Не удалось ${actionText.toLowerCase()} пользователей`, 
        variant: 'destructive' 
      });
    }
  };

  const toggleUserBan = async (userId: string, shouldBan: boolean) => {
    const targetUser = users.find(u => u.user_id === userId);
    if (!targetUser) return;

    try {
      await fetchJson(`${API_URL}/admin/ban`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('authToken') || ''}`
        },
        body: JSON.stringify({ user_id: userId, ban: shouldBan })
      });

      setUsers(prevUsers => 
        prevUsers.map(u => 
          u.user_id === userId 
            ? { ...u, banned: shouldBan, status: shouldBan ? 'banned' as const : 'offline' as const }
            : u
        )
      );

      toast({ 
        title: shouldBan ? 'Пользователь забанен' : 'Пользователь разбанен'
      });
    } catch (error) {
      console.error('Error toggling user ban:', error);
      toast({ 
        title: 'Ошибка', 
        description: 'Не удалось изменить статус пользователя', 
        variant: 'destructive' 
      });
    }
  };

  const grantUserExperience = async (userId: string, experiencePoints: number) => {
    if (experiencePoints <= 0) return;

    try {
      await fetchJson(`${API_URL}/admin/grant-exp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('authToken') || ''}`
        },
        body: JSON.stringify({ user_id: userId, exp: experiencePoints })
      });

      setUsers(prevUsers => 
        prevUsers.map(u => 
          u.user_id === userId 
            ? { ...u, level: (u.level || 1) + Math.floor(experiencePoints / 1000) }
            : u
        )
      );

      toast({ 
        title: 'Опыт выдан', 
        description: `+${experiencePoints} опыта` 
      });
    } catch (error) {
      console.error('Error granting experience:', error);
      toast({ 
        title: 'Ошибка', 
        description: 'Не удалось выдать опыт', 
        variant: 'destructive' 
      });
    }
  };

  const toggleUserRole = async (userId: string, makeAdmin: boolean) => {
    try {
      await fetchJson(`${API_URL}/admin/set-role`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('authToken') || ''}`
        },
        body: JSON.stringify({ user_id: userId, role: makeAdmin ? 'admin' : 'user' })
      });

      setUsers(prevUsers => 
        prevUsers.map(u => 
          u.user_id === userId 
            ? { ...u, role: makeAdmin ? 'admin' : 'user' }
            : u
        )
      );

      toast({ 
        title: 'Роль обновлена',
        description: `Пользователь ${makeAdmin ? 'повышен до админа' : 'понижен до пользователя'}`
      });
    } catch (error) {
      console.error('Error toggling user role:', error);
      toast({ 
        title: 'Ошибка', 
        description: 'Не удалось изменить роль', 
        variant: 'destructive' 
      });
    }
  };

  // System management functions
  const sendBroadcastMessage = async () => {
    if (!broadcastMessage.trim()) {
      toast({ title: 'Пустое сообщение', description: 'Введите сообщение', variant: 'destructive' });
      return;
    }

    try {
      await fetchJson(`${API_URL}/admin/broadcast`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('authToken') || ''}`
        },
        body: JSON.stringify({ message: broadcastMessage })
      });

      toast({ title: 'Сообщение отправлено' });
      setBroadcastMessage('');
    } catch (error) {
      console.error('Error sending broadcast:', error);
      toast({ title: 'Ошибка', description: 'Не удалось отправить сообщение', variant: 'destructive' });
    }
  };

  const toggleMaintenanceMode = async () => {
    try {
      await fetchJson(`${API_URL}/admin/maintenance`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('authToken') || ''}`
        },
        body: JSON.stringify({ enabled: !maintenanceMode })
      });

      setMaintenanceMode(prev => !prev);
      toast({ 
        title: maintenanceMode ? 'Режим обслуживания отключён' : 'Режим обслуживания включён' 
      });
    } catch (error) {
      console.error('Error toggling maintenance mode:', error);
      toast({ title: 'Ошибка', description: 'Не удалось изменить режим', variant: 'destructive' });
    }
  };

  // Permission check
  if (!user || user.role !== 'admin') {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto py-8">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <Shield className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h2 className="text-xl font-semibold mb-2">Доступ запрещён</h2>
                <p className="text-muted-foreground">У вас нет прав администратора для просмотра этой страницы.</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="container mx-auto p-6 space-y-8">
        {/* Enhanced Header with WebSocket Status */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div>
            <h1 className="text-4xl font-bold tracking-tight gradient-text">
              Панель администратора
            </h1>
            <p className="text-muted-foreground mt-2">
              Управление пользователями и системой
              {lastRefresh && (
                <span className="ml-3 text-sm text-muted-foreground bg-muted px-2 py-1 rounded-md">
                  Обновлено: {new Date(lastRefresh).toLocaleTimeString()}
                </span>
              )}
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            {/* Enhanced WebSocket Status Card */}
            <Card className="border-border bg-card">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="flex flex-col">
                    <div className="text-sm font-semibold text-card-foreground mb-1">WebSocket Status</div>
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full shadow-sm ${
                        presenceStatus.isConnected 
                          ? 'bg-primary animate-pulse' 
                          : 'bg-destructive'
                      }`} />
                      <span className={`text-sm font-medium ${
                        presenceStatus.isConnected ? 'text-primary' : 'text-destructive'
                      }`}>
                        {presenceStatus.isConnected ? 'Connected' : 'Disconnected'}
                      </span>
                    </div>
                  </div>
                  
                  {presenceStatus.currentUserId && (
                    <div className="text-right border-l pl-3 border-border">
                      <div className="text-xs text-muted-foreground font-medium">User ID</div>
                      <div className="text-sm font-mono text-card-foreground bg-muted px-2 py-1 rounded text-center">
                        {presenceStatus.currentUserId.slice(0, 8)}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (activeTab === 'users') loadUsers();
                else if (activeTab === 'statistics') loadSystemStats();
                else if (activeTab === 'logs') loadAdminLogs();
              }}
              disabled={loadingUsers || loadingStats || loadingLogs}
              className="bg-card border-border hover:bg-muted"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${
                (loadingUsers || loadingStats || loadingLogs) ? 'animate-spin' : ''
              }`} />
              Обновить
            </Button>

            <kbd className="hidden sm:inline-flex h-8 px-3 items-center border border-border rounded-md text-xs font-mono bg-muted text-muted-foreground">
              R • обновить
            </kbd>
          </div>
        </div>

        {/* Enhanced Quick Stats Cards */}
        {systemStats && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard
              title="Всего пользователей"
              value={systemStats.totalUsers.toLocaleString()}
              change={systemStats.newUsersToday > 0 ? `+${systemStats.newUsersToday} сегодня` : undefined}
              icon={<Users className="w-5 h-5" />}
              trend={systemStats.newUsersToday > 0 ? 'up' : 'neutral'}
            />
            
            <StatCard
              title="Онлайн"
              value={systemStats.activeUsers.toLocaleString()}
              change={`${Math.round((systemStats.activeUsers / Math.max(systemStats.totalUsers, 1)) * 100)}% активных`}
              icon={<Activity className="w-5 h-5" />}
              trend="up"
            />
            
            <StatCard
              title="Админы"
              value={systemStats.adminUsers.toLocaleString()}
              icon={<Shield className="w-5 h-5" />}
            />
            
            <StatCard
              title="Аниме"
              value={systemStats.totalAnime.toLocaleString()}
              icon={<Database className="w-5 h-5" />}
            />
          </div>
        )}

        {/* Enhanced Main Tabbed Interface */}
        <Card className="bg-card border-border">
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as typeof activeTab)}>
            <TabsList className="grid w-full grid-cols-4 bg-muted border-border">
              <TabsTrigger 
                value="users" 
                className="flex items-center gap-2 data-[state=active]:bg-card data-[state=active]:text-card-foreground"
              >
                <Users className="w-4 h-4" />
                Пользователи
              </TabsTrigger>
              <TabsTrigger 
                value="statistics" 
                className="flex items-center gap-2 data-[state=active]:bg-card data-[state=active]:text-card-foreground"
              >
                <BarChart3 className="w-4 h-4" />
                Статистика
              </TabsTrigger>
              <TabsTrigger 
                value="tools" 
                className="flex items-center gap-2 data-[state=active]:bg-card data-[state=active]:text-card-foreground"
              >
                <Settings className="w-4 h-4" />
                Инструменты
              </TabsTrigger>
              <TabsTrigger 
                value="logs" 
                className="flex items-center gap-2 data-[state=active]:bg-card data-[state=active]:text-card-foreground"
              >
                <Clock className="w-4 h-4" />
                Логи
              </TabsTrigger>
            </TabsList>

          {/* Users Tab */}
          <TabsContent value="users" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <CardTitle className="text-xl">Пользователи</CardTitle>
                    <Badge variant="secondary">
                      {filteredUsers.length} найдено
                    </Badge>
                    {selectedCount > 0 && (
                      <Badge variant="outline">
                        {selectedCount} выбрано
                      </Badge>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={manualPingAllUsers}
                      title="Обновить статусы онлайн пользователей"
                    >
                      <Activity className="w-4 h-4 mr-1" />
                      Обновить статусы
                    </Button>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={togglePageSelection}
                    >
                      {isAllPageSelected ? "Отменить" : "Выбрать все"}
                    </Button>
                    
                    {selectedCount > 0 && (
                      <>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => setBulkAction('ban')}
                        >
                          <UserX className="w-4 h-4 mr-1" />
                          Забанить ({selectedCount})
                        </Button>
                        
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setBulkAction('unban')}
                        >
                          <UserCheck className="w-4 h-4 mr-1" />
                          Разбанить ({selectedCount})
                        </Button>
                      </>
                    )}
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={exportUsersToCSV}
                    >
                      <Download className="w-4 h-4 mr-1" />
                      Экспорт
                    </Button>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4">
                {/* Filters and Search */}
                <div className="flex flex-col lg:flex-row gap-4">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Поиск по имени, email или ID..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  
                  <div className="flex gap-2 flex-wrap">
                    <Select value={roleFilter} onValueChange={(value: typeof roleFilter) => { setRoleFilter(value); setPage(1); }}>
                      <SelectTrigger className="w-[140px]">
                        <Filter className="w-4 h-4 mr-2" />
                        <SelectValue placeholder="Роль" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Все роли</SelectItem>
                        <SelectItem value="user">Пользователи</SelectItem>
                        <SelectItem value="admin">Админы</SelectItem>
                        <SelectItem value="banned">Забаненные</SelectItem>
                      </SelectContent>
                    </Select>
                    
                    <Select value={statusFilter} onValueChange={(value: typeof statusFilter) => { setStatusFilter(value); setPage(1); }}>
                      <SelectTrigger className="w-[140px]">
                        <SelectValue placeholder="Статус" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Все статусы</SelectItem>
                        <SelectItem value="online">Онлайн</SelectItem>
                        <SelectItem value="offline">Оффлайн</SelectItem>
                        <SelectItem value="banned">Забаненные</SelectItem>
                      </SelectContent>
                    </Select>
                    
                    <Select value={sortBy} onValueChange={(value: typeof sortBy) => setSortBy(value)}>
                      <SelectTrigger className="w-[160px]">
                        <SelectValue placeholder="Сортировка" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="recent">По активности</SelectItem>
                        <SelectItem value="name">По имени</SelectItem>
                        <SelectItem value="level">По уровню</SelectItem>
                        <SelectItem value="watchTime">По времени просмотра</SelectItem>
                      </SelectContent>
                    </Select>
                    
                    <Select value={pageSize.toString()} onValueChange={(value) => { setPageSize(Number(value)); setPage(1); }}>
                      <SelectTrigger className="w-[100px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="12">12</SelectItem>
                        <SelectItem value="24">24</SelectItem>
                        <SelectItem value="48">48</SelectItem>
                        <SelectItem value="96">96</SelectItem>
                      </SelectContent>
                    </Select>
                    
                    {(searchQuery || roleFilter !== 'all' || statusFilter !== 'all' || sortBy !== 'recent') && (
                      <Button variant="ghost" size="sm" onClick={clearFilters}>
                        Очистить
                      </Button>
                    )}
                  </div>
                </div>
                
                {/* Enhanced View Toggle and Status Legend */}
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="flex flex-wrap items-center gap-4">
                    <div className="text-sm text-card-foreground font-medium">Легенда статусов:</div>
                    <div className="flex flex-wrap items-center gap-4">
                      <div className="flex items-center gap-2 bg-primary/10 px-3 py-1.5 rounded-lg border border-primary/20">
                        <StatusIndicator status="online" />
                        <span className="text-sm font-medium text-primary">Онлайн (реальное время)</span>
                      </div>
                      <div className="flex items-center gap-2 bg-muted px-3 py-1.5 rounded-lg border border-border">
                        <StatusIndicator status="offline" />
                        <span className="text-sm font-medium text-muted-foreground">Оффлайн</span>
                      </div>
                      <div className="flex items-center gap-2 bg-destructive/10 px-3 py-1.5 rounded-lg border border-destructive/20">
                        <StatusIndicator status="banned" />
                        <span className="text-sm font-medium text-destructive">Забанен</span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Last Update Info */}
                  {lastPresencePing && (
                    <div className="text-sm text-muted-foreground bg-accent px-3 py-2 rounded-lg border border-border">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-accent-foreground" />
                        <span>Последнее обновление: {new Date(lastPresencePing).toLocaleTimeString()}</span>
                      </div>
                      <div className="text-xs text-accent-foreground mt-1">• Авто-обновление: 30с</div>
                    </div>
                  )}
                  
                  {/* View Toggle */}
                  <div className="flex items-center gap-1 border border-border rounded-lg p-1 bg-muted">
                    <Button
                      variant={view === 'cards' ? 'secondary' : 'ghost'}
                      size="sm"
                      onClick={() => setView('cards')}
                      className="text-sm"
                    >
                      Карты
                    </Button>
                    <Button
                      variant={view === 'table' ? 'secondary' : 'ghost'}
                      size="sm"
                      onClick={() => setView('table')}
                      className="text-sm"
                    >
                      Таблица
                    </Button>
                  </div>
                </div>

                {/* User Display */}
                <div className="space-y-4">
                  {filteredUsers.length === 0 ? (
                    <div className="text-center py-16">
                      <div className="w-24 h-24 mx-auto mb-6 bg-muted rounded-full flex items-center justify-center">
                        <Users className="w-12 h-12 text-muted-foreground" />
                      </div>
                      <h3 className="text-xl font-semibold text-card-foreground mb-2">Пользователи не найдены</h3>
                      <p className="text-muted-foreground mb-6">Попробуйте изменить фильтры или поисковый запрос</p>
                      <Button 
                        variant="outline" 
                        onClick={clearFilters}
                        className="bg-card border-border hover:bg-muted"
                      >
                        Очистить фильтры
                      </Button>
                    </div>
                  ) : loadingUsers ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                      {Array.from({ length: Math.min(8, pageSize) }).map((_, i) => (
                        <div key={i} className="animate-pulse">
                          <Card className="bg-card border-border">
                            <CardContent className="p-5">
                              <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                  <div className="w-14 h-14 bg-muted rounded-full"></div>
                                  <div className="w-16 h-6 bg-muted rounded"></div>
                                </div>
                                <div className="space-y-2">
                                  <div className="h-5 bg-muted rounded"></div>
                                  <div className="h-4 bg-muted rounded w-3/4"></div>
                                </div>
                                <div className="flex justify-between">
                                  <div className="w-16 h-5 bg-muted rounded"></div>
                                  <div className="w-20 h-5 bg-muted rounded"></div>
                                </div>
                                <div className="grid grid-cols-2 gap-3 pt-2 border-t border-border">
                                  <div className="h-8 bg-muted rounded"></div>
                                  <div className="h-8 bg-muted rounded"></div>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        </div>
                      ))}
                    </div>
                  ) : view === 'cards' ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                      {paginatedUsers.map(user => (
                        <Card 
                          key={user.user_id} 
                          className={`group cursor-pointer transition-all duration-300 hover:shadow-xl hover:-translate-y-1 bg-card border-border anime-card ${
                            activeUserId === user.user_id ? 'ring-2 ring-primary shadow-lg' : ''
                          } ${
                            selectedUsers[user.user_id] ? 'ring-2 ring-primary bg-primary/5' : ''
                          }`}
                          onClick={() => setActiveUserId(user.user_id)}
                        >
                          <CardContent className="p-5">
                            <div className="space-y-4">
                              {/* User Avatar and Level */}
                              <div className="flex items-center justify-between">
                                <div className="relative">
                                  <div className="w-14 h-14 rounded-full overflow-hidden bg-muted flex-shrink-0 ring-2 ring-border shadow-sm group-hover:ring-primary/20 transition-all">
                                    <img 
                                      src={user.avatarUrl} 
                                      alt={`${user.username} avatar`} 
                                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                                      onError={(e) => {
                                        const target = e.target as HTMLImageElement;
                                        target.src = avatar(user.username);
                                      }}
                                    />
                                  </div>
                                  <div className="absolute -bottom-1 -right-1">
                                    <StatusIndicator 
                                      status={getComputedStatus(user)}
                                      isRealTime={isStatusRealTime(user)}
                                    />
                                  </div>
                                </div>
                                
                                <Badge 
                                  variant="outline" 
                                  className="bg-muted border-border text-card-foreground font-semibold px-2 py-1"
                                >
                                  Lvl {user.level || 1}
                                </Badge>
                              </div>
                              
                              {/* User Info */}
                              <div className="space-y-2">
                                <div>
                                  <h3 className="font-semibold text-card-foreground text-lg truncate group-hover:text-primary transition-colors">
                                    {user.username}
                                  </h3>
                                  <p className="text-sm text-muted-foreground truncate">
                                    {user.email || 'Не указан'}
                                  </p>
                                </div>
                                
                                {/* Role and Status */}
                                <div className="flex items-center justify-between">
                                  <Badge 
                                    variant={user.role === 'admin' ? 'default' : 'secondary'}
                                    className={`text-xs ${
                                      user.role === 'admin' 
                                        ? 'bg-primary/10 text-primary border-primary/20' 
                                        : 'bg-muted text-muted-foreground border-border'
                                    }`}
                                  >
                                    {user.role === 'admin' ? (
                                      <><Shield className="w-3 h-3 mr-1" />Админ</>
                                    ) : (
                                      'Пользователь'
                                    )}
                                  </Badge>
                                  
                                  {user.banned && (
                                    <Badge variant="destructive" className="text-xs bg-destructive/10 text-destructive border-destructive/20">
                                      Забанен
                                    </Badge>
                                  )}
                                </div>
                                
                                {/* Stats */}
                                <div className="grid grid-cols-2 gap-3 pt-2 border-t border-border">
                                  <div className="text-center">
                                    <div className="text-sm font-semibold text-card-foreground">
                                      {formatDuration(user.watchTime || 0)}
                                    </div>
                                    <div className="text-xs text-muted-foreground">Просмотр</div>
                                  </div>
                                  <div className="text-center">
                                    <div className="text-sm font-semibold text-card-foreground">
                                      {user.favoriteCount || 0}
                                    </div>
                                    <div className="text-xs text-muted-foreground">Избранное</div>
                                  </div>
                                </div>
                              </div>
                              
                              {/* Action Buttons */}
                              <div className="flex items-center justify-between pt-2 border-t border-border">
                                <div className="text-xs text-muted-foreground font-mono">
                                  {user.user_id.slice(0, 8)}...
                                </div>
                                
                                <div className="flex items-center gap-1">
                                  <Button
                                    variant={selectedUsers[user.user_id] ? 'default' : 'outline'}
                                    size="sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      toggleUserSelection(user.user_id);
                                    }}
                                    className="h-7 w-7 p-0"
                                  >
                                    {selectedUsers[user.user_id] ? '✓' : '+'}
                                  </Button>
                                  
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setActiveUserId(activeUserId === user.user_id ? null : user.user_id);
                                    }}
                                    className="h-7 w-7 p-0 hover:bg-primary/10"
                                  >
                                    {activeUserId === user.user_id ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                                  </Button>
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <div className="border rounded-lg overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead className="bg-muted/50">
                            <tr className="border-b">
                              <th className="text-left p-3 w-12">
                                <input
                                  type="checkbox"
                                  checked={isAllPageSelected}
                                  onChange={togglePageSelection}
                                  className="rounded"
                                />
                              </th>
                              <th className="text-left p-3">Пользователь</th>
                              <th className="text-left p-3">Контакты</th>
                              <th className="text-left p-3">Роль</th>
                              <th className="text-left p-3">Статус</th>
                              <th className="text-left p-3">Активность</th>
                              <th className="text-left p-3 w-24">Действия</th>
                            </tr>
                          </thead>
                          <tbody>
                            {paginatedUsers.map((user, index) => (
                              <tr 
                                key={user.user_id} 
                                className={`border-b hover:bg-muted/30 ${
                                  activeUserId === user.user_id ? 'bg-primary/5' : ''
                                }`}
                              >
                                <td className="p-3">
                                  <input
                                    type="checkbox"
                                    checked={!!selectedUsers[user.user_id]}
                                    onChange={() => toggleUserSelection(user.user_id)}
                                    className="rounded"
                                  />
                                </td>
                                <td className="p-3">
                                  <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full overflow-hidden relative">
                                      <img 
                                        src={user.avatarUrl} 
                                        alt={`${user.username} avatar`} 
                                        className="w-full h-full object-cover"
                                        onError={(e) => {
                                          const target = e.target as HTMLImageElement;
                                          target.src = avatar(user.username);
                                        }}
                                      />
                                      <div className="absolute -bottom-0.5 -right-0.5">
                                        <StatusIndicator 
                                          status={getComputedStatus(user)}
                                          isRealTime={isStatusRealTime(user)}
                                        />
                                      </div>
                                    </div>
                                    <div>
                                      <div className="font-medium">{user.username}</div>
                                      <div className="text-xs text-muted-foreground font-mono">
                                        {user.user_id.slice(0, 8)}...
                                      </div>
                                    </div>
                                  </div>
                                </td>
                                <td className="p-3">
                                  <div className="text-sm">
                                    {user.email || 'Не указан'}
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    {user.lastSeen ? `Вход: ${new Date(user.lastSeen).toLocaleDateString()}` : 'Никогда'}
                                  </div>
                                </td>
                                <td className="p-3">
                                  <Badge 
                                    variant={user.role === 'admin' ? 'default' : 'secondary'}
                                    className="text-xs"
                                  >
                                    {user.role === 'admin' ? (
                                      <><Shield className="w-3 h-3 mr-1" />Админ</>
                                    ) : (
                                      'Пользователь'
                                    )}
                                  </Badge>
                                </td>
                                <td className="p-3">
                                  <div className="flex items-center gap-2">
                                    <StatusIndicator 
                                      status={getComputedStatus(user)} 
                                      isRealTime={isStatusRealTime(user)}
                                    />
                                  </div>
                                </td>
                                <td className="p-3">
                                  <div className="text-sm">
                                    Lvl {user.level || 1}
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    {formatDuration(user.watchTime || 0)}
                                  </div>
                                </td>
                                <td className="p-3">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setActiveUserId(user.user_id)}
                                    className="h-8 w-8 p-0"
                                  >
                                    <MoreHorizontal className="w-4 h-4" />
                                  </Button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  
                  {/* Enhanced Pagination */}
                  {filteredUsers.length > 0 && (
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 border-t border-border">
                      <div className="text-sm text-muted-foreground bg-muted px-3 py-2 rounded-lg">
                        Показано {((page-1) * pageSize) + 1}-{Math.min(page * pageSize, filteredUsers.length)} из {filteredUsers.length} пользователей
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setPage(1)}
                          disabled={page <= 1}
                          className="bg-card border-border hover:bg-muted"
                        >
                          Первая
                        </Button>
                        
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setPage(page - 1)}
                          disabled={page <= 1}
                          className="bg-card border-border hover:bg-muted"
                        >
                          Назад
                        </Button>
                        
                        <div className="px-4 py-2 text-sm font-medium bg-primary/10 text-primary rounded-lg border border-primary/20">
                          {page} / {totalPages}
                        </div>
                        
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setPage(page + 1)}
                          disabled={page >= totalPages}
                          className="bg-card border-border hover:bg-muted"
                        >
                          Вперёд
                        </Button>
                        
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setPage(totalPages)}
                          disabled={page >= totalPages}
                          className="bg-card border-border hover:bg-muted"
                        >
                          Последняя
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Statistics Tab */}
          <TabsContent value="statistics" className="space-y-6">
            {loadingStats ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="animate-pulse">
                    <div className="bg-muted rounded-lg h-32" />
                  </div>
                ))}
              </div>
            ) : systemStats ? (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <StatCard
                    title="Всего пользователей"
                    value={systemStats.totalUsers.toLocaleString()}
                    change={systemStats.newUsersToday > 0 ? `+${systemStats.newUsersToday} сегодня` : 'Без новых'}
                    icon={<Users className="w-5 h-5" />}
                    trend={systemStats.newUsersToday > 0 ? 'up' : 'neutral'}
                  />
                  
                  <StatCard
                    title="Активные пользователи"
                    value={systemStats.activeUsers.toLocaleString()}
                    change={`${Math.round((systemStats.activeUsers / Math.max(systemStats.totalUsers, 1)) * 100)}% онлайн`}
                    icon={<Activity className="w-5 h-5" />}
                    trend="up"
                  />
                  
                  <StatCard
                    title="Администраторы"
                    value={systemStats.adminUsers.toLocaleString()}
                    icon={<Shield className="w-5 h-5" />}
                  />
                  
                  <StatCard
                    title="Заблокированные"
                    value={systemStats.bannedUsers.toLocaleString()}
                    icon={<UserX className="w-5 h-5" />}
                    trend={systemStats.bannedUsers > 0 ? 'down' : 'neutral'}
                  />
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle>Анализ пользователей</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-3">
                        <h4 className="font-medium">По статусу</h4>
                        <div className="space-y-2">
                            <div className="flex justify-between items-center">
                              <span className="flex items-center gap-2">
                                <StatusIndicator status="online" />
                                Онлайн
                              </span>
                              <span>{users.filter(u => getComputedStatus(u) === 'online').length}</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="flex items-center gap-2">
                                <StatusIndicator status="offline" />
                                Оффлайн
                              </span>
                              <span>{users.filter(u => getComputedStatus(u) === 'offline').length}</span>
                            </div>
                          <div className="flex justify-between items-center">
                            <span className="flex items-center gap-2">
                              <StatusIndicator status="banned" />
                              Забаненные
                            </span>
                            <span>{users.filter(u => u.banned).length}</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="space-y-3">
                        <h4 className="font-medium">По ролям</h4>
                        <div className="space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="flex items-center gap-2">
                              <Shield className="w-4 h-4" />
                              Администраторы
                            </span>
                            <span>{users.filter(u => u.role === 'admin').length}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="flex items-center gap-2">
                              <Users className="w-4 h-4" />
                              Пользователи
                            </span>
                            <span>{users.filter(u => u.role !== 'admin').length}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </>
            ) : (
              <div className="text-center py-12">
                <BarChart3 className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">Статистика недоступна</h3>
                <p className="text-muted-foreground mb-4">Не удалось загрузить данные статистики</p>
                <Button onClick={loadSystemStats} disabled={loadingStats}>
                  {loadingStats ? 'Загрузка...' : 'Повторить попытку'}
                </Button>
              </div>
            )}
          </TabsContent>

          {/* Tools Tab */}
          <TabsContent value="tools" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="w-5 h-5" />
                    Системные инструменты
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Broadcast сообщение</label>
                    <Input
                      placeholder="Введите сообщение для всех пользователей..."
                      value={broadcastMessage}
                      onChange={(e) => setBroadcastMessage(e.target.value)}
                    />
                    <Button onClick={sendBroadcastMessage} className="w-full">
                      Отправить всем
                    </Button>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Режим обслуживания</label>
                    <Button 
                      variant={maintenanceMode ? 'destructive' : 'outline'}
                      onClick={toggleMaintenanceMode}
                      className="w-full"
                    >
                      {maintenanceMode ? 'Отключить' : 'Включить'} режим обслуживания
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Быстрые действия</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {activeUser && (
                    <>
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-12 h-12 rounded-full overflow-hidden">
                          <img src={activeUser.avatarUrl} alt="" className="w-full h-full object-cover" />
                        </div>
                        <div>
                          <div className="font-medium">{activeUser.username}</div>
                          <div className="text-sm text-muted-foreground">{activeUser.email}</div>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Выдать опыт</label>
                        <div className="flex gap-2">
                          <Input
                            type="number"
                            min={0}
                            value={expAmount}
                            onChange={(e) => setExpAmount(Math.max(0, Number(e.target.value || 0)))}
                            className="w-24"
                          />
                          <Button 
                            onClick={() => grantUserExperience(activeUser.user_id, expAmount)}
                            disabled={expAmount <= 0}
                          >
                            Выдать
                          </Button>
                        </div>
                      </div>
                      
                      <div className="flex gap-2">
                        <Button 
                          variant={activeUser.banned ? 'destructive' : 'outline'}
                          onClick={() => toggleUserBan(activeUser.user_id, !activeUser.banned)}
                          className="flex-1"
                        >
                          {activeUser.banned ? 'Разбанить' : 'Забанить'}
                        </Button>
                        <Button 
                          variant={activeUser.role === 'admin' ? 'destructive' : 'secondary'}
                          onClick={() => toggleUserRole(activeUser.user_id, activeUser.role !== 'admin')}
                          className="flex-1"
                        >
                          {activeUser.role === 'admin' ? 'Демот' : 'Повысить'}
                        </Button>
                      </div>
                    </>
                  )}
                  
                  {!activeUser && (
                    <div className="text-center py-6">
                      <Users className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                      <p className="text-sm text-muted-foreground">Выберите пользователя для быстрых действий</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Logs Tab */}
          <TabsContent value="logs" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="w-5 h-5" />
                    Логи администратора
                  </CardTitle>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={loadAdminLogs}
                    disabled={loadingLogs}
                  >
                    <RefreshCw className={`w-4 h-4 mr-2 ${loadingLogs ? 'animate-spin' : ''}`} />
                    Обновить
                  </Button>
                </div>
              </CardHeader>
              
              <CardContent>
                {loadingLogs ? (
                  <div className="space-y-3">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <div key={i} className="animate-pulse">
                        <div className="bg-muted rounded h-16" />
                      </div>
                    ))}
                  </div>
                ) : adminLogs.length > 0 ? (
                  <div className="space-y-3">
                    {adminLogs.slice(0, 20).map(log => (
                      <div key={log.id} className="border-l-4 border-primary pl-4 py-2">
                        <div className="flex items-center justify-between">
                          <span className="font-medium">{log.action}</span>
                          <span className="text-xs text-muted-foreground">
                            {new Date(log.timestamp).toLocaleString()}
                          </span>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Администратор: {log.admin}
                          {log.target && ` • Цель: ${log.target}`}
                        </div>
                        {log.details && (
                          <div className="text-xs text-muted-foreground mt-1">
                            {log.details}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Clock className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium mb-2">Логи не найдены</h3>
                    <p className="text-muted-foreground">Пока нет записей о действиях администраторов</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
        </Card>
        
        {/* Bulk Action Dialogs */}
        <AlertDialog open={!!bulkAction} onOpenChange={() => setBulkAction(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {bulkAction === 'ban' ? 'Забанить пользователей?' : 'Разбанить пользователей?'}
              </AlertDialogTitle>
              <AlertDialogDescription>
                Это действие затронет {selectedCount} выбранных пользователей. 
                {bulkAction === 'ban' 
                  ? 'Забаненные пользователи не смогут войти в систему.' 
                  : 'Пользователи снова смогут использовать платформу.'
                }
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Отмена</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  const selectedIds = Object.keys(selectedUsers).filter(id => selectedUsers[id]);
                  performBulkAction(bulkAction!, selectedIds);
                  setBulkAction(null);
                }}
              >
                {bulkAction === 'ban' ? 'Забанить' : 'Разбанить'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
};

export default AdminPanel;
