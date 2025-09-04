import { API_URL } from './backendApi';

export class PresenceService {
  private ws: WebSocket | null = null;
  private userId: string | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000; // Start with 1 second
  private maxReconnectDelay = 30000; // Max 30 seconds
  private reconnectTimer: number | null = null;
  private isConnecting = false;
  private shouldReconnect = true;

  constructor() {
    // Listen for online/offline events
    window.addEventListener('online', () => this.handleOnline());
    window.addEventListener('offline', () => this.handleOffline());
    
    // Listen for page visibility changes
    document.addEventListener('visibilitychange', () => this.handleVisibilityChange());
    
    // Handle page unload
    window.addEventListener('beforeunload', () => this.disconnect());
  }

  /**
   * Start presence tracking for a user
   */
  public async startPresence(userId: string): Promise<void> {
    if (this.userId === userId && this.ws?.readyState === WebSocket.OPEN) {
      console.log('Presence already active for user:', userId);
      return;
    }

    console.log('Starting presence for user:', userId);
    this.userId = userId;
    this.shouldReconnect = true;
    this.reconnectAttempts = 0;
    
    await this.connect();
  }

  /**
   * Stop presence tracking
   */
  public disconnect(): void {
    console.log('Stopping presence tracking');
    this.shouldReconnect = false;
    this.userId = null;
    
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  /**
   * Get current connection status
   */
  public isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  /**
   * Get current user ID
   */
  public getCurrentUserId(): string | null {
    return this.userId;
  }

  /**
   * Connect to WebSocket
   */
  private async connect(): Promise<void> {
    if (!this.userId || this.isConnecting) {
      return;
    }

    this.isConnecting = true;

    try {
      // Close existing connection
      if (this.ws) {
        this.ws.close();
      }

      // Create WebSocket URL
      const wsUrl = API_URL.replace('http://', 'ws://').replace('https://', 'wss://');
      const url = `${wsUrl}/ws/presence/${this.userId}`;
      
      console.log('Connecting to WebSocket:', url);
      
      this.ws = new WebSocket(url);
      
      this.ws.onopen = () => this.handleOpen();
      this.ws.onclose = (event) => this.handleClose(event);
      this.ws.onerror = (error) => this.handleError(error);
      this.ws.onmessage = (event) => this.handleMessage(event);

    } catch (error) {
      console.error('Error creating WebSocket connection:', error);
      this.isConnecting = false;
      this.scheduleReconnect();
    }
  }

  /**
   * Handle WebSocket open
   */
  private handleOpen(): void {
    console.log('WebSocket connected for user:', this.userId);
    this.isConnecting = false;
    this.reconnectAttempts = 0;
    this.reconnectDelay = 1000; // Reset delay
    
    // Send ping immediately to establish presence
    this.sendPing();
  }

  /**
   * Handle WebSocket close
   */
  private handleClose(event: CloseEvent): void {
    console.log('WebSocket closed:', event.code, event.reason);
    this.isConnecting = false;
    this.ws = null;

    if (this.shouldReconnect && this.userId) {
      this.scheduleReconnect();
    }
  }

  /**
   * Handle WebSocket error
   */
  private handleError(error: Event): void {
    console.error('WebSocket error:', error);
    this.isConnecting = false;
  }

  /**
   * Handle WebSocket message
   */
  private handleMessage(event: MessageEvent): void {
    try {
      const data = JSON.parse(event.data);
      console.log('Received WebSocket message:', data);
      
      // Handle different message types if needed
      if (data.type === 'ping') {
        // Respond to server ping
        this.sendPong();
      }
    } catch (error) {
      console.warn('Failed to parse WebSocket message:', event.data);
    }
  }

  /**
   * Send ping to maintain connection
   */
  private sendPing(): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: 'ping', timestamp: Date.now() }));
    }
  }

  /**
   * Send pong response
   */
  private sendPong(): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
    }
  }

  /**
   * Schedule reconnection with exponential backoff
   */
  private scheduleReconnect(): void {
    if (!this.shouldReconnect || !this.userId) {
      return;
    }

    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.warn('Max reconnection attempts reached, giving up');
      return;
    }

    this.reconnectAttempts++;
    
    // Exponential backoff with jitter
    const delay = Math.min(
      this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1),
      this.maxReconnectDelay
    );
    
    const jitter = delay * 0.1 * Math.random(); // Add 10% jitter
    const finalDelay = delay + jitter;

    console.log(`Scheduling reconnect in ${Math.round(finalDelay)}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);

    this.reconnectTimer = window.setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, finalDelay);
  }

  /**
   * Handle browser online event
   */
  private handleOnline(): void {
    console.log('Browser came online, attempting to reconnect');
    if (this.userId && !this.isConnected()) {
      this.reconnectAttempts = 0; // Reset attempts when network comes back
      this.connect();
    }
  }

  /**
   * Handle browser offline event
   */
  private handleOffline(): void {
    console.log('Browser went offline');
    // WebSocket will automatically close, no need to manually disconnect
  }

  /**
   * Handle page visibility changes
   */
  private handleVisibilityChange(): void {
    if (document.visibilityState === 'visible') {
      // Page became visible, ensure connection is active
      if (this.userId && !this.isConnected() && this.shouldReconnect) {
        console.log('Page became visible, checking connection');
        this.connect();
      }
    }
    // Note: We don't disconnect on hidden - the server will detect disconnect naturally
  }
}

// Create and export singleton instance
export const presenceService = new PresenceService();