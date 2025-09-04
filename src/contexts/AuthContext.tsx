import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import type { ReactNode } from 'react';
import { useToast } from '@/hooks/use-toast';
import { login as apiLogin, register as apiRegister, logout as apiLogout, API_URL, checkAdmin, getUser } from '@/services/backendApi';
// achievements feature removed
import { favoritesService } from '@/services/favoritesService';
import { userLevelService } from '@/services/userLevelService';
import { networkService } from '@/services/networkService';
import { presenceService } from '@/services/presenceService';

export interface User {
  id: string;
  user_id: string;
  username: string;
  email: string;
  role: 'user' | 'admin';
  level?: number;
  exp?: number;
  next_level_exp?: number;
  // achievements removed
  avatar?: string;
}

export interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  updateUserData: () => Promise<void>;
  setUserLocal: (updates: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  // WebSocket presence management
  const startPresence = useCallback(async (userId?: string) => {
    if (!userId) return;
    
    try {
      console.log('Starting WebSocket presence for user:', userId);
      await presenceService.startPresence(userId);
    } catch (error) {
      console.error('Failed to start presence tracking:', error);
    }
  }, []);

  const stopPresence = useCallback(() => {
    try {
      console.log('Stopping WebSocket presence');
      presenceService.disconnect();
    } catch (error) {
      console.error('Failed to stop presence tracking:', error);
    }
  }, []);

  useEffect(() => {
    const initAuth = async () => {
      setIsLoading(true);
      try {
        const token = localStorage.getItem("token");
        const savedUser = localStorage.getItem("user");
        if (token && savedUser) {
          const userData = JSON.parse(savedUser);
          setUser(userData);
          setIsAuthenticated(true);
            await updateUserData();
            // start WebSocket presence when restoring session
            try {
              await startPresence(userData.user_id);
            } catch (e) {
              console.warn('Failed to start presence on session restore:', e);
            }
        }
      } catch (err) {
        console.error('Error initializing auth:', err);
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        setUser(null);
        setIsAuthenticated(false);
      } finally {
        setIsLoading(false);
      }
    };

    void initAuth();
  }, []);

  const updateUserData = async () => {
    try {
      // Проверяем базовые данные пользователя
      const savedUser = localStorage.getItem("user");
      if (!savedUser) {
        throw new Error("Нет сохраненных данных пользователя");
      }

      const userData = JSON.parse(savedUser);
      if (!userData.user_id) {
        throw new Error("Некорректные данные пользователя");
      }

      // Устанавливаем userId для сервиса избранного
      favoritesService.setUserId(userData.user_id);

      // Проверяем доступность сервера
      const isAvailable = await networkService.checkServerAvailability(import.meta.env.VITE_API_URL || 'https://api.aniwatch.lol');
      if (!isAvailable) {
        // Проверяем, не показывали ли мы уже уведомление недавно
        const lastNotificationTime = parseInt(localStorage.getItem('lastOfflineNotification') || '0');
        const now = Date.now();
        
        if (now - lastNotificationTime > 60000) { // Показываем не чаще раза в минуту
          toast({
            title: "Сервер недоступен",
            description: "Приложение работает в офлайн режиме. Некоторые функции могут быть недоступны.",
            variant: "destructive",
          });
          localStorage.setItem('lastOfflineNotification', now.toString());
        }
        return;
      }

  // Получаем все данные параллельно и обрабатываем их безопасно
      const results = await Promise.allSettled([
        userLevelService.getUserLevel(),
      ]);

      // Use the saved user data from localStorage as the base (so updates made directly to localStorage
      // in Settings.tsx are reflected immediately), then merge server-side info (level/achievements)
      if (userData) {
  const updatedUser = { ...(user || {}), ...userData } as any;

        // Проверяем результат получения уровня пользователя
        const levelResult = results[0];
        if (levelResult.status === 'fulfilled' && levelResult.value) {
          const levelData = levelResult.value;
          updatedUser.level = levelData.level;
          updatedUser.exp = levelData.exp;
          updatedUser.next_level_exp = levelData.next_level_exp;
        } else {
          console.warn('User level not updated (no data returned)');
        }

  // achievements removed

        // after merging user data, check admin status from server
        try {
          const adminRes = await checkAdmin(updatedUser.user_id);
          updatedUser.role = adminRes?.isAdmin ? 'admin' : (updatedUser.role || 'user');
        } catch (e) {
          // fallback to existing role if check fails
          console.warn('Admin check failed:', e);
        }

        setUser(updatedUser as any);
        try {
          // Persist updated user data (including level/exp) so reloads keep the latest values
          localStorage.setItem('user', JSON.stringify(updatedUser));
        } catch (e) {
          console.warn('Failed to persist updated user to localStorage', e);
        }
      }

      // Синхронизируем избранное с бэкендом — это сохранит favorites в кэше/localStorage
      try {
        await favoritesService.getFavorites();
      } catch (e) {
        console.warn('Failed to sync favorites from server', e);
      }

      // Попробуем получить свежий профиль (аватар и возможные обновления username/email)
  try {
  const backendUrl = import.meta.env.VITE_API_URL || 'https://api.aniwatch.lol';
  const profile = await getUser(userData.user_id);
        if (profile) {
          const rawAvatar = profile.avatar_url;
          const avatarFull = rawAvatar ? (rawAvatar.startsWith('http') ? rawAvatar : `${backendUrl}${rawAvatar}`) : undefined;
          // apply to local saved user so UI updates
          try {
            const saved = localStorage.getItem('user');
            const parsed = saved ? JSON.parse(saved) : {};
            const merged = {
              ...parsed,
              username: profile.username || parsed.username,
              email: profile.email || parsed.email,
              avatar: avatarFull || parsed.avatar
            };
            localStorage.setItem('user', JSON.stringify(merged));
            setUser(merged as any);
          } catch (e) {
            console.warn('Failed to merge profile into local user', e);
          }
        }
      } catch (e) {
        // Не критично если не удалось
      }
    } catch (error: any) {
      if (error?.message?.includes("User not found")) {
        // Если пользователь не найден, очищаем данные и выходим
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        setUser(null);
        setIsAuthenticated(false);
      }
      
      console.error('Ошибка обновления данных пользователя:', error);
      toast({
        title: "Ошибка",
        description: error instanceof Error ? error.message : "Не удалось обновить данные пользователя",
        variant: "destructive",
      });
    }
  };

  const setUserLocal = (updates: Partial<User>) => {
    try {
      const saved = localStorage.getItem('user');
      const base = saved ? JSON.parse(saved) : (user ? user : {});
      const merged = { ...base, ...(updates || {}) } as User;
      setUser(merged);
      try {
        localStorage.setItem('user', JSON.stringify(merged));
      } catch (e) {
        console.warn('Failed to persist user to localStorage in setUserLocal', e);
      }
    } catch (e) {
      console.warn('setUserLocal error', e);
    }
  };

  const login = async (email: string, password: string) => {
    try {
      const response = await apiLogin(email, password);
      console.log('Login response:', response);
      if (response.token) {
        const userData: User = {
          id: response.user_id,
          user_id: response.user_id,
          username: response.username,
          email: response.email,
          role: response.role || 'user',
          level: response.level || 1,
          exp: response.exp || 0,
          next_level_exp: 1000,
        };
        localStorage.setItem("token", response.token);
        localStorage.setItem("user", JSON.stringify(userData));
        favoritesService.setUserId(userData.user_id);
        // verify admin status with server
        try {
          const adminRes = await checkAdmin(userData.user_id);
          userData.role = adminRes?.isAdmin ? 'admin' : userData.role;
        } catch (e) {
          console.warn('Admin check failed after login:', e);
        }
        setUser(userData);
        setIsAuthenticated(true);
        // start WebSocket presence on login
        try {
          await startPresence(userData.user_id);
        } catch (e) {
          console.warn('Failed to start presence on login:', e);
        }
        // Синхронизируем дополнительные данные (уровень, достижения, избранное)
        try {
          await updateUserData();
        } catch (e) {
          console.warn('Failed to update user data after login', e);
        }
      }
    } catch (error: any) {
      toast({
        title: "Ошибка входа",
        description: error?.message || "Неверный email или пароль",
        variant: "destructive",
      });
      throw error;
    }
  };

  const register = async (username: string, email: string, password: string) => {
    try {
      const response = await apiRegister(username, email, password);
      console.log('Register response:', response);
      if (response.token) {
        const userData: User = {
          id: response.user_id,
          user_id: response.user_id,
          username: response.username,
          email: response.email,
          role: response.role || 'user',
          level: response.level || 1,
          exp: response.exp || 0,
          next_level_exp: 1000,
        };
        localStorage.setItem("token", response.token);
        localStorage.setItem("user", JSON.stringify(userData));
        favoritesService.setUserId(userData.user_id);
        try {
          const adminRes = await checkAdmin(userData.user_id);
          userData.role = adminRes?.isAdmin ? 'admin' : userData.role;
        } catch (e) {
          console.warn('Admin check failed after register:', e);
        }
        setUser(userData);
        setIsAuthenticated(true);
        // start WebSocket presence on register
        try {
          await startPresence(userData.user_id);
        } catch (e) {
          console.warn('Failed to start presence on register:', e);
        }
        // Синхронизируем дополнительные данные (уровень, достижения, избранное)
        try {
          await updateUserData();
        } catch (e) {
          console.warn('Failed to update user data after register', e);
        }
      }
    } catch (error: any) {
      toast({
        title: "Ошибка регистрации",
        description: error?.message || "Не удалось зарегистрироваться",
        variant: "destructive",
      });
      throw error;
    }
  };

  const logout = async () => {
    try {
      await apiLogout();
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      favoritesService.setUserId(''); // Сбрасываем userId
      setUser(null);
      setIsAuthenticated(false);
      // stop WebSocket presence when logging out
      try { 
        stopPresence(); 
      } catch (e) {
        console.warn('Failed to stop presence on logout:', e);
      }
    } catch (error) {
      console.error('Ошибка выхода:', error);
      // Даже если запрос выхода не удался, очищаем локальные данные
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      setUser(null);
      setIsAuthenticated(false);
      // stop WebSocket presence even if logout API failed
      try { 
        stopPresence(); 
      } catch (e) {
        console.warn('Failed to stop presence on logout error:', e);
      }
    }
  };

  useEffect(() => {
    // Cleanup WebSocket presence on unmount
    return () => {
      try { 
        stopPresence(); 
      } catch (e) {
        console.warn('Failed to cleanup presence on unmount:', e);
      }
    };
  }, [stopPresence]);

  const value: AuthContextType = {
    user,
    isAuthenticated,
  isLoading,
    login,
    logout,
    register,
    updateUserData
  ,setUserLocal
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
