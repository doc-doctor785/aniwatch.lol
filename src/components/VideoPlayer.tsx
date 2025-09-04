import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Button } from './ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { animeApi } from '@/services/animeApi';
import * as backendApi from '@/services/backendApi';
import { userLevelService } from '@/services/userLevelService';
import { ChevronLeft, ChevronRight, Volume2, VolumeX, Maximize, Play, Pause } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface VideoPlayerProps {
  animeId: string;
  title: string;
  totalEpisodes: number;
  imageUrl: string;
  onExpand?: () => void;
}

interface EpisodeProgress {
  episodeId: string;
  watchedPercentage: number;
  isCompleted: boolean;
  progress: number;
  episodeNumber: number;
}

interface WatchProgress {
  animeId: string;
  episodes: EpisodeProgress[];
  currentEpisode: number;
  totalEpisodes: number;
  lastWatched: string;
  status: 'watching' | 'completed';
}

export const VideoPlayer = ({ animeId, title, totalEpisodes, imageUrl, onExpand }: VideoPlayerProps): JSX.Element => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const { user, updateUserData } = useAuth();
  const isMobile = useIsMobile();
  const { toast } = useToast();

  const [currentEpisode, setCurrentEpisode] = useState(1);
  const [episodes, setEpisodes] = useState<{ std: string; hd: string; number: number; name: string; }[]>([]);
  const [quality, setQuality] = useState<'std' | 'hd'>('hd');
  const [isWatched, setIsWatched] = useState(false);
  const [watchProgress, setWatchProgress] = useState<WatchProgress | null>(null);
  const [episodeProgress, setEpisodeProgress] = useState<EpisodeProgress | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isSeeking, setIsSeeking] = useState(false);
  const [seekValue, setSeekValue] = useState(0); // 0-100
  const [isInterfaceVisible, setIsInterfaceVisible] = useState(true);
  const wasPlayingRef = useRef<boolean>(false);
  const hideInterfaceTimerRef = useRef<NodeJS.Timeout>();
  const lastMouseMoveRef = useRef<number>(Date.now());

  // Обработчик для управления видимостью интерфейса
  const handleInterfaceVisibility = useCallback((event?: MouseEvent | TouchEvent) => {
    const now = Date.now();
    // Защита от слишком частых обновлений
    if (now - lastMouseMoveRef.current > 50) {
      setIsInterfaceVisible(true);
      lastMouseMoveRef.current = now;
      
      if (hideInterfaceTimerRef.current) {
        clearTimeout(hideInterfaceTimerRef.current);
      }
      
      if (isPlaying) {
        hideInterfaceTimerRef.current = setTimeout(() => {
          setIsInterfaceVisible(false);
        }, 3000);
      }
    }
  }, [isPlaying]);

  // Обработчик для перемотки видео
  const handlePointerMove = useCallback((e: any) => {
    if (!isSeeking) return;
    const video = videoRef.current;
    const track = trackRef.current;
    if (!track || !video) return;

    let clientX: number | undefined;
    if (e && typeof e.clientX === 'number') clientX = e.clientX;
    else if (e && e.touches && e.touches[0]) clientX = e.touches[0].clientX;
    if (clientX === undefined) return;

    const rect = track.getBoundingClientRect();
    const width = Number(rect.width) || 0;
    if (width <= 0) return; // nothing to compute

    const rawPercent = (clientX - rect.left) / width;
    const percent = Math.max(0, Math.min(1, Number(rawPercent) || 0));

    const durationVal = Number(video.duration);
    // if duration is not available yet, update UI but don't write to video.currentTime
    if (!isFinite(durationVal) || durationVal <= 0) {
      setSeekValue(percent * 100);
      setCurrentTime(0);
      return;
    }

    const time = Math.min(durationVal, Math.max(0, percent * durationVal));
    setSeekValue(percent * 100);
    setCurrentTime(time);
    // final guard before setting currentTime
    if (isFinite(time)) video.currentTime = time;
  }, [isSeeking]);

  const handlePointerUp = useCallback(() => {
    const video = videoRef.current;
    if (video) {
      const durationSafe = video.duration || 1;
      const currentPercent = (video.currentTime / durationSafe) * 100;
      const progress = video.currentTime / durationSafe;
      // обновим состояние прогресса, чтобы рендер точно взял новое значение
      setSeekValue(currentPercent);
      setCurrentTime(video.currentTime);
      setEpisodeProgress({
        episodeId: `${animeId}_${currentEpisode}`,
        episodeNumber: currentEpisode,
        watchedPercentage: currentPercent,
        progress,
        isCompleted: progress > 0.9,
      });
      // debug
      // console.debug('pointerUp', { currentTime: video.currentTime, duration: video.duration, currentPercent });

      if (wasPlayingRef.current) video.play();
    }
    setIsSeeking(false);

    window.removeEventListener('mousemove', handlePointerMove as any);
    window.removeEventListener('mouseup', handlePointerUp as any);
    window.removeEventListener('touchmove', handlePointerMove as any);
    window.removeEventListener('touchend', handlePointerUp as any);
    window.removeEventListener('pointermove', handlePointerMove as any);
    window.removeEventListener('pointerup', handlePointerUp as any);
  }, [handlePointerMove, animeId, currentEpisode]);

  const handleTrackPointerDown = useCallback((clientX: number) => {
    const video = videoRef.current;
    const track = trackRef.current;
    if (!track || !video) return;

    wasPlayingRef.current = !video.paused;
    video.pause();

    const rect = track.getBoundingClientRect();
  const width = Number(rect.width) || 0;
  const percent = width <= 0 ? 0 : Math.max(0, Math.min(1, (clientX - rect.left) / width));
  const durationVal = Number(video.duration);
  const time = (isFinite(durationVal) && durationVal > 0) ? durationVal * percent : 0;

    setSeekValue(percent * 100);
    setCurrentTime(time);
  if (isFinite(time)) video.currentTime = time;
    setIsSeeking(true);

    window.addEventListener('mousemove', handlePointerMove as any);
    window.addEventListener('mouseup', handlePointerUp as any);
    window.addEventListener('touchmove', handlePointerMove as any, { passive: false } as any);
    window.addEventListener('touchend', handlePointerUp as any);
    window.addEventListener('pointermove', handlePointerMove as any);
    window.addEventListener('pointerup', handlePointerUp as any);
  }, [handlePointerMove, handlePointerUp]);

  const formatTime = useCallback((time: number): string => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }, []);

  // Эффект для управления обработчиками событий интерфейса
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Показываем интерфейс при паузе
    if (!isPlaying) {
      setIsInterfaceVisible(true);
    }

    return () => {
      if (hideInterfaceTimerRef.current) {
        clearTimeout(hideInterfaceTimerRef.current);
      }
    };
  }, [isPlaying]);

  const updateWatchProgress = useCallback(async () => {
    if (!user) {
      toast({
        title: "Ошибка сохранения прогресса",
        description: "Необходимо войти в систему для сохранения прогресса просмотра",
        variant: "destructive",
      });
      return;
    }

    if (!videoRef.current || !animeId || !currentEpisode || !totalEpisodes) {
      console.error('Мissing required data:', {
        videoRef: !!videoRef.current,
        animeId,
        currentEpisode,
        totalEpisodes
      });
      return;
    }

    try {
      toast({
        title: "Сохранение прогресса...",
        description: `Эпизод ${currentEpisode}`,
      });

      const isLastEpisode = currentEpisode === totalEpisodes;
      await backendApi.updateWatchProgress({
        user_id: user.user_id,
        anime_id: String(animeId),
        episode_number: currentEpisode,
        total_episodes: totalEpisodes,
        status: isLastEpisode ? 'completed' : 'watching',
        title: title || '',
        image_url: imageUrl || ''
      });

      toast({
        title: isLastEpisode ? "Аниме просмотрено!" : "Прогресс сохранен",
        description: isLastEpisode 
          ? `Поздравляем! Вы завершили просмотр ${title}`
          : `Эпизод ${currentEpisode} отмечен как просмотренный`,
        variant: isLastEpisode ? "default" : "default",
      });

      try {
        const levelResult = await userLevelService.watchEpisode(user.user_id);
        if (!levelResult) {
          toast({
            title: 'Не удалось обновить уровень',
            description: 'Сервер не ответил об успешном обновлении уровня',
            variant: 'destructive',
          });
        } else {
          // Обновим данные пользователя в контексте, чтобы отразить новый уровень/опыт
          if (typeof updateUserData === 'function') {
            await updateUserData();
          }
        }
      } catch (err) {
        console.warn('Failed to update user level after watching episode', err);
        toast({
          title: 'Ошибка обновления уровня',
          description: err instanceof Error ? err.message : 'Не удалось обновить уровень пользователя',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error updating watch progress:', error);
      let errorMessage = 'Не удалось сохранить прогресс просмотра';
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      toast({
        title: "Ошибка сохранения прогресса",
        description: errorMessage,
        variant: "destructive",
      });
    }
  }, [user, animeId, currentEpisode, totalEpisodes, title, imageUrl, toast]);

  const handleTimeUpdate = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    if (!isSeeking) {
      setCurrentTime(video.currentTime);
      const progress = video.currentTime / (video.duration || 1);

      setSeekValue(progress * 100);

      setEpisodeProgress({
        episodeId: `${animeId}_${currentEpisode}`,
        episodeNumber: currentEpisode,
        watchedPercentage: progress * 100,
        progress,
        isCompleted: progress > 0.9
      });

      if (progress > 0.9 && user && !episodeProgress?.isCompleted) {
        updateWatchProgress();
      }
    }
  }, [animeId, currentEpisode, user, updateWatchProgress, isSeeking]);

  const handleEpisodeChange = useCallback((value: string) => {
    const newEpisode = Number(value);
    if (newEpisode !== currentEpisode && newEpisode > 0 && newEpisode <= totalEpisodes) {
      setCurrentEpisode(newEpisode);
      if (videoRef.current && episodes[newEpisode - 1]) {
        videoRef.current.src = episodes[newEpisode - 1][quality];
        videoRef.current.load();
        videoRef.current.play();
      }
    }
  }, [currentEpisode, episodes, quality, totalEpisodes]);

  const handlePreviousEpisode = useCallback(async () => {
    if (currentEpisode > 1) {
      await updateWatchProgress();
      setCurrentEpisode(prev => prev - 1);
    }
  }, [currentEpisode, updateWatchProgress]);

  const handleNextEpisode = useCallback(async () => {
    if (currentEpisode < totalEpisodes) {
      await updateWatchProgress();
      setCurrentEpisode(prev => prev + 1);
    }
  }, [currentEpisode, totalEpisodes, updateWatchProgress]);

  const handleQualityChange = useCallback((value: 'std' | 'hd') => {
    setQuality(value);
  }, []);

  const togglePlay = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    if (isPlaying) {
      video.pause();
    } else {
      video.play();
    }
  }, [isPlaying]);

  const toggleMute = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    video.muted = !video.muted;
    setIsMuted(video.muted);
  }, []);

  const toggleFullscreen = useCallback(() => {
    // Если передан обработчик onExpand — используем его (переход на страницу с плеером),
    // иначе выполняем стандартный fullscreen на контейнере плеера, чтобы сохранить оверлеи/контролы.
    if (onExpand) {
      onExpand();
      return;
    }

    const elem: Element | null = containerRef.current || videoRef.current;
    if (!elem) return;

    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      // requestFullscreen существует на Element; используем его безопасно
      if (typeof (elem as any).requestFullscreen === 'function') {
        (elem as any).requestFullscreen();
      }
    }
  }, [onExpand]);

  useEffect(() => {
    const loadEpisodes = async () => {
      try {
        const animeDetails = await animeApi.getAnimeById(animeId);
        if (animeDetails?.episodes_list) {
          console.log('Loaded episodes:', animeDetails.episodes_list);
          setEpisodes(animeDetails.episodes_list);
        } else {
          console.error('No episodes found in anime details:', animeDetails);
          toast({
            title: "Ошибка загрузки серий",
            description: "Не удалось получить список серий",
            variant: "destructive",
          });
        }
      } catch (error) {
        console.error('Error loading episodes:', error);
        toast({
          title: "Ошибка загрузки серий",
          description: "Произошла ошибка при загрузке списка серий",
          variant: "destructive",
        });
      }
    };

    loadEpisodes();
  }, [animeId, toast]);

  useEffect(() => {
    console.log('Current episode:', currentEpisode);
    console.log('Episodes array:', episodes);
    console.log('Current quality:', quality);
    if (videoRef.current && episodes[currentEpisode - 1]) {
      const source = episodes[currentEpisode - 1][quality];
      console.log('Setting video source to:', source);
      videoRef.current.src = source;
      videoRef.current.load();
    } else {
      console.log('Cannot set video source:', {
        hasVideoRef: !!videoRef.current,
        hasEpisode: !!episodes[currentEpisode - 1]
      });
    }
  }, [currentEpisode, episodes, quality]);

  const handleVideoEnded = useCallback(async () => {
    try {
      await updateWatchProgress();

      if (currentEpisode === totalEpisodes) {
        setIsWatched(true);
      } else if (currentEpisode < totalEpisodes) {
        handleNextEpisode();
      }
    } catch (error) {
      console.error('Error in handleVideoEnded:', error);
    }
  }, [currentEpisode, totalEpisodes, updateWatchProgress, handleNextEpisode]);

  useEffect(() => {
    const video = videoRef.current;
    const container = containerRef.current;
    if (!video || !container) return;

    const handleLoadedMetadata = () => setDuration(video.duration);
    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);

    // Добавляем обработчики для интерфейса
    container.addEventListener('mousemove', handleInterfaceVisibility);
    container.addEventListener('touchstart', handleInterfaceVisibility);
    container.addEventListener('touchmove', handleInterfaceVisibility);

    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('ended', handleVideoEnded);

    return () => {
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('ended', handleVideoEnded);

      // Удаляем обработчики интерфейса
      container.removeEventListener('mousemove', handleInterfaceVisibility);
      container.removeEventListener('touchstart', handleInterfaceVisibility);
      container.removeEventListener('touchmove', handleInterfaceVisibility);
      
      if (hideInterfaceTimerRef.current) {
        clearTimeout(hideInterfaceTimerRef.current);
      }
    };
  }, [handleTimeUpdate, handleVideoEnded]);

  return (
  <div className="w-full max-w-5xl mx-auto min-h-screen flex items-center justify-center p-4 sm:p-0 sm:min-h-0 sm:block">
      {watchProgress && (
        <div className="mb-4 p-4 bg-secondary/10 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">
                Текущий прогресс: {watchProgress.currentEpisode} из {watchProgress.totalEpisodes} эпизодов
              </p>
              {watchProgress.lastWatched && (
                <p className="text-xs text-muted-foreground">
                  Последний просмотр: {new Date(watchProgress.lastWatched).toLocaleDateString()}
                </p>
              )}
            </div>
            <div className="text-sm">
              Статус: {watchProgress.status === 'completed' ? 'Просмотрено' : 'Смотрю'}
            </div>
          </div>
        </div>
      )}

  {/* Верхняя панель с переключением эпизодов и качеством удалена по запросу */}

  <div 
    ref={containerRef} 
    className="relative aspect-video bg-black rounded-lg overflow-hidden"
  >
        <video
          ref={videoRef}
          className="w-full h-full"
          controls={false}
          autoPlay
        />

        <div 
          className={cn(
            "absolute inset-0 bg-gradient-to-t from-black/60 to-transparent transition-opacity duration-300",
            isInterfaceVisible ? "opacity-100" : "opacity-0"
          )}>
          <div className="absolute top-0 left-0 right-0 p-4 flex items-center justify-between">
            <div className="text-white text-sm">
              {formatTime(currentTime)} / {formatTime(duration)}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleMute}
                className="text-white hover:bg-white/20"
              >
                {isMuted ? (
                  <VolumeX className="w-5 h-5" />
                ) : (
                  <Volume2 className="w-5 h-5" />
                )}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleFullscreen}
                className="text-white hover:bg-white/20"
              >
                <Maximize className="w-5 h-5" />
              </Button>
            </div>
          </div>

          <Button
            variant="ghost"
            size="icon"
            onClick={togglePlay}
            className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-white hover:bg-white/20 h-16 w-16"
          >
            {isPlaying ? (
              <Pause className="w-8 h-8" />
            ) : (
              <Play className="w-8 h-8" />
            )}
          </Button>

          <div className="absolute bottom-16 left-0 right-0 px-4">
            <div
              ref={trackRef}
              onMouseDown={(e) => handleTrackPointerDown(e.clientX)}
              onTouchStart={(e) => {
                if (e.touches && e.touches.length) handleTrackPointerDown(e.touches[0].clientX);
              }}
              onPointerDown={(e: React.PointerEvent) => handleTrackPointerDown(e.clientX)}
              className="relative w-full bg-white/30 rounded-full h-1 cursor-pointer"
              style={{ touchAction: 'none' }}
            >
              <div
                className="bg-primary h-1 rounded-full transition-all"
                style={{ width: `${(isSeeking ? seekValue : (episodeProgress?.progress || 0) * 100)}%` }}
              />

              {/* Thumb */}
              <div
                role="slider"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round(isSeeking ? seekValue : (episodeProgress?.progress || 0) * 100)}
                draggable={false}
                onDragStart={(e) => e.preventDefault()}
                onPointerDown={(e) => {
                  e.preventDefault();
                  e.currentTarget.setPointerCapture(e.pointerId);
                  handleTrackPointerDown(e.clientX);
                }}
                onPointerMove={(e) => {
                  if (isSeeking) {
                    e.preventDefault();
                    const track = trackRef.current;
                    const video = videoRef.current;
                    if (!track || !video) return;

                    const rect = track.getBoundingClientRect();
                    const width = Number(rect.width) || 0;
                    if (width <= 0) return;

                    const rawPercent = (e.clientX - rect.left) / width;
                    const percent = Math.max(0, Math.min(1, Number(rawPercent) || 0));
                    const durationVal = Number(video.duration);

                    const time = (isFinite(durationVal) && durationVal > 0) ? Math.min(durationVal, Math.max(0, percent * durationVal)) : 0;

                    setSeekValue(percent * 100);
                    setCurrentTime(time);
                    if (isFinite(time)) video.currentTime = time;
                  }
                }}
                onPointerUp={(e) => {
                  e.currentTarget.releasePointerCapture(e.pointerId);
                  handlePointerUp();
                }}
                className="absolute top-1/2 -translate-y-1/2 bg-white shadow-md w-4 h-4 rounded-full cursor-pointer hover:scale-125 transition-transform"
                style={{ 
                  left: `calc(${(isSeeking ? seekValue : (episodeProgress?.progress || 0) * 100)}% - 8px)`,
                  touchAction: 'none',
                  userSelect: 'none',
                  WebkitUserSelect: 'none',
                  cursor: 'grab',
                  zIndex: 10
                }}
              />
            </div>
          </div>

          <div className="absolute bottom-0 left-0 right-0 p-4 flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={handlePreviousEpisode}
              disabled={currentEpisode <= 1}
              className="text-white hover:bg-white/20"
            >
              <ChevronLeft className="w-6 h-6" />
            </Button>

            <div className="flex-1 flex items-center gap-2">
              <Select value={currentEpisode.toString()} onValueChange={handleEpisodeChange}>
                <SelectTrigger className="h-8 bg-black/50 border-0 text-white hover:bg-black/70 min-w-[120px]">
                  <SelectValue placeholder={`Эпизод ${currentEpisode}`} />
                </SelectTrigger>
                <SelectContent className="max-h-[40vh]">
                  {episodes.map((episode) => (
                    <SelectItem key={episode.number} value={episode.number.toString()}>
                      Эпизод {episode.number} - {episode.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <span className="text-white text-sm">
                из {episodes.length > 0 ? episodes.length : totalEpisodes}
              </span>
            </div>

            <Select value={quality} onValueChange={handleQualityChange}>
              <SelectTrigger className="h-8 w-[80px] bg-black/50 border-0 text-white hover:bg-black/70">
                <SelectValue placeholder={quality === 'hd' ? '720p' : '480p'} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="std">480p</SelectItem>
                <SelectItem value="hd">720p</SelectItem>
              </SelectContent>
            </Select>

            <Button
              variant="ghost"
              size="icon"
              onClick={handleNextEpisode}
              disabled={currentEpisode >= totalEpisodes}
              className="text-white hover:bg-white/20"
            >
              <ChevronRight className="w-6 h-6" />
            </Button>
          </div>
        </div>
      </div>

      {isWatched && (
        <div className="text-green-500 text-center mt-4">
          Поздравляем! Вы посмотрели все эпизоды этого аниме.
        </div>
      )}
    </div>
  );
}
