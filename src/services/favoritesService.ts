import { backendApi } from './backendApi';
// achievements feature removed

export interface FavoriteAnime {
  id: string;
  title: string;
  image: string;
  rating: number;
  addedAt: string;
}

// Функции для работы с кэшем
const loadFromCache = (): FavoriteAnime[] | null => {
  const cached = localStorage.getItem('cached_favorites');
  if (cached) {
    try {
      return JSON.parse(cached);
    } catch {
      return null;
    }
  }
  return null;
};

const saveToCache = (favorites: FavoriteAnime[]) => {
  try {
    localStorage.setItem('cached_favorites', JSON.stringify(favorites));
  } catch (e) {
    console.error('Ошибка при сохранении в кэш:', e);
  }
};

// Кэш для хранения списка избранного
let favoritesCache: FavoriteAnime[] | null = null;

class FavoritesService {
  private userId: string | null = null;

  setUserId(userId: string) {
    this.userId = userId;
  }

  async getFavorites(): Promise<FavoriteAnime[]> {
    const token = localStorage.getItem('token');
    if (!token) throw new Error('Не авторизован');

    if (!this.userId) {
      throw new Error('UserId не установлен');
    }

    try {
      // Сначала пытаемся получить актуальные данные с сервера (источник правды)
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 секунд таймаут

      try {
        // Используем backendApi для получения избранного
        const data = await backendApi.getUserWatchHistory(this.userId);
        const favorites = (data.completed || []).map((item: any) => ({
          id: item.animeId?.toString() || item.id?.toString(),
          title: item.title,
          image: item.image_url || item.image || '/placeholder.svg',
          rating: item.rating || 0,
          addedAt: item.completedAt || new Date().toISOString()
        }));
        favoritesCache = favorites;
        saveToCache(favorites);
        return favorites;
      } finally {
        clearTimeout(timeoutId);
      }
    } catch (error) {
      console.error('Ошибка при получении избранного:', error);
      const cached = loadFromCache();
      if (cached) {
        favoritesCache = cached;
        return cached;
      }
      throw error;
    }
  }

  async isFavorite(animeId: string | number): Promise<boolean> {
    try {
      if (!favoritesCache) {
        await this.getFavorites();
      }
      return favoritesCache?.some(item => item.id === animeId.toString()) || false;
    } catch (error) {
      console.error('Ошибка при проверке избранного:', error);
      return false;
    }
  }

  async addToFavorites(anime: { 
    id: string | number; 
    title: string; 
    image: string;
    rating?: number;
    year?: number;
  }): Promise<boolean> {
    const token = localStorage.getItem('token');
    if (!token) throw new Error('Не авторизован');

    if (!this.userId) {
      throw new Error('UserId не установлен');
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    try {
      // Используем backendApi для добавления в избранное
      await backendApi.updateWatchProgress({
        user_id: this.userId,
        anime_id: anime.id.toString(),
        episode_number: 0,
        total_episodes: anime.year || 0,
        status: 'completed',
        title: anime.title,
        image_url: anime.image
      });
      try {
        await this.getFavorites();
      } catch (e) {
        favoritesCache = null;
        localStorage.removeItem('cached_favorites');
      }
      return true;
    } catch (error) {
      console.error('Ошибка при добавлении в избранное:', error);
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  async removeFromFavorites(animeId: string | number): Promise<boolean> {
    const token = localStorage.getItem('token');
    if (!token) throw new Error('Не авторизован');

    if (!this.userId) {
      throw new Error('UserId не установлен');
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    try {
      // Используем backendApi для удаления из избранного
      await backendApi.updateWatchProgress({
        user_id: this.userId,
        anime_id: animeId.toString(),
        episode_number: 0,
        total_episodes: 0,
        status: 'watching',
        title: '',
        image_url: ''
      });
      try {
        await this.getFavorites();
      } catch (e) {
        favoritesCache = null;
        localStorage.removeItem('cached_favorites');
      }
      return true;
    } catch (error) {
      console.error('Ошибка при удалении из избранного:', error);
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }
}

export const favoritesService = new FavoritesService();
