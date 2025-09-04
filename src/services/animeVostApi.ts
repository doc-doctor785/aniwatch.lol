import { AnimeGenre, normalizeGenre } from '@/constants/genres';

interface AnimeVostResponse {
  id: string;
  title: string;
  description: string;
  genre: string;
  year: string;
  status: string;
  rating: string;
  episodes_count: string;
  director: string;
  urlImagePreview: string;
  screenImages: string[];
  timer: number;
}

interface ApiResponse {
  state?: {
    status: string;
  };
  data: AnimeVostResponse[];
}

interface EpisodeResponse {
  name: string;
  std: string;
  hd: string;
  preview: string;
  episodeNumber?: number;
}

interface AnimeData {
  id: string;
  title: string;
  image: string;
  description: string;
  episodes_count: string;
  status: string;
  year: string;
  genre: string;
  genres?: AnimeGenre[];
  rating: string;
  type: string;
  episodes_list?: {
    std: string;
    hd: string;
    number: number;
    name: string;
  }[];
}

class AnimeVostAPI {
  // var AnimevostApiLink = "https://api.animevost.org/v1/";
  private readonly baseURL = 'https://api.animetop.info/v1';

  private async makeRequest<T>(endpoint: string, method: string = 'GET', body?: string): Promise<T | null> {
    try {
      const url = `${this.baseURL}/${endpoint}`;
      console.log(`Making ${method} request to ${url}${body ? ' with body: ' + body : ''}`);

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: method === 'POST' ? body : undefined,
      });

      if (!response.ok) {
        console.error(`HTTP error! status: ${response.status}`);
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const text = await response.text();
      try {
        const data = JSON.parse(text);
        console.log(`Successful response from ${endpoint}:`, data);
        return data as T;
      } catch (parseError) {
        console.error(`Error parsing JSON response from ${endpoint}:`, text);
        throw parseError;
      }
    } catch (error) {
      console.error(`Error making request to ${method} ${endpoint}:`, error);
      throw error;
    }
  }

  private mapAnimeResponse(anime: AnimeVostResponse): AnimeData {
    return {
      id: anime.id,
      title: anime.title,
      image: anime.urlImagePreview,
      description: anime.description,
      episodes_count: anime.episodes_count,
      status: anime.status,
      year: anime.year,
      genre: anime.genre,
      genres: anime.genre.split(', ')
        .map(g => {
          const normalized = normalizeGenre(g);
          console.log('Нормализация жанра:', g, '->', normalized);
          return normalized;
        })
        .filter((g): g is AnimeGenre => g !== null),
      rating: anime.rating,
      type: 'tv' // По умолчанию устанавливаем тип 'tv'
    };
  }

  async getAnimeInfo(id: string): Promise<AnimeData | null> {
    try {
      const response = await this.makeRequest<ApiResponse>(`info?id=${id}`);
      if (!response?.data?.[0]) return null;
      return this.mapAnimeResponse(response.data[0]);
    } catch (error) {
      console.error('Error getting anime info:', error);
      return null;
    }
  }

  async getLatestAnime(maxQuantity: number = 2000): Promise<AnimeData[]> {
    try {
      const results: AnimeData[] = [];
      let page = 1;
      const perPage = 100;
      const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
      let retryCount = 0;
      const maxRetries = 3;
      
      console.log(`Начинаем загрузку полного списка аниме (maxQuantity=${maxQuantity})`);
      
      while (results.length < maxQuantity) {
        try {
          console.log(`Загрузка страницы ${page}...`);
          const response = await this.makeRequest<ApiResponse>(`last?page=${page}&quantity=${perPage}`);
          
          if (!response?.data || response.data.length === 0) {
            if (retryCount < maxRetries) {
              console.log(`Пустой ответ, попытка ${retryCount + 1} из ${maxRetries}...`);
              retryCount++;
              await delay(500);
              continue;
            }
            console.log('Получен пустой ответ после всех попыток, останавливаем загрузку');
            break;
          }
          
          retryCount = 0; // Сбрасываем счётчик после успешного запроса
          const animeList = response.data.map(anime => this.mapAnimeResponse(anime));
          results.push(...animeList);
          console.log(`Добавлено ${animeList.length} аниме (всего: ${results.length})`);
          
          if (response.data.length < perPage) {
            console.log('Достигнут конец списка');
            break;
          }
          
          page++;
          console.log('Ожидание перед следующим запросом...');
          await delay(200);
        } catch (pageError) {
          console.error(`Ошибка при загрузке страницы ${page}:`, pageError);
          if (retryCount < maxRetries) {
            retryCount++;
            console.log(`Повторная попытка ${retryCount} из ${maxRetries}...`);
            await delay(500);
            continue;
          }
          console.error('Превышено количество попыток, пропускаем страницу');
          page++;
          retryCount = 0;
        }
      }
      
      console.log(`Загрузка завершена. Всего получено: ${results.length} аниме`);
      return results.slice(0, maxQuantity);
    } catch (error) {
      console.error('Error getting latest anime:', error);
      return [];
    }
  }

  // Fetch a specific page from the 'last' endpoint (page-indexed) with requested quantity
  async getLatestPage(page: number = 1, quantity: number = 100): Promise<AnimeData[]> {
    try {
      console.log(`Запрашиваем страницу last?page=${page}&quantity=${quantity}`);
      const response = await this.makeRequest<ApiResponse>(`last?page=${page}&quantity=${quantity}`);
      if (!response?.data) return [];
      const animeList = response.data.map(anime => this.mapAnimeResponse(anime));
      console.log(`Получено ${animeList.length} аниме на странице ${page}`);
      return animeList;
    } catch (error) {
      console.error('Error getting latest page:', error);
      return [];
    }
  }

  async searchAnime(query: string, quantity: number = 200): Promise<AnimeData[]> {
    try {
      if (!query.trim()) {
        return this.getLatestAnime(quantity);
      }

      const response = await this.makeRequest<ApiResponse>('search', 'POST', `name=${encodeURIComponent(query)}`);
      if (!response?.data) return [];
      
      const results = response.data.map(anime => this.mapAnimeResponse(anime));
      return results.slice(0, quantity);
    } catch (error) {
      console.error('Error searching anime:', error);
      return [];
    }
  }

  async getAnimeById(id: string): Promise<AnimeData | null> {
    try {
      console.log('Requesting anime info for id:', id);
      const response = await this.makeRequest<ApiResponse>('info', 'POST', `id=${encodeURIComponent(id)}`);
      console.log('Received response:', response);

      if (!response?.data?.[0]) {
        console.log('No anime data found');
        return null;
      }

      const anime = response.data[0];
      console.log('Getting episodes for id:', id);
      const episodes = await this.getEpisodes(id);
      console.log('Received episodes:', episodes);

      const mappedAnime = this.mapAnimeResponse(anime);
      const mappedEpisodes = episodes.map(ep => ({
        std: ep.std,
        hd: ep.hd,
        number: ep.episodeNumber,
        name: ep.name
      }));

      console.log('Mapped episodes:', mappedEpisodes);

      return {
        ...mappedAnime,
        episodes_list: mappedEpisodes.sort((a, b) => a.number - b.number)
      };
    } catch (error) {
      console.error('Error getting anime details:', error);
      return null;
    }
  }

  async getEpisodes(id: string): Promise<EpisodeResponse[]> {
    try {
      console.log('Requesting episodes for anime id:', id);
      const episodes = await this.makeRequest<EpisodeResponse[]>('playlist', 'POST', `id=${encodeURIComponent(id)}`);
      console.log('Received raw episodes response:', episodes);

      if (!episodes) {
        console.warn('Episodes response is null or undefined');
        return [];
      }

      if (!Array.isArray(episodes)) {
        console.warn('Episodes is not an array:', episodes);
        return [];
      }

      if (episodes.length === 0) {
        console.warn('Episodes array is empty');
        return [];
      }

      const sortedEpisodes = episodes
        .map(episode => {
          const episodeNumber = parseInt(episode.name.match(/\d+/)?.[0] || '0');
          return {
            ...episode,
            episodeNumber
          };
        })
        .sort((a, b) => a.episodeNumber - b.episodeNumber);

      console.log(`Successfully processed ${sortedEpisodes.length} episodes for anime ${id}`);
      return sortedEpisodes;
    } catch (error) {
      console.error('Error getting episodes:', error);
      return [];
    }
  }
}

export const animeVostApi = new AnimeVostAPI();
