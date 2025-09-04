let isServerAvailable = true;
let lastCheck = 0;
const CHECK_INTERVAL = 5000; // 5 секунд между проверками

export const networkService = {
  async checkServerAvailability(backendUrl: string): Promise<boolean> {
    const now = Date.now();
    
    // Предотвращаем слишком частые проверки
    if (now - lastCheck < CHECK_INTERVAL) {
      return isServerAvailable;
    }
    
    lastCheck = now;
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000); // 3 секунды таймаут

      const response = await fetch(backendUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      isServerAvailable = response.ok;
      
      if (isServerAvailable) {
        localStorage.setItem('lastOnlineTime', now.toString());
      }
      
      return isServerAvailable;
    } catch (error) {
      console.error('Ошибка при проверке доступности сервера:', error);
      isServerAvailable = false;
      return false;
    }
  },

  isServerAvailable(): boolean {
    return isServerAvailable;
  },

  setServerAvailable(value: boolean) {
    isServerAvailable = value;
    if (value) {
      localStorage.setItem('lastOnlineTime', Date.now().toString());
    }
  },

  getLastOnlineTime(): number {
    return parseInt(localStorage.getItem('lastOnlineTime') || '0');
  }
};
