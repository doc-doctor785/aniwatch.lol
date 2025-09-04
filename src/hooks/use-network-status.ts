import { useState, useEffect } from 'react';
import { networkService } from '@/services/networkService';
import { useToast } from './use-toast';

export function useNetworkStatus(backendUrl: string) {
  const [isOnline, setIsOnline] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    let mounted = true;
    let checkInterval: NodeJS.Timeout;

    const checkConnection = async () => {
      if (!mounted) return;

      const wasOnline = networkService.isServerAvailable();
      const isAvailable = await networkService.checkServerAvailability(backendUrl);

      if (!mounted) return;

      if (wasOnline !== isAvailable) {
        setIsOnline(isAvailable);
        
        if (isAvailable) {
          toast({
            title: "Подключение восстановлено",
            description: "Приложение вернулось в онлайн режим",
            variant: "default",
          });
        } else {
          toast({
            title: "Сервер недоступен",
            description: "Приложение работает в офлайн режиме",
            variant: "destructive",
          });
        }
      }
    };

    // Проверяем состояние при монтировании
    checkConnection();

    // Устанавливаем интервал проверки
    checkInterval = setInterval(checkConnection, 30000); // каждые 30 секунд

    // Добавляем слушатель онлайн/офлайн событий браузера
    const handleOnline = () => {
      if (mounted) {
        checkConnection();
      }
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOnline);

    return () => {
      mounted = false;
      clearInterval(checkInterval);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOnline);
    };
  }, [backendUrl]);

  return isOnline;
}
