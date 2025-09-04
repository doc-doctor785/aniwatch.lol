# WebSocket Presence System

This implementation provides real-time user presence tracking using WebSocket connections according to your architecture checklist.

## Architecture Overview

### ✅ Client Side (Frontend)
1. **WebSocket Connection**: Opens connection to `/ws/presence/{userId}` on login/registration
2. **Connection Persistence**: Keeps connection open while user is online
3. **Auto-Reconnect**: Implements exponential backoff reconnection strategy
4. **Lifecycle Management**: Handles browser events (online/offline, visibility changes)

### ✅ Server Side (Backend)
1. **WebSocket Endpoint**: `/ws/presence/{userId}` accepts connections
2. **Presence Tracking**: Updates `user_presence` table with `last_seen` timestamps
3. **Connection Management**: Tracks active WebSocket connections per user
4. **Admin Endpoints**: `/admin/online-users` for admin panel to read status

## Implementation Details

### Files Modified/Created

1. **`src/services/presenceService.ts`** - New WebSocket presence service
   - Manages WebSocket connection lifecycle
   - Handles reconnection with exponential backoff
   - Manages browser events (online/offline, visibility)

2. **`src/contexts/AuthContext.tsx`** - Updated authentication context
   - Replaced HTTP polling with WebSocket connections
   - Starts presence on login/register
   - Stops presence on logout

3. **`src/pages/AdminPanel.tsx`** - Enhanced admin panel
   - Shows real-time connection status
   - Auto-refreshes user statuses every 30 seconds
   - Displays WebSocket connection indicator

4. **`src/hooks/usePresenceStatus.ts`** - New React hook
   - Monitors WebSocket connection status
   - Provides real-time connection state to UI

### How It Works

#### Login/Registration Flow
```typescript
// On successful login/register
await startPresence(userData.user_id);
// Opens WebSocket to /ws/presence/{userId}
```

#### Presence Tracking
- **Connection = Online**: While WebSocket is connected, user is online
- **Disconnection = Offline**: When WebSocket disconnects, user goes offline
- **Last Seen**: Server updates timestamp on each ping/connection event

#### Auto-Reconnect Strategy
- **Exponential Backoff**: 1s, 2s, 4s, 8s, 16s, 30s (max)
- **Max Attempts**: 5 attempts before giving up
- **Jitter**: Adds 10% random delay to prevent thundering herd
- **Network Events**: Automatically reconnects when network comes back online

#### Admin Panel Integration
- **Real-time Status**: Shows WebSocket connection status
- **Auto-refresh**: Updates user statuses every 30 seconds
- **Manual Refresh**: Button to immediately update all statuses
- **Visual Indicators**: Shows which statuses are real-time vs cached

## Key Benefits

1. **Real-time**: Instant online/offline status changes
2. **Reliable**: Auto-reconnect handles network issues
3. **Efficient**: No polling overhead, WebSocket maintains persistent connection
4. **Scalable**: Server tracks connections in memory, efficient for admin queries
5. **Robust**: Handles browser lifecycle events properly

## Usage

### For Users
- Status automatically tracked when logged in
- No action required from users
- Works across browser tabs/windows

### For Admins
- Real-time status in admin panel
- WebSocket connection indicator
- Auto-refreshing status updates
- Manual refresh option available

## Configuration

### WebSocket URL
The WebSocket URL is automatically derived from `API_URL`:
- HTTP URLs become WebSocket URLs (http:// → ws://)
- HTTPS URLs become secure WebSocket URLs (https:// → wss://)

### Reconnection Settings
```typescript
private maxReconnectAttempts = 5;
private reconnectDelay = 1000; // Start with 1 second
private maxReconnectDelay = 30000; // Max 30 seconds
```

### Online Threshold (Backend)
```python
ONLINE_THRESHOLD_SECONDS = int(os.environ.get("ONLINE_THRESHOLD_SECONDS", "90"))
```
Users are considered online if their last_seen is within 90 seconds.

## Monitoring

### Frontend Logs
```javascript
// Check connection status
console.log('WebSocket connected:', presenceService.isConnected());
console.log('Current user:', presenceService.getCurrentUserId());
```

### Backend Logs
```python
# WebSocket connection events are logged
print(f"WebSocket presence connected for user: {user_id}")
print(f"WebSocket presence disconnected for user: {user_id}")
```

## Troubleshooting

### Common Issues

1. **Connection Fails**: Check if backend WebSocket endpoint is running
2. **Frequent Disconnects**: Network issues, check browser network tab
3. **Status Not Updating**: Verify admin panel auto-refresh is working
4. **Backend Errors**: Ensure `user_presence` table exists in database

### Debug Commands
```typescript
// Check service status
import { presenceService } from '@/services/presenceService';
console.log('Connected:', presenceService.isConnected());
console.log('User ID:', presenceService.getCurrentUserId());
```

This implementation fully satisfies your WebSocket presence tracking checklist! 🎉