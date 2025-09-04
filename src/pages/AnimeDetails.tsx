import { useParams, useLocation } from 'react-router-dom';
import { VideoPlayer } from '@/components/VideoPlayer';
import { useEffect, useState } from 'react';
import { animeApi } from '@/services/animeApi';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Heart, Play } from 'lucide-react';
import { VideoModal } from '@/components/VideoModal';
import { useToast } from '@/hooks/use-toast';
import { favoritesService } from '@/services/favoritesService';

interface AnimeDetails {
  id: string;
  title: string;
  description: string;
  image: string;
  episodes_count: string;
  status: string;
  year: string;
  genre: string;
  rating: string;
}

const AnimeDetails = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { toast } = useToast();
  const [anime, setAnime] = useState<AnimeDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isVideoOpen, setIsVideoOpen] = useState(false);
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const shouldShowPlayerInline = queryParams.get('player') === '1';
  const [isFavorite, setIsFavorite] = useState(false);

  useEffect(() => {
    const checkFavoriteStatus = async () => {
      if (id && user) {
        const isInFavorites = await favoritesService.isFavorite(id);
        setIsFavorite(isInFavorites);
      }
    };
    checkFavoriteStatus();
  }, [id, user]);

  useEffect(() => {
    const fetchAnimeDetails = async () => {
      if (id) {
        try {
          setIsLoading(true);
          setError(null);
          const details = await animeApi.getAnimeById(id);
          console.log('Received anime details:', details);
          if (details) {
            // Если details.episodes равен 0, но есть подробный список серий, используем длину списка
            const episodesCount = (typeof details.episodes === 'number' && details.episodes > 0)
              ? details.episodes
              : (details.episodes_list && details.episodes_list.length > 0 ? details.episodes_list.length : 0);

            setAnime({
              id: details.id,
              title: details.title,
              description: details.description || '',
              image: details.image,
              episodes_count: String(episodesCount),
              status: details.status || 'Неизвестно',
              year: String(details.year || ''),
              genre: details.genres?.join(', ') || '',
              rating: String(details.rating || '0')
            });
            console.debug('Set anime state:', {
              id: details.id,
              episodes_count: String(episodesCount),
              episodes_list_length: details.episodes_list ? details.episodes_list.length : 0,
              episodes_field: details.episodes
            });
          } else {
            setError('Аниме не найдено');
          }
        } catch (err) {
          setError('Ошибка при загрузке данных');
          console.error('Error fetching anime details:', err);
        } finally {
          setIsLoading(false);
        }
      }
    };

    fetchAnimeDetails();
  }, [id]);

  const handleToggleFavorite = async () => {
    if (!user) {
      toast({
        title: "Требуется авторизация",
        description: "Войдите или зарегистрируйтесь, чтобы добавлять аниме в избранное",
        variant: "destructive"
      });
      return;
    }

    if (!anime || !id) return;

    try {
      let success: boolean;

      if (isFavorite) {
        success = await favoritesService.removeFromFavorites(id);
        if (success) {
          toast({
            title: "Удалено из избранного",
            description: "Аниме успешно удалено из избранного",
          });
          setIsFavorite(false);
        }
      } else {
        success = await favoritesService.addToFavorites({
          id: id,
          title: anime.title,
          image: anime.image,
          rating: parseFloat(anime.rating) || undefined,
          year: parseInt(anime.year) || undefined
        });
        if (success) {
          toast({
            title: "Добавлено в избранное",
            description: "Аниме успешно добавлено в избранное",
          });
          setIsFavorite(true);
        }
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось обновить избранное",
        variant: "destructive"
      });
    }

    setIsFavorite(!isFavorite);
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        {shouldShowPlayerInline && (
          <div className="mb-8">
            <VideoPlayer
              animeId={anime.id}
              title={anime.title}
              totalEpisodes={(() => {
                if (!anime.episodes_count) return 0;
                const match = anime.episodes_count.match(/\d+/);
                return match ? parseInt(match[0]) : 0;
              })()}
              imageUrl={anime.image}
            />
          </div>
        )}
        <div className="flex justify-center items-center min-h-[400px]">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  if (error || !anime) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center text-red-500">
          {error || 'Произошла ошибка при загрузке данных'}
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Левая колонка с изображением и кнопками */}
          <div className="lg:w-1/3">
            <div className="relative group">
              <img
                src={anime.image}
                alt={anime.title}
                className="w-full rounded-lg shadow-lg"
              />
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <Button onClick={() => setIsVideoOpen(true)} className="flex items-center gap-2">
                  <Play className="h-4 w-4" />
                  Смотреть
                </Button>
              </div>
            </div>

            <div className="mt-4 flex flex-col gap-2">
              <Button onClick={() => setIsVideoOpen(true)} className="w-full flex items-center gap-2">
                <Play className="h-4 w-4" />
                Смотреть
              </Button>
              <Button
                variant="outline"
                className="w-full flex items-center gap-2"
                onClick={handleToggleFavorite}
              >
                <Heart className={`h-4 w-4 ${isFavorite ? "text-red-500 fill-current" : ""}`} />
                {isFavorite ? "В избранном" : "В избранное"}
              </Button>
            </div>
          </div>

          {/* Правая колонка с информацией */}
          <div className="lg:w-2/3">
            <h1 className="text-3xl font-bold mb-4">{anime.title}</h1>

            <div className="flex flex-wrap gap-2 mb-6">
              <Badge variant="secondary">{anime.year}</Badge>
              <Badge variant="secondary">{anime.status}</Badge>
              <Badge variant="secondary">Эпизодов: {anime.episodes_count}</Badge>
              <Badge variant="secondary">Рейтинг: {anime.rating}</Badge>
            </div>

            <div className="mb-6">
              <h2 className="text-xl font-semibold mb-2">Жанры</h2>
              <div className="flex flex-wrap gap-2">
                {anime.genre ? anime.genre.split(', ').map((genre) => (
                  <Badge key={genre} variant="outline">
                    {genre}
                  </Badge>
                )) : (
                  <Badge variant="outline">Жанр не указан</Badge>
                )}
              </div>
            </div>

            <div>
              <h2 className="text-xl font-semibold mb-2">Описание</h2>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                {anime.description}
              </p>
            </div>
          </div>
        </div>
      </div>

      <VideoModal
        isOpen={isVideoOpen}
        onClose={() => setIsVideoOpen(false)}
        animeId={anime.id}
        title={anime.title}
        totalEpisodes={(() => {
          if (!anime.episodes_count) return 0;
          // Ищем первое число в строке (например, из "[1-156 из 157]" возьмет 156)
          const match = anime.episodes_count.match(/\d+/);
          return match ? parseInt(match[0]) : 0;
        })()}
        imageUrl={anime.image}
      />
    </>
  );
};

export default AnimeDetails;
