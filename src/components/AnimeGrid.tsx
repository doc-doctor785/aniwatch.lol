import { AnimeCard } from "./AnimeCard";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface Anime {
  id: string;
  title: string;
  image: string;
  rating?: number;
  year?: number;
  status?: string;
  description?: string;
  isFavorite?: boolean;
}

interface AnimeGridProps {
  animes: Anime[];
  loading?: boolean;
  onAnimeClick?: (anime: Anime) => void;
  onToggleFavorite?: (animeId: string) => void;
  className?: string;
  skeletonCount?: number;
}

export function AnimeGrid({
  animes,
  loading = false,
  onAnimeClick,
  onToggleFavorite,
  className,
  skeletonCount = 12
}: AnimeGridProps) {
  if (loading) {
    return (
      <div className={cn(
        "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4",
        className
      )}>
        {Array.from({ length: skeletonCount }).map((_, index) => (
          <AnimeCardSkeleton key={index} />
        ))}
      </div>
    );
  }

  if (animes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-24 h-24 bg-muted rounded-full flex items-center justify-center mb-4">
          <svg className="w-12 h-12 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 4V2a1 1 0 011-1h8a1 1 0 011 1v2m-9 4v10a2 2 0 002 2h8a2 2 0 002-2V8M9 12h6m-6 4h6" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-foreground mb-2">Аниме не найдено</h3>
        <p className="text-muted-foreground max-w-md">
          Попробуйте изменить параметры поиска или просмотрите популярные аниме
        </p>
      </div>
    );
  }

  return (
    <div className={cn(
      "grid auto-rows-auto grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8 gap-4",
      className
    )}>
      {animes.map((anime) => (
        <AnimeCard
          key={anime.id}
          id={anime.id}
          title={anime.title}
          image={anime.image}
          rating={anime.rating}
          year={anime.year}
          status={anime.status}
          description={anime.description}
          isFavorite={anime.isFavorite}
          onClick={() => onAnimeClick?.(anime)}
          onToggleFavorite={() => onToggleFavorite?.(anime.id)}
        />
      ))}
    </div>
  );
}

function AnimeCardSkeleton() {
  return (
    <div className="anime-card">
      <div className="aspect-[3/4] overflow-hidden rounded-t-xl">
        <Skeleton className="w-full h-full loading-shimmer" />
      </div>
      <div className="p-4 space-y-2">
        <Skeleton className="h-4 w-3/4 loading-shimmer" />
        <Skeleton className="h-3 w-1/2 loading-shimmer" />
        <Skeleton className="h-3 w-full loading-shimmer" />
        <Skeleton className="h-3 w-2/3 loading-shimmer" />
      </div>
    </div>
  );
}
