import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { favoritesService, FavoriteAnime } from '@/services/favoritesService';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';


export default function Favorites() {
  const navigate = useNavigate();
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
  const { toast } = useToast();
  const { user, isLoading: isAuthLoading } = useAuth();
  const [favorites, setFavorites] = useState<FavoriteAnime[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Если еще идет загрузка данных пользователя, ждем
    if (isAuthLoading) {
      return;
    }

    // Если загрузка завершена и пользователь не авторизован, редиректим
    if (!user) {
      toast({
        title: "Необходима авторизация",
        description: "Для доступа к избранному необходимо войти в систему",
        variant: "destructive"
      });
      navigate('/', { replace: true });
      return;
    }

    // Если пользователь авторизован, загружаем избранное
    favoritesService.setUserId(user.user_id);
    void loadFavorites();
  }, [user, isAuthLoading, navigate, toast]);

  const loadFavorites = async () => {
    setIsLoading(true);
    try {
      const favs = await favoritesService.getFavorites();
      console.log('Загруженные избранные:', favs); // Отладочная информация
      setFavorites(favs);
    } catch (error) {
      console.error('Ошибка при загрузке избранного:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось загрузить избранное",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const removeFromFavorites = async (animeId: string) => {
    try {
      const success = await favoritesService.removeFromFavorites(animeId);
      if (success) {
        setFavorites(prev => prev.filter(item => item.id !== animeId));
        toast({
          title: "Удалено из избранного",
          description: "Аниме успешно удалено из избранного",
        });
      } else {
        throw new Error("Failed to remove from favorites");
      }
    } catch (error) {
      toast({
        title: "Ошибка",
        description: "Не удалось удалить аниме из избранного",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8 grid grid-cols-3 items-center">
        <div className="text-left">
          <Button variant="ghost" size="sm" onClick={handleBack} aria-label="Назад">← Назад</Button>
        </div>

        <div className="text-center">
          <h1 className="text-3xl font-bold gradient-text mb-2">Избранное</h1>
          <p className="text-muted-foreground">
            Ваши любимые аниме ({favorites.length})
          </p>
        </div>

        <div />
      </div>

      {isLoading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground mt-4">Загрузка избранного...</p>
        </div>
      ) : favorites.length === 0 ? (
        <div className="text-center py-12">
          <Heart className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold mb-2">Избранное пусто</h2>
          <p className="text-muted-foreground mb-4">
            Добавьте аниме в избранное, чтобы быстро находить их здесь
          </p>
          <Button
            className="btn-anime"
            onClick={() => navigate('/catalog')}
          >
            Найти аниме
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {favorites.map((fav) => (
            <div
              key={fav.id}
              className="anime-card group cursor-pointer"
              onClick={() => navigate(`/anime/${fav.id}`)}
            >
              <div className="aspect-[3/4] overflow-hidden rounded-t-xl relative">
                <img
                  src={fav.image}
                  alt={fav.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeFromFavorites(fav.id);
                  }}
                  className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
              <div className="p-4">
                <h3 className="font-medium text-sm mb-2 line-clamp-2">{fav.title}</h3>
                {fav.rating && (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <span>★ {fav.rating}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
