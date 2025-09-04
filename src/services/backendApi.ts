export const API_URL = import.meta.env.VITE_API_URL || 'https://api.aniwatch.lol'

const checkServerAvailability = async () => {
  try {
    const response = await fetch(`${API_URL}/health`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });
    return response.ok;
  } catch (error) {
    console.error('Сервер недоступен:', error);
    return false;
  }
};

interface LoginResponse {
  token: string;
  user_id: string;
  username: string;
  email: string;
  role: 'user' | 'admin';
  level: number;
  exp: number;
  next_level_exp?: number;
}

interface Achievement {
  id: number;
  name: string;
  description: string;
  icon: string;
  unlocked: boolean;
  exp_reward: number;
}

interface WatchHistoryStats {
  totalEpisodesWatched: number;
  totalTimeSpent: number;
  averageRating: number;
}

interface AnimeEntry {
  animeId: string;
  title: string;
  image_url?: string;
  rating?: number;
  completedAt?: string;
  currentEpisode?: number;
  totalEpisodes?: number;
  status?: string;
}

export const getWatchedAnime = async (userId: string): Promise<AnimeEntry[]> => {
  const response = await fetch(`${API_URL}/user/${userId}/watch-history/completed`, {
    method: 'GET',
    headers: {
      'Accept': 'application/json',
      'Authorization': `Bearer ${localStorage.getItem('token')}`
    }
  });

  if (!response.ok) {
    throw new Error('Failed to fetch watched anime');
  }

  return await response.json();
};

export const getInProgressAnime = async (userId: string): Promise<AnimeEntry[]> => {
  const response = await fetch(`${API_URL}/user/${userId}/watch-history/in-progress`, {
    method: 'GET',
    headers: {
      'Accept': 'application/json',
      'Authorization': `Bearer ${localStorage.getItem('token')}`
    }
  });

  if (!response.ok) {
    throw new Error('Failed to fetch in-progress anime');
  }

  return await response.json();
}

interface WatchHistoryResponse {
  completed: AnimeEntry[];
  inProgress: AnimeEntry[];
  stats: WatchHistoryStats;
}

interface WatchProgress {
  user_id: string;
  anime_id: string;
  episode_number: number;
  total_episodes: number;
  status: 'watching' | 'completed';
  title: string;
  image_url: string;
}

export async function login(email: string, password: string): Promise<LoginResponse> {
  const formData = new FormData();
  formData.append('email', email);
  formData.append('password', password);

  const response = await fetch(`${API_URL}/login`, {
    method: 'POST',
    body: formData,
    headers: {
      'Accept': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Ошибка входа');
  }

  return response.json();
}

export async function register(username: string, email: string, password: string): Promise<LoginResponse> {
  const formData = new FormData();
  formData.append('username', username);
  formData.append('email', email);
  formData.append('password', password);

  const response = await fetch(`${API_URL}/register`, {
    method: 'POST',
    body: formData,
    headers: {
      'Accept': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Ошибка регистрации');
  }

  return response.json();
}

export async function logout(): Promise<void> {
  const token = localStorage.getItem('token');
  if (!token) return;

  const response = await fetch(`${API_URL}/logout`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Ошибка выхода');
  }
}

export async function getUserWatchHistory(userId: string): Promise<WatchHistoryResponse> {
  const token = localStorage.getItem('token');
  if (!token) {
    throw new Error('Не авторизован');
  }

  const headers = {
    'Accept': 'application/json',
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };

  try {
    const response = await fetch(`${API_URL}/watch-progress/${userId}`, {
      method: 'GET',
      headers
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Ошибка получения просмотров: ${error}`);
    }

    const data = await response.json();

    return {
      completed: data.completed.map((anime: any) => ({
        animeId: anime.animeId,
        title: anime.title,
        image_url: anime.image_url,
        rating: anime.rating || 0,
        completedAt: anime.completedAt || new Date().toISOString(),
        episodes: anime.episodes || 0
      })),
      inProgress: data.inProgress.map((anime: any) => ({
        animeId: anime.animeId,
        title: anime.title,
        image_url: anime.image_url,
        currentEpisode: anime.currentEpisode || 0,
        episodes: anime.episodes || 0,
        lastWatched: anime.lastWatched || new Date().toISOString()
      })),
      stats: {
        totalEpisodesWatched: data.stats.totalEpisodesWatched || 0,
        totalTimeSpent: data.stats.totalTimeSpent || 0,
        averageRating: data.stats.averageRating || 0
      }
    };
  } catch (error) {
    console.error('Error fetching watch history:', error);
    throw new Error('Failed to fetch user watch history');
  }
}

export async function updateWatchProgress(data: WatchProgress): Promise<void> {
  const token = localStorage.getItem('token');
  if (!token) throw new Error('Не авторизован');

  try {
    // Обновляем прогресс
    const progressResponse = await fetch(`${API_URL}/watch-progress`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        user_id: data.user_id,
        anime_id: data.anime_id,
        episodes_watched: data.episode_number,
        total_episodes: data.total_episodes || 0,
        status: data.status,
        title: data.title || '',
        image_url: data.image_url || '/placeholder.svg'
      }),
    });

    if (!progressResponse.ok) {
      const errorData = await progressResponse.json();
      throw new Error(JSON.stringify(errorData.detail) || 'Ошибка обновления прогресса');
    }

    // Если статус completed, добавляем запись в историю и обновляем кэш
    if (data.status === 'completed') {
      // Добавляем в недавние
      await fetch(`${API_URL}/recent`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: data.user_id,
          anime_id: data.anime_id,
          title: data.title,
          image_url: data.image_url || '/placeholder.svg'
        }),
      });

      // Обновляем локальный кэш
      try {
        const watchHistory = localStorage.getItem('animewatch_history');
        if (watchHistory) {
          const history = JSON.parse(watchHistory);
          const updatedHistory = history.map((item: any) => {
            if (item.animeId === data.anime_id) {
              return {
                ...item,
                isCompleted: true,
                completedAt: new Date().toISOString()
              };
            }
            return item;
          });
          localStorage.setItem('animewatch_history', JSON.stringify(updatedHistory));
        }
      } catch (error) {
        console.error('Error updating local cache:', error);
      }
    }
  } catch (error) {
    console.error('Error updating watch progress:', error);
    throw new Error(error instanceof Error ? error.message : 'Ошибка обновления прогресса');
  }
}

export async function updateUserProfile(userId: string, payload: { username?: string; email?: string; avatar?: string }) {
  const token = localStorage.getItem('token');
  if (!token) throw new Error('Не авторизован');
  // First: try the JSON endpoint that exists on the backend: POST /user/{user_id}
  try {
    const response = await fetch(`${API_URL}/user/${userId}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({ username: payload.username, email: payload.email })
    });

    if (response.ok) {
      try {
        return await response.json();
      } catch {
        return null;
      }
    }

    // If method not allowed or not found, fall through to form-based endpoint
    if (response.status !== 404 && response.status !== 405) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.detail || `Ошибка обновления профиля (status ${response.status})`);
    }
  } catch (err) {
    // network error or other — continue to try form endpoint
    console.warn('POST /user/{id} failed, will try form endpoint:', err);
  }

  // Fallback: try form endpoint that supports avatar upload: POST /update-profile/{user_id}
  try {
    const form = new FormData();
    if (payload.username !== undefined) form.append('username', payload.username);
    if (payload.email !== undefined) form.append('email', payload.email);

    // If avatar is a File object (not a URL string), append it. Otherwise skip — backend expects UploadFile.
    if (payload.avatar && typeof (payload.avatar) !== 'string' && (payload.avatar as any).name) {
      form.append('avatar', payload.avatar as unknown as File);
    }

    const response = await fetch(`${API_URL}/update-profile/${userId}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        // NOTE: don't set Content-Type for FormData — browser sets boundary
        'Accept': 'application/json'
      },
      body: form
    });

    if (response.ok) {
      try {
        return await response.json();
      } catch {
        return null;
      }
    }

    const err = await response.json().catch(() => ({}));
    throw new Error(err.detail || `Ошибка обновления профиля (status ${response.status})`);
  } catch (error) {
    console.error('Error updating user profile:', error);
    throw error;
  }
}

export async function getUser(userId: string) {
  try {
    const response = await fetch(`${API_URL}/user/${userId}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.detail || `Ошибка получения пользователя (status ${response.status})`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching user:', error);
    throw error;
  }
}

export async function checkAdmin(userId: string): Promise<{ isAdmin: boolean }> {
  try {
    const response = await fetch(`${API_URL}/admin/check/${userId}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.detail || `Ошибка проверки админа (status ${response.status})`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error checking admin status:', error);
    return { isAdmin: false };
  }
}

export const backendApi = {
  login,
  register,
  logout,
  getUserWatchHistory,
  updateWatchProgress,
  updateUserProfile,
  getUser
};
