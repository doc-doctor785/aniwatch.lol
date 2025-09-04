import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import * as backendApi from '@/services/backendApi';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';

export default function Settings() {
  const { user, updateUserData, setUserLocal } = useAuth();
  const [username, setUsername] = useState(user?.username || '');
  const [email, setEmail] = useState(user?.email || '');
  const [avatar, setAvatar] = useState(user?.avatar || '');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  if (!user) return null;

  const handleSave = async () => {
    setIsSaving(true);
    try {
  const payload: any = { username, email };
  if (avatarFile) payload.avatar = avatarFile; else if (avatar) payload.avatar = avatar;
  const res = await backendApi.updateUserProfile(user.user_id, payload);

      // Сразу обновим контекст и localStorage для мгновенного отображения изменений
      try {
        setUserLocal({ username, email, avatar });
      } catch (e) {
        console.warn('setUserLocal failed', e);
      }

      // Попробуем подтянуть свежие данные с сервера (включая avatar_url после загрузки файла)
      try {
        const fresh = await backendApi.getUser(user.user_id);
        // backend returns avatar_url field
        setUserLocal({ username: fresh.username || username, email: fresh.email || email, avatar: fresh.avatar_url || avatar });
      } catch (e) {
        // Если не удалось, просто попытаемся обновить существующие части
        void updateUserData().catch((err) => console.warn('Failed to refresh user data after profile update', err));
      }
  toast({ title: 'Сохранено', description: 'Профиль успешно обновлён' });
    } catch (error: any) {
      console.error('Error saving profile:', error);
      const msg = error?.message || 'Не удалось сохранить профиль';
      if (msg.includes('Not Found')) {
        toast({ title: 'Ошибка', description: 'Эндпоинт обновления профиля не найден на сервере', variant: 'destructive' });
      } else {
        toast({ title: 'Ошибка', description: msg, variant: 'destructive' });
      }
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-2xl mx-auto">
        <Card className="p-6">
          <div className="flex items-start gap-6">
            <div className="w-32 shrink-0">
              <div className="w-32 h-32 rounded-full bg-muted overflow-hidden flex items-center justify-center border border-border">
                {avatarFile ? (
                  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                  <img src={URL.createObjectURL(avatarFile)} alt="avatar" className="w-full h-full object-cover" />
                ) : avatar ? (
                  <img src={avatar} alt="avatar" className="w-full h-full object-cover" />
                ) : (
                  <div className="text-sm text-muted-foreground">Нет аватара</div>
                )}
              </div>

              <div className="mt-3 text-sm text-muted-foreground">
                <label className="block mb-1">Загрузить</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const f = e.target.files?.[0] || null;
                    setAvatarFile(f);
                    if (!f) return;
                    // keep current preview URL in avatar state only for fallback
                    setAvatar('');
                  }}
                  className="text-xs text-muted-foreground"
                />
              </div>
            </div>

            <div className="flex-1">
              <h2 className="text-lg font-semibold mb-1">Настройки профиля</h2>
              <p className="text-sm text-muted-foreground mb-4">Обновите никнейм, email и аватар. Изменения отобразятся сразу.</p>

              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-sm mb-1">Никнейм</label>
                  <Input value={username} onChange={(e) => setUsername(e.target.value)} />
                </div>

                <div>
                  <label className="block text-sm mb-1">Email</label>
                  <Input value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>

                <div>
                  <label className="block text-sm mb-1">Аватар (URL)</label>
                  <Input value={avatar} onChange={(e) => setAvatar(e.target.value)} placeholder="https://..." />
                  <p className="text-xs text-muted-foreground mt-1">Если хотите загрузить файл — используйте поле слева.</p>
                </div>

                <div className="flex justify-between mt-2">
                  <div>
                    <Button variant="ghost" onClick={() => {
                      if (window.history.length > 1) window.history.back(); else navigate(-1);
                    }}>
                      Назад
                    </Button>
                  </div>
                  <div>
                    <Button onClick={handleSave} disabled={isSaving || !username || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)}>
                      Сохранить
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
