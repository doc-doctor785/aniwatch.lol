import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Filter, SortAsc, Grid, List } from 'lucide-react';
import { AnimeGrid } from '@/components/AnimeGrid';
import { SearchBar } from '@/components/SearchBar';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { animeApi, AnimeResponse } from '@/services/animeApi';
import { useToast } from '@/hooks/use-toast';
import { favoritesService } from '@/services/favoritesService';
import { useAuth } from '@/contexts/AuthContext';
import { ANIME_GENRES, AnimeGenre, normalizeGenre } from '@/constants/genres';

interface Filters {
  genres: AnimeGenre[];
  status: string;
  type: string;
  year: string;
  rating: string;
}

export default function Catalog() {
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
  const { user } = useAuth();
  const { toast } = useToast();

  const [animes, setAnimes] = useState<AnimeResponse[]>([]);
  const [filteredAnimes, setFilteredAnimes] = useState<AnimeResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const lastLoadRef = useRef<number>(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('popularity');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showFilters, setShowFilters] = useState(false);

  const [filters, setFilters] = useState<Filters>({
    genres: [],
    status: '',
    type: '',
    year: '',
    rating: '',
  });

  const sortOptions = [
    { value: 'popularity', label: 'По популярности' },
    { value: 'rating', label: 'По рейтингу' },
    { value: 'name', label: 'По названию' },
    { value: 'year', label: 'По году' },
    { value: 'updated', label: 'Обновленные' },
  ];

  const applyFiltersAndSort = () => {
    let filtered = [...animes];

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(anime =>
        anime.title.toLowerCase().includes(query)
      );
    }

    // Фильтрация по жанрам
    if (filters.genres.length > 0) {
      filtered = filtered.filter(anime => {
        if (!anime.genres || anime.genres.length === 0) return false;
        
        // Нормализуем жанры аниме
        const normalizedAnimeGenres = anime.genres
          .map(g => normalizeGenre(g))
          .filter((g): g is AnimeGenre => g !== null);

        // Проверяем совпадение хотя бы одного жанра
        const hasMatch = filters.genres.some(filterGenre =>
          normalizedAnimeGenres.some(animeGenre => animeGenre === filterGenre)
        );

        return hasMatch;
      });
    }

    if (filters.status) {
      filtered = filtered.filter(anime => anime.status === filters.status);
    }

    if (filters.type) {
      filtered = filtered.filter(anime => anime.type === filters.type);
    }

    if (filters.year) {
      filtered = filtered.filter(anime => anime.year === parseInt(filters.year));
    }

    if (filters.rating) {
      filtered = filtered.filter(anime =>
        anime.rating >= parseFloat(filters.rating)
      );
    }

    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'rating':
          return (b.rating || 0) - (a.rating || 0);
        case 'name':
          return a.title.localeCompare(b.title);
        case 'year':
          return (b.year || 0) - (a.year || 0);
        case 'updated':
          return new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime();
        default:
          return (b.popularity || 0) - (a.popularity || 0);
      }
    });

    setFilteredAnimes(filtered);
  };

  const loadPopularAnime = async (page: number = 1, isLoadingMore: boolean = false) => {
    try {
      if (isLoadingMore) setLoadingMore(true);
      else setIsLoading(true);

  console.log('Загружаем страницу аниме', page);
  // уменьшенный размер страницы — при небольшом общем количестве аниме
  // позволит бесконечному скроллу срабатывать больше раз
  const result = await animeApi.getPopularAnime(page, 12);

      const favorites = user ? await favoritesService.getFavorites() : [];
      const animesWithFavorites = result.animes.map(anime => ({
        ...anime,
        isFavorite: favorites.some(fav => fav.id === anime.id)
      }));

      if (isLoadingMore) {
        setAnimes(prev => [...prev, ...animesWithFavorites]);
      } else {
        setAnimes(animesWithFavorites);
      }

      setHasNextPage(!!result.hasNextPage);
      setCurrentPage(result.currentPage || page);
    } catch (error) {
      console.error('Ошибка при загрузке аниме:', error);
      toast({
        title: "Ошибка загрузки",
        description: "Не удалось загрузить список аниме",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
  void loadPopularAnime(1, false);
  }, []);

  useEffect(() => {
    applyFiltersAndSort();
  }, [animes, searchQuery, sortBy, filters]);


  const handleLoadMore = useCallback(() => {
    console.log('Catalog: handleLoadMore called', { currentPage, hasNextPage, loadingMore, isLoading, lastLoad: lastLoadRef.current });
    if (!loadingMore && hasNextPage) {
      const now = Date.now();
      if (now - lastLoadRef.current < 700) {
        console.log('Catalog: load throttled');
        return;
      }
      lastLoadRef.current = now;
      console.log('Catalog: invoking loadPopularAnime for page', currentPage + 1);
      void loadPopularAnime(currentPage + 1, true);
    }
  }, [loadingMore, hasNextPage, currentPage]);

  // Setup intersection observer for infinite scroll
  useEffect(() => {
    if (searchQuery) return;

    if (observerRef.current) {
      observerRef.current.disconnect();
      observerRef.current = null;
    }

    observerRef.current = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          console.log('Catalog: sentinel intersecting', {
            currentPage,
            hasNextPage,
            loadingMore,
            isLoading
          });
          if (!searchQuery && hasNextPage && !loadingMore && !isLoading) {
            console.log('Catalog: triggering load more from observer');
            handleLoadMore();
          }
        }
      });
    }, { root: null, rootMargin: '400px', threshold: 0.1 });

    const el = sentinelRef.current;
    if (el) observerRef.current.observe(el);

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
        observerRef.current = null;
      }
    };
  }, [searchQuery, hasNextPage, loadingMore, isLoading, handleLoadMore]);

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
  };


  useEffect(() => {
    if (filters.genres.length > 0) {
      console.log('Выбранные жанры:', filters.genres);
    }
  }, [filters.genres]);

  const handleToggleFavorite = async (animeId: string) => {
    if (!user) {
      toast({
        title: "Требуется авторизация",
        description: "Чтобы добавлять аниме в избранное, необходимо войти в аккаунт",
        variant: "destructive"
      });
      return;
    }

    const targetAnime = filteredAnimes.find(a => a.id === animeId);
    if (!targetAnime) return;

    try {
      const isFavorite = await favoritesService.isFavorite(animeId);

      if (isFavorite) {
        const success = await favoritesService.removeFromFavorites(animeId);
        if (success) {
          toast({
            title: "Удалено из избранного",
            description: "Аниме успешно удалено из избранного",
          });

          setAnimes(prev => prev.map(a =>
            a.id === animeId ? { ...a, isFavorite: false } : a
          ));
          setFilteredAnimes(prev => prev.map(a =>
            a.id === animeId ? { ...a, isFavorite: false } : a
          ));
        }
      } else {
        const favoriteData = {
          id: targetAnime.id,
          title: targetAnime.title,
          image: targetAnime.image,
          rating: targetAnime.rating,
          year: targetAnime.year
        };
        const success = await favoritesService.addToFavorites(favoriteData);
        if (success) {
          toast({
            title: "Добавлено в избранное",
            description: "Аниме успешно добавлено в избранное",
          });

          setAnimes(prev => prev.map(a =>
            a.id === animeId ? { ...a, isFavorite: true } : a
          ));
          setFilteredAnimes(prev => prev.map(a =>
            a.id === animeId ? { ...a, isFavorite: true } : a
          ));
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
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-4">
        <Button variant="ghost" size="sm" onClick={handleBack} aria-label="Назад">← Назад</Button>
      </div>
      <div className="flex flex-col gap-6">
        {/* Search and Filters */}
        <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
          <div className="w-full md:w-96">
            <SearchBar
              value={searchQuery}
              onChange={setSearchQuery}
              onSearch={handleSearch}
              placeholder="Поиск аниме..."
            />
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="h-4 w-4" />
            </Button>

            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-[180px]">
                <SortAsc className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Сортировка" />
              </SelectTrigger>
              <SelectContent>
                {sortOptions.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="flex gap-1">
              <Button
                variant={viewMode === 'grid' ? 'default' : 'outline'}
                size="icon"
                onClick={() => setViewMode('grid')}
              >
                <Grid className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'outline'}
                size="icon"
                onClick={() => setViewMode('list')}
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Filters Panel */}
        {showFilters && (
          <div className="bg-card p-4 rounded-lg shadow-sm">
            <h3 className="font-medium mb-4">Фильтры</h3>
            <div className="space-y-4">
              {/* Жанры */}
              <div>
                <label className="text-sm font-medium mb-2 block">Жанры</label>
                <div className="flex flex-wrap gap-2">
                  {ANIME_GENRES.map(genre => (
                    <Badge
                      key={genre}
                      variant={filters.genres.includes(genre) ? "default" : "outline"}
                      className="cursor-pointer"
                      onClick={() => {
                        const normalizedGenre = genre;
                        setFilters(prev => ({
                          ...prev,
                          genres: prev.genres.includes(normalizedGenre)
                            ? prev.genres.filter(g => g !== normalizedGenre)
                            : [...prev.genres, normalizedGenre]
                        }));
                      }}
                    >
                      {genre}
                    </Badge>
                  ))}
                </div>
              </div>

              <Separator />

              {/* TODO: Добавить фильтры по статусу, типу, году, рейтингу */}
            </div>
          </div>
        )}

        {/* Anime Grid */}
        <AnimeGrid
          animes={filteredAnimes}
          loading={isLoading}
          onAnimeClick={(anime) => navigate(`/anime/${anime.id}`)}
          onToggleFavorite={handleToggleFavorite}
        />
        {!searchQuery && (
          <>
            {/* sentinel for IntersectionObserver infinite scroll */}
            <div ref={sentinelRef} className="h-1" />

            {/* fallback/manual load more button for accessibility */}
            <div className="flex justify-center mt-6">
              <Button onClick={handleLoadMore} disabled={loadingMore || !hasNextPage} variant="secondary">
                {loadingMore ? 'Загрузка...' : (hasNextPage ? 'Загрузить ещё' : 'Больше нет')}
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
