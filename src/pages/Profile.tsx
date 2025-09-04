import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { animeApi, AnimeResponse } from '@/services/animeApi';
import { favoritesService, FavoriteAnime } from '@/services/favoritesService';
import * as backendApi from '@/services/backendApi';
import { Button } from '@/components/ui/button';
import { Settings } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { UserProgress } from '@/components/UserProgress';
import AchievementsModal from '@/components/AchievementsModal';
import { achievementsService } from '@/services/achievementsService';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';

interface UserStats {
  favorites_count: number;
  totalEpisodesWatched: number;
  totalTimeSpent: number;
  averageRating: number;
  watched_count: number;
  in_progress_count: number;
}

interface WatchedAnime {
  id: string;
  title: string;
  image: string;
  rating: number;
  completedAt: string;
  episodes: number;
}

interface InProgressAnime {
  id: string;
  title: string;
  image: string;
  episodes: number;
  status: 'watching';
  currentEpisode: number;
  lastWatched: string;
}

export default function Profile() {
  const { user, isLoading: isAuthLoading } = useAuth();
  // achievements feature removed
  const [stats, setStats] = useState<UserStats | null>(null);
  const [favorites, setFavorites] = useState<FavoriteAnime[]>([]);
  const [watchedAnime, setWatchedAnime] = useState<WatchedAnime[]>([]);
  const [inProgressAnime, setInProgressAnime] = useState<InProgressAnime[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();
  const [achievementsOpen, setAchievementsOpen] = useState(false);
  const handleBack = () => {
    try {
      if (window.history.length > 1) {
        window.history.back();
        return;
      }
    } catch (e) {
      // ignore
    }
    navigate(-1);
  };

  useEffect(() => {
    // Если auth еще загружается — не делаем редирект
    if (isAuthLoading) return;

    if (!user) {
      navigate('/');
      return;
    }

    void loadUserData();
    void loadFavorites();
  }, [user, isAuthLoading, navigate]);

  const loadUserData = async () => {
    try {
      setIsLoading(true);
      
      // Получаем данные из разных источников
      const [historyResult, watchedResult, inProgressResult] = await Promise.allSettled([
        backendApi.getUserWatchHistory(user!.user_id),
        animeApi.getWatchedAnime(user!.user_id),
        animeApi.getInProgressAnime(user!.user_id)
      ]);

      // Инициализируем базовые значения
      let completed = [];
      let inProgress = [];
      let watchStats = {
        totalEpisodesWatched: 0,
        totalTimeSpent: 0,
        averageRating: 0
      };

      // Обрабатываем результаты из бэкенда
      if (historyResult.status === 'fulfilled' && historyResult.value) {
        completed = [...completed, ...(historyResult.value.completed || [])];
        inProgress = [...inProgress, ...(historyResult.value.inProgress || [])];
        watchStats = historyResult.value.stats || watchStats;
      }

      // Добавляем данные из локального хранилища, если они есть
      if (watchedResult.status === 'fulfilled' && watchedResult.value) {
        const localWatched = watchedResult.value.map(anime => ({
          animeId: anime.id,
          title: anime.title,
          image_url: anime.image,
          episodes: anime.episodes,
          completedAt: anime.completedAt || new Date().toISOString(),
          rating: anime.rating || 0
        }));
        completed = [...completed, ...localWatched];
      }

      if (inProgressResult.status === 'fulfilled' && inProgressResult.value) {
        const localInProgress = inProgressResult.value.map(anime => ({
          animeId: anime.id,
          title: anime.title,
          image_url: anime.image,
          episodes: anime.episodes,
          currentEpisode: anime.currentEpisode,
          status: 'watching',
          lastWatched: anime.lastWatched || new Date().toISOString()
        }));
        inProgress = [...inProgress, ...localInProgress];
      }

      // Удаляем дубликаты по animeId
      completed = Array.from(new Map(completed.map(item => [item.animeId, item])).values());
      inProgress = Array.from(new Map(inProgress.map(item => [item.animeId, item])).values());

      // Фильтруем и преобразуем завершенные аниме
      let completedDetails: WatchedAnime[] = completed
        .filter(anime => anime.animeId && anime.title)
        .map((anime) => ({
          id: anime.animeId,
          title: anime.title,
          image: anime.image_url || '/placeholder.svg',
          rating: anime.rating || 0,
          completedAt: anime.completedAt || new Date().toISOString(),
          episodes: Number(anime.episodes) || 0
        }));

      // Сортируем по дате завершения (сначала новые)
      completedDetails = completedDetails.sort((a, b) => 
        new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime()
      );

      // Фильтруем и преобразуем аниме в процессе просмотра
      let inProgressDetails: InProgressAnime[] = inProgress
        .filter(anime => anime.animeId && anime.title)
        .map((anime) => ({
          id: anime.animeId,
          title: anime.title,
          image: anime.image_url || '/placeholder.svg',
          episodes: Number(anime.episodes) || 0,
          status: 'watching',
          currentEpisode: Number(anime.currentEpisode) || 0,
          lastWatched: anime.lastWatched || new Date().toISOString()
        }));

      // Сортируем по дате последнего просмотра (сначала новые)
      inProgressDetails = inProgressDetails.sort((a, b) =>
        new Date(b.lastWatched).getTime() - new Date(a.lastWatched).getTime()
      );

      setWatchedAnime(completedDetails);
      setInProgressAnime(inProgressDetails);

      setStats({
        favorites_count: favorites.length,
        totalEpisodesWatched: watchStats.totalEpisodesWatched,
        totalTimeSpent: watchStats.totalTimeSpent,
        averageRating: watchStats.averageRating,
        watched_count: completedDetails.length,
        in_progress_count: inProgressDetails.length
      });
    } catch (error) {
      console.error('Error loading user data:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось загрузить данные пользователя",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const loadFavorites = async () => {
    try {
      const favs = await favoritesService.getFavorites();
      setFavorites(favs);
    } catch (error) {
      console.error('Error loading favorites:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось загрузить избранное",
        variant: "destructive"
      });
    }
  };

  if (!user) return null;

  return (
    <>
    <div className="container mx-auto px-4 py-8">
      <div className="mb-4">
        <Button variant="ghost" size="sm" onClick={handleBack} aria-label="Назад">← Назад</Button>
      </div>
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-6 mb-8">
          <div className="flex-shrink-0">
            <div className="w-24 h-24 bg-primary/10 rounded-full overflow-hidden flex items-center justify-center">
              {user.avatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={user.avatar} alt={user.username} className="w-full h-full object-cover" />
              ) : (
                <span className="text-2xl font-bold text-primary">
                  {user.username[0].toUpperCase()}
                </span>
              )}
            </div>
          </div>

            <div className="flex-grow flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold mb-2">{user.username}</h1>
                <Badge
                  variant={user.role === 'admin' ? 'destructive' : 'secondary'}
                  className={user.role === 'admin' ? 'bg-destructive/10 text-destructive' : 'bg-primary/20 text-primary'}
                >
                  {user.role === 'admin' ? 'Админ' : 'Пользователь'}
                </Badge>
              </div>

              <div className="ml-4 flex items-center gap-3">
                <UserProgress
                  level={user.level || 1}
                  exp={user.exp || 0}
                  next_level_exp={user.next_level_exp || 1000}
                />
                <Button variant="outline" size="sm" onClick={() => setAchievementsOpen(true)}>Достижения</Button>
                <Button variant="ghost" size="icon" onClick={() => navigate('/settings')} aria-label="Настройки">
                  <Settings className="w-5 h-5" />
                </Button>
              </div>
            </div>
        </div>

  <div className="grid gap-6">
          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4">Статистика просмотров</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-muted-foreground text-sm">Просмотрено эпизодов</p>
                <p className="text-2xl font-bold">{stats?.totalEpisodesWatched || 0}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-sm">Времени просмотрено</p>
                <p className="text-2xl font-bold">{Math.round((stats?.totalTimeSpent || 0) / 60)} ч</p>
              </div>
              <div>
                <p className="text-muted-foreground text-sm">Средняя оценка</p>
                <p className="text-2xl font-bold">{stats?.averageRating?.toFixed(1) || '0.0'}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-sm">В избранном</p>
                <p className="text-2xl font-bold">{stats?.favorites_count || 0}</p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4">Статистика</h2>
            {stats && (
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-primary">
                    {stats.watched_count}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Просмотрено
                  </div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-primary">
                    {stats.in_progress_count}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Смотрю
                  </div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-primary">
                    {favorites.length}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    В избранном
                  </div>
                </div>
              </div>
            )}
          </Card>

          <Tabs defaultValue="watching" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="watching">Смотрю</TabsTrigger>
              <TabsTrigger value="completed">Просмотрено</TabsTrigger>
              <TabsTrigger value="favorites">Избранное</TabsTrigger>
            </TabsList>

            <TabsContent value="watching" className="mt-4">
              {isLoading ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {[...Array(8)].map((_, i) => (
                    <div key={i} className="animate-pulse">
                      <div className="aspect-[2/3] bg-primary/10 rounded-lg"></div>
                      <div className="mt-2 space-y-2">
                        <div className="h-4 bg-primary/10 rounded w-3/4"></div>
                        <div className="h-3 bg-primary/10 rounded w-1/2"></div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                    {inProgressAnime.map((anime, index) => (
                      <div
                        key={`${anime.id}-${index}`}
                        className="relative cursor-pointer group"
                        onClick={() => navigate(`/anime/${anime.id}`)}
                      >
                        <div className="aspect-[2/3] rounded-lg overflow-hidden">
                          <img
                            src={anime.image}
                            alt={anime.title}
                            className="w-full h-full object-cover transition-transform group-hover:scale-105"
                            loading="lazy"
                          />
                        </div>
                        <div className="mt-2">
                          <h3 className="text-sm font-medium line-clamp-2">{anime.title}</h3>
                          <p className="text-xs text-muted-foreground mt-1">
                            Эпизод {anime.currentEpisode || 0} из {anime.episodes || '?'}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Обновлено {new Date(anime.lastWatched).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                  {inProgressAnime.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      Нет аниме в процессе просмотра
                    </div>
                  )}
                </>
              )}
            </TabsContent>

            <TabsContent value="completed" className="mt-4">
              {isLoading ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {[...Array(8)].map((_, i) => (
                    <div key={i} className="animate-pulse">
                      <div className="aspect-[2/3] bg-primary/10 rounded-lg"></div>
                      <div className="mt-2 space-y-2">
                        <div className="h-4 bg-primary/10 rounded w-3/4"></div>
                        <div className="h-3 bg-primary/10 rounded w-1/2"></div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                    {watchedAnime.map((anime, index) => (
                      <div
                        key={`${anime.id}-${index}`}
                        className="relative cursor-pointer group"
                        onClick={() => navigate(`/anime/${anime.id}`)}
                      >
                        <div className="aspect-[2/3] rounded-lg overflow-hidden">
                          <img
                            src={anime.image}
                            alt={anime.title}
                            className="w-full h-full object-cover transition-transform group-hover:scale-105"
                            loading="lazy"
                          />
                        </div>
                        <div className="mt-2">
                          <h3 className="text-sm font-medium line-clamp-2">{anime.title}</h3>
                          <p className="text-xs text-muted-foreground mt-1">
                            {anime.episodes ? `Просмотрено: ${anime.episodes} эпизодов` : 'Просмотрено полностью'}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(anime.completedAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                  {watchedAnime.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      Нет просмотренных аниме
                    </div>
                  )}
                </>
              )}
            </TabsContent>

            <TabsContent value="favorites" className="mt-4">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {favorites.map((anime, index) => (
                  <div
                    key={`${anime.id}-${index}`}
                    className="relative cursor-pointer group"
                    onClick={() => navigate(`/anime/${anime.id}`)}
                  >
                    <div className="aspect-[2/3] rounded-lg overflow-hidden">
                      <img
                        src={anime.image}
                        alt={anime.title}
                        className="w-full h-full object-cover transition-transform group-hover:scale-105"
                      />
                    </div>
                    <div className="mt-2">
                      <h3 className="text-sm font-medium line-clamp-2">{anime.title}</h3>
                      <p className="text-xs text-muted-foreground mt-1">
                        Добавлено {new Date(anime.addedAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))}
                {favorites.length === 0 && (
                  <div className="col-span-full text-center py-8 text-muted-foreground">
                    Нет избранных аниме
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  {/* achievements removed */}
  <AchievementsModal open={achievementsOpen} onClose={() => setAchievementsOpen(false)} onOpenRefresh={() => void achievementsService.refresh()} />
    </>
  );
}
