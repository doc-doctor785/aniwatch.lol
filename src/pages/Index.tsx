import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { AnimeGrid } from "@/components/AnimeGrid";
import { SearchBar } from "@/components/SearchBar";
import { Button } from "@/components/ui/button";
import { CategoryTabs } from "@/components/CategoryTabs";
import { animeApi, AnimeResponse } from "@/services/animeApi";
import { TrendingUp, Star, Clock, PlayCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { favoritesService } from "@/services/favoritesService";
import { useAuth } from "@/contexts/AuthContext";

const categories = [
  { icon: TrendingUp, label: "Популярное", value: "popular" },
  { icon: Star, label: "Лучшее", value: "top" },
  { icon: Clock, label: "Недавнее", value: "recent" },
  { icon: PlayCircle, label: "Онгоинги", value: "ongoing" },
];

const Index = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [popularAnimes, setPopularAnimes] = useState<AnimeResponse[]>([]);
  const [searchResults, setSearchResults] = useState<AnimeResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchLoading, setSearchLoading] = useState(false);
  const [currentQuery, setCurrentQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const perPage = 24;
  const [hasNextPage, setHasNextPage] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [activeCategory, setActiveCategory] = useState("popular");
  const { toast } = useToast();

  // Загружаем/обновляем список при смене категории или изменении авторизации
  useEffect(() => {
    loadPopularAnime(1, false, activeCategory);
  }, [activeCategory, user]);

  const loadPopularAnime = async (page: number = 1, isLoadingMore: boolean = false, category: string = 'popular') => {
    try {
      if (isLoadingMore) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }

  const result = await animeApi.getPopularAnime(page, perPage);
  let animesWithFavorites = result.animes;

      if (user) {
        try {
          const favorites = await favoritesService.getFavorites();
          const favoriteIds = favorites?.map(fav => fav.id.toString()) || [];
          animesWithFavorites = result.animes.map(anime => ({
            ...anime,
            isFavorite: favoriteIds.includes(anime.id.toString())
          }));
        } catch (error) {
          console.warn('Error loading favorites:', error);
          animesWithFavorites = result.animes.map(anime => ({
            ...anime,
            isFavorite: false
          }));
        }
      }

      // Client-side filtering / sorting depending on selected category
      const filterByCategory = (list: typeof animesWithFavorites) => {
        switch (category) {
          case 'top':
            return [...list].sort((a, b) => (b.rating || 0) - (a.rating || 0));
          case 'recent':
            return [...list].sort((a, b) => (b.year || 0) - (a.year || 0));
          case 'ongoing':
            return list.filter(a => {
              const status = (a.status || '').toLowerCase();
              return status.includes('ongo') || status.includes('air') || status.includes('онго');
            });
          case 'popular':
          default:
            // try to use popularity, fallback to rating
            return [...list].sort((a, b) => ((b.popularity as any || b.rating || 0) - (a.popularity as any || a.rating || 0)));
        }
      };

      const finalList = filterByCategory(animesWithFavorites);

      if (isLoadingMore) {
        setPopularAnimes(prev => [...prev, ...finalList]);
      } else {
        setPopularAnimes(finalList);
      }

      setHasNextPage(result.hasNextPage);
      setCurrentPage(result.currentPage);
    } catch (error) {
      console.error("Error loading popular anime:", error);
      toast({
        title: "Ошибка загрузки",
        description: "Не удалось загрузить популярные аниме",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const handleLoadMore = () => {
    if (!loadingMore && hasNextPage) {
  loadPopularAnime(currentPage + 1, true, activeCategory);
    }
  };

  const handleSearch = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      setCurrentQuery("");
      return;
    }

    try {
      setSearchLoading(true);
      setCurrentQuery(query);
      const result = await animeApi.searchAnime(query);
      let animesWithFavorites = result.animes;

      if (user) {
        try {
          const favorites = await favoritesService.getFavorites();
          const favoriteIds = favorites?.map(fav => fav.id.toString()) || [];
          animesWithFavorites = result.animes.map(anime => ({
            ...anime,
            isFavorite: favoriteIds.includes(anime.id.toString())
          }));
        } catch (error) {
          console.warn('Error loading favorites:', error);
          animesWithFavorites = result.animes.map(anime => ({
            ...anime,
            isFavorite: false
          }));
        }
      }

      setSearchResults(animesWithFavorites);

      if (result.animes.length === 0) {
        toast({
          title: "Поиск завершен",
          description: `По запросу "${query}" ничего не найдено`,
        });
      }
    } catch (error) {
      console.error("Error searching anime:", error);
      toast({
        title: "Ошибка поиска",
        description: "Не удалось выполнить поиск",
        variant: "destructive"
      });
    } finally {
      setSearchLoading(false);
    }
  };

  const handleAnimeClick = (anime: AnimeResponse) => {
    navigate(`/anime/${anime.id}`);
  };

  const handleToggleFavorite = async (animeId: string) => {
    if (!user) {
      toast({
        title: "Требуется авторизация",
        description: "Войдите или зарегистрируйтесь, чтобы добавлять аниме в избранное",
        variant: "destructive"
      });
      return;
    }

    const anime = displayAnimes.find(a => a.id === animeId);
    if (!anime) return;

    try {
      // Сначала обновляем состояние локально
      const updateAnimeList = (animes: AnimeResponse[]) =>
        animes.map(a => ({
          ...a,
          isFavorite: a.id === animeId ? !a.isFavorite : a.isFavorite
        }));

      setPopularAnimes(prev => updateAnimeList(prev));
      setSearchResults(prev => updateAnimeList(prev));

      // Затем выполняем действие с сервером
      try {
        if (anime.isFavorite) {
          await favoritesService.removeFromFavorites(animeId);

          toast({
            title: "Удалено из избранного",
            description: "Аниме успешно удалено из избранного",
          });
        } else {
          await favoritesService.addToFavorites({
            id: animeId,
            title: anime.title,
            image: anime.image
          });

          toast({
            title: "Добавлено в избранное",
            description: "Аниме успешно добавлено в избранное",
          });
        }
      } catch (error) {
        // В случае ошибки отменяем локальное изменение
        const revertAnimeList = (animes: AnimeResponse[]) =>
          animes.map(a => ({
            ...a,
            isFavorite: a.id === animeId ? !a.isFavorite : a.isFavorite
          }));

        setPopularAnimes(prev => revertAnimeList(prev));
        setSearchResults(prev => revertAnimeList(prev));

        throw error; // Пробрасываем ошибку дальше для обработки в основном блоке catch
      }

      // Обновляем кэш
      await favoritesService.getFavorites();
    } catch (error) {
      console.error('Error toggling favorite:', error);
      toast({
        title: "Ошибка",
        description: error instanceof Error ? error.message : "Не удалось обновить избранное",
        variant: "destructive"
      });
    }
  };

  const displayAnimes = currentQuery ? searchResults : popularAnimes;
  const isShowingSearchResults = currentQuery && searchResults.length > 0;

  return (
    <div className="min-h-screen bg-background">
      <Header onSearch={handleSearch} searchLoading={searchLoading} />

      <main className="container mx-auto px-4 py-8">
        {/* Hero Section */}
        {!currentQuery && (
          <section className="relative mb-12 py-16 px-8 rounded-2xl bg-gradient-hero border border-border/10 overflow-hidden backdrop-blur">
            <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg%20width=%2240%22%20height=%2240%22%20viewBox=%220%200%2040%2040%22%20xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cg%20fill=%22none%22%20fill-rule=%22evenodd%22%3E%3Cg%20fill=%22%23ffffff%22%20fill-opacity=%220.02%22%3E%3Ccircle%20cx=%223%22%20cy=%223%22%20r=%223%22/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')] opacity-20"></div>

            <div className="relative z-10 text-center max-w-4xl mx-auto animate-fadeIn">
              <h1 className="text-4xl md:text-6xl font-bold mb-6 tracking-tight">
                <span className="gradient-text">AniWatch</span>
              </h1>
              <p className="text-xl md:text-2xl text-muted-foreground mb-8 leading-relaxed">
                Откройте для себя мир аниме.<br />
                Тысячи тайтлов, удобный поиск, качественная озвучка.
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
                <SearchBar
                  onSearch={handleSearch}
                  loading={searchLoading}
                  placeholder="Поиск по названию аниме..."
                  className="w-full sm:w-auto min-w-[400px] shadow-lg"
                />
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
                {categories.map(category => (
                  <button
                    key={category.value}
                    type="button"
                    onClick={() => setActiveCategory(category.value)}
                    aria-pressed={activeCategory === category.value}
                    className="group space-y-2 p-4 rounded-xl transition-all duration-300 hover:bg-primary/5 focus:outline-none"
                  >
                    <div className="w-12 h-12 mx-auto bg-primary/20 rounded-full flex items-center justify-center transition-transform duration-300 group-hover:scale-110">
                      <category.icon className="w-6 h-6 text-primary" />
                    </div>
                    <h3 className="font-semibold">{category.label}</h3>
                    <p className="text-sm text-muted-foreground">
                      {category.value === 'popular' && 'Самые популярные аниме'}
                      {category.value === 'top' && 'Лучшие по оценкам'}
                      {category.value === 'recent' && 'Свежие релизы'}
                      {category.value === 'ongoing' && 'Текущие онгоинги'}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Content Section */}
        <section className="animate-fadeIn">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
            <div>
              <h2 className="text-2xl md:text-3xl font-bold mb-2">
                {isShowingSearchResults
                  ? `Результаты поиска: "${currentQuery}"`
                  : activeCategory === 'popular' ? 'Популярные аниме'
                  : activeCategory === 'top' ? 'Лучшие аниме'
                  : activeCategory === 'recent' ? 'Недавние релизы'
                  : activeCategory === 'ongoing' ? 'Текущие онгоинги'
                  : 'Аниме'
                }
              </h2>
              {!isShowingSearchResults && (
                <p className="text-muted-foreground">
                  Выберите категорию или воспользуйтесь поиском
                </p>
              )}
            </div>

            <div className="flex items-center gap-4">
              {!currentQuery && (
                <CategoryTabs
                  categories={categories}
                  activeCategory={activeCategory}
                  onSelect={setActiveCategory}
                />
              )}

              {isShowingSearchResults && (
                <Button
                  onClick={() => {
                    setCurrentQuery("");
                    setSearchResults([]);
                  }}
                  variant="outline"
                  className="btn-anime-outline"
                >
                  Очистить поиск
                </Button>
              )}
            </div>
          </div>

          <AnimeGrid
            animes={displayAnimes}
            loading={loading || searchLoading}
            onAnimeClick={handleAnimeClick}
            onToggleFavorite={handleToggleFavorite}
            skeletonCount={24}
          />

          {/* Кнопка загрузки отключена на главной — используется только в каталоге */}
        </section>
      </main>
    </div>
  );
};

export default Index;
