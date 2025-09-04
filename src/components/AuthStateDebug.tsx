import { useAuth } from '@/contexts/AuthContext';

export function AuthStateDebug() {
  const { isAuthenticated, user } = useAuth();

  return (
    <div style={{ position: 'fixed', bottom: 10, right: 10, background: 'black', color: 'white', padding: 10, zIndex: 9999 }}>
      Auth Debug:
      <div>isAuthenticated: {String(isAuthenticated)}</div>
      <div>user: {user ? JSON.stringify(user) : 'null'}</div>
    </div>
  );
}
