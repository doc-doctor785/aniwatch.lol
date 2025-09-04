// Сервис для отслеживания просмотра аниме
export interface WatchProgress {
  animeId: string;
  title: string;
  image: string;
  currentEpisode: number;
  totalEpisodes: number;
  isCompleted: boolean;
  lastWatched: string;
}

class WatchHistoryService {
  private storageKey = 'animewatch_history';

  getWatchHistory(): WatchProgress[] {
    const stored = localStorage.getItem(this.storageKey);
    return stored ? JSON.parse(stored) : [];
  }

  updateWatchProgress(animeId: string, episode: number, animeData: { title: string; image: string; totalEpisodes: number }) {
    const history = this.getWatchHistory();
    const existingIndex = history.findIndex(item => item.animeId === animeId);

    const progressItem: WatchProgress = {
      animeId,
      title: animeData.title,
      image: animeData.image,
      currentEpisode: episode,
      totalEpisodes: animeData.totalEpisodes,
      isCompleted: episode >= animeData.totalEpisodes,
      lastWatched: new Date().toISOString()
    };

    if (existingIndex >= 0) {
      history[existingIndex] = progressItem;
    } else {
      history.push(progressItem);
    }

    localStorage.setItem(this.storageKey, JSON.stringify(history));
    return progressItem;
  }

  getAnimeProgress(animeId: string): WatchProgress | null {
    const history = this.getWatchHistory();
    return history.find(item => item.animeId === animeId) || null;
  }

  getCompletedAnime(): WatchProgress[] {
    return this.getWatchHistory().filter(item => item.isCompleted);
  }
}

export const watchHistoryService = new WatchHistoryService();
