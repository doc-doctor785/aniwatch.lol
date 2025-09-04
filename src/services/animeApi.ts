import { animeVostApi } from './animeVostApi';
import { API_URL, getWatchedAnime as fetchWatchedAnime, getInProgressAnime as fetchInProgressAnime } from './backendApi';

export interface WatchStatus {
  animeId: string;
  status: 'planned' | 'watching' | 'completed' | 'dropped';
  episodes: number;
  title: string;
  image_url: string;
}

export interface AnimeResponse {
  id: string;
  title: string;
  image: string;
  rating?: number;
  year?: number;
  status?: string;
  description?: string;
  episodes?: number;
  completedAt?: string;
  lastWatched?: string;
  currentEpisode?: number;
  genres?: string[];
  type?: string;
  popularity?: number;
  updatedAt?: string;
  isFavorite?: boolean;
  episodes_list?: { std: string; hd: string; number: number; name: string; }[];
}

export interface SearchResult {
  animes: AnimeResponse[];
  hasNextPage: boolean;
  currentPage: number;
  totalPages: number;
}

export interface UserProgress {
  level: number;
  exp: number;
  next_level_exp: number;
}

export interface Achievement {
  id: number;
  name: string;
  description: string;
  icon_path?: string;
  exp_reward: number;
  unlocked_at?: string;
}

class AnimeAPI {
  // Удалено: прямое подключение к бекенду. Используйте backendApi.

  async searchAnime(query: string, page: number = 1): Promise<SearchResult> {
    try {
      const results = await animeVostApi.searchAnime(query);
      return {
        animes: results.map(anime => ({
          id: anime.id,
          title: anime.title,
          image: anime.image,
          rating: parseFloat(anime.rating) || 0,
          year: parseInt(anime.year) || undefined,
          status: anime.status,
          description: anime.description,
          episodes: parseInt(anime.episodes_count) || 0,
          genres: anime.genres || anime.genre?.split(', ').map(g => g.trim()) || [],
          type: 'tv'
        })),
        hasNextPage: false,
        currentPage: page,
        totalPages: 1
      };
    } catch (error) {
      console.error('Error searching anime:', error);
      return {
        animes: [],
        hasNextPage: false,
        currentPage: page,
        totalPages: 1
      };
    }
  }

  async getPopularAnime(page: number = 1, perPage: number = 24): Promise<SearchResult> {
    try {
      // Fetch only the requested page (+1 item) to detect whether there is a next page
      const requestQuantity = perPage + 1;
      console.log('Запрашиваем страницу', page, 'с количеством', requestQuantity);
      const results = await animeVostApi.getLatestPage(page, requestQuantity);
      console.log('Получен список из', results.length, 'аниме');

      const hasNext = results.length > perPage;
      const pageItems = results.slice(0, perPage);

      return {
        animes: pageItems.map(anime => ({
          id: anime.id,
          title: anime.title,
          image: anime.image,
          rating: parseFloat(anime.rating) || 0,
          year: parseInt(anime.year) || undefined,
          status: anime.status,
          description: anime.description,
          episodes: parseInt(anime.episodes_count) || 0,
          genres: anime.genres || anime.genre?.split(', ').map(g => g.trim()) || [],
          type: anime.type || 'tv'
        })),
        hasNextPage: hasNext,
        currentPage: page,
        totalPages: hasNext ? page + 1 : page
      };
    } catch (error) {
      console.error('Error getting popular anime:', error);
      return {
        animes: [],
        hasNextPage: false,
        currentPage: page,
        totalPages: 1
      };
    }
  }

  async getAnimeById(id: string): Promise<AnimeResponse | null> {
    try {
      console.log('Getting anime details for id:', id);
      const animeVostDetails = await animeVostApi.getAnimeById(id);
      console.log('Received anime details:', animeVostDetails);
      if (!animeVostDetails) return null;

      return {
        id: animeVostDetails.id,
        title: animeVostDetails.title,
        image: animeVostDetails.image,
        rating: parseFloat(animeVostDetails.rating) || 0,
        year: parseInt(animeVostDetails.year) || undefined,
        status: animeVostDetails.status,
        description: animeVostDetails.description,
        episodes: parseInt(animeVostDetails.episodes_count) || 0,
        type: 'tv',
        episodes_list: animeVostDetails.episodes_list || []
      };
    } catch (error) {
      console.error('Error getting anime by id:', error);
      return null;
    }
  }

  async getLatestAnime(page = 1) {
    return await animeVostApi.getLatestAnime(page);
  }

  // Методы для работы с избранным
  async addToFavorites(userId: string, animeId: string, title: string, imageUrl: string) {
  // Вынесите этот функционал в backendApi.ts и вызывайте отсюда
  throw new Error('addToFavorites реализуйте через backendApi.ts');
  }

  async removeFromFavorites(userId: string, animeId: string) {
  // Вынесите этот функционал в backendApi.ts и вызывайте отсюда
  throw new Error('removeFromFavorites реализуйте через backendApi.ts');
  }

  async getFavorites(userId: string) {
  // Вынесите этот функционал в backendApi.ts и вызывайте отсюда
  throw new Error('getFavorites реализуйте через backendApi.ts');
  }

  // Методы для работы с прогрессом просмотра
  async updateWatchStatus(userId: string, data: WatchStatus) {
  // Вынесите этот функционал в backendApi.ts и вызывайте отсюда
  throw new Error('updateWatchStatus реализуйте через backendApi.ts');
  }

  async getWatchedList(userId: string) {
  // Вынесите этот функционал в backendApi.ts и вызывайте отсюда
  throw new Error('getWatchedList реализуйте через backendApi.ts');
  }

  async getWatchedDetailedList(userId: string) {
  // Вынесите этот функционал в backendApi.ts и вызывайте отсюда
  throw new Error('getWatchedDetailedList реализуйте через backendApi.ts');
  }

  // Методы для работы с недавно просмотренными
  async addToRecent(userId: string, animeId: string, title: string, imageUrl?: string) {
  // Вынесите этот функционал в backendApi.ts и вызывайте отсюда
  throw new Error('addToRecent реализуйте через backendApi.ts');
  }

  async getRecentAnime(userId: string) {
  // Вынесите этот функционал в backendApi.ts и вызывайте отсюда
  throw new Error('getRecentAnime реализуйте через backendApi.ts');
  }

  // Методы для работы с достижениями и уровнями
  async getUserProgress(userId: string): Promise<UserProgress> {
  // Achievements/leveling feature removed — return safe default to avoid runtime errors
  return { level: 0, exp: 0, next_level_exp: 100 };
  }

  async getUserAchievements(userId: string): Promise<Achievement[]> {
  // Achievements feature removed — return empty list
  return [];
  }

  async getAllAchievements(): Promise<Achievement[]> {
  // Achievements feature removed — return empty list
  return [];
  }

  // Методы для работы со статистикой
  async getUserStats(userId: string) {
  // Вынесите этот функционал в backendApi.ts и вызывайте отсюда
  throw new Error('getUserStats реализуйте через backendApi.ts');
  }

  // Глобальная статистика
  async getGlobalWatchedAnime(limit: number = 10) {
  // Вынесите этот функционал в backendApi.ts и вызывайте отсюда
  throw new Error('getGlobalWatchedAnime реализуйте через backendApi.ts');
  }

  async getGlobalFavorites(limit: number = 10) {
  // Вынесите этот функционал в backendApi.ts и вызывайте отсюда
  throw new Error('getGlobalFavorites реализуйте через backendApi.ts');
  }

  async getWatchedAnime(userId: string): Promise<AnimeResponse[]> {
    try {
      const watchedAnime = await fetchWatchedAnime(userId);
      return watchedAnime.map(anime => ({
        id: anime.animeId,
        title: anime.title,
        image: anime.image_url || '',
        episodes: anime.totalEpisodes || 0,
        status: 'completed'
      }));
    } catch (error) {
      console.error('Error fetching watched anime:', error);
      // Если API недоступно, возвращаем данные из локального хранилища
      return this.getWatchedAnimeFromLocal();
    }
  }

  private getWatchedAnimeFromLocal(): AnimeResponse[] {
    const watchHistory = localStorage.getItem('animewatch_history');
    if (!watchHistory) return [];

    try {
      const history = JSON.parse(watchHistory);
      return history
        .filter((item: any) => item.isCompleted)
        .map((item: any) => ({
          id: item.animeId,
          title: item.title,
          image: item.image,
          episodes: item.totalEpisodes,
          status: 'completed'
        }));
    } catch {
      return [];
    }
  }

  async getInProgressAnime(userId: string): Promise<AnimeResponse[]> {
    try {
      const inProgressAnime = await fetchInProgressAnime(userId);
      return inProgressAnime.map(anime => ({
        id: anime.animeId,
        title: anime.title,
        image: anime.image_url || '',
        episodes: anime.totalEpisodes || 0,
        status: 'watching'
      }));
    } catch (error) {
      console.error('Error fetching in-progress anime:', error);
      // Если API недоступно, возвращаем данные из локального хранилища
      return this.getInProgressAnimeFromLocal();
    }
  }

  private getInProgressAnimeFromLocal(): AnimeResponse[] {
    const watchHistory = localStorage.getItem('animewatch_history');
    if (!watchHistory) return [];

    try {
      const history = JSON.parse(watchHistory);
      return history
        .filter((item: any) => !item.isCompleted && item.currentEpisode < item.totalEpisodes)
        .map((item: any) => ({
          id: item.animeId,
          title: item.title,
          image: item.image || '/placeholder.svg',
          episodes: item.totalEpisodes,
          currentEpisode: item.currentEpisode,
          status: 'watching',
          lastWatched: item.lastWatched || new Date().toISOString()
        }));
    } catch {
      return [];
    }
  }

  async getAnimeInfo(id: string): Promise<AnimeResponse> {
    // Сначала пытаемся получить из основного API
    try {
      const data = await animeVostApi.getAnimeInfo(id);
      if (data) {
        return {
          id: data.id.toString(),
          title: data.title,
          image: data.image || '/placeholder.svg',
          description: data.description,
          episodes: parseInt(data.episodes_count) || 0,
          year: parseInt(data.year) || undefined,
          status: data.status,
          genres: data.genre?.split(', '),
          rating: parseFloat(data.rating) || 0,
          type: data.type
        };
      }
    } catch (error) {
      console.error('Error fetching anime info from main API:', error);
    }

    // Если не удалось получить данные из основного API, пытаемся получить из локального хранилища
    try {
      const watchHistory = localStorage.getItem('animewatch_history');
      if (watchHistory) {
        const history = JSON.parse(watchHistory);
        const localData = history.find((item: any) => item.animeId === id);
        if (localData) {
          return {
            id: localData.animeId,
            title: localData.title,
            image: localData.image || '/placeholder.svg',
            episodes: localData.totalEpisodes || 0,
            currentEpisode: localData.currentEpisode,
            status: localData.isCompleted ? 'completed' : 'watching'
          };
        }
      }
    } catch (error) {
      console.error('Error fetching anime info from local storage:', error);
    }

    throw new Error('Failed to fetch anime info');
  }
}

export const animeApi = new AnimeAPI();
