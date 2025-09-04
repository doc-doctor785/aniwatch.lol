import { Link } from "react-router-dom";
import { useAuth } from '@/contexts/AuthContext';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function UserProfileMenu() {
  const { user, logout } = useAuth();
  const isAdmin = !!(user && (user.role === 'admin' || user.email === 'doc464246@gmail.com'));

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Avatar className="h-8 w-8 cursor-pointer">
          <AvatarImage src={user?.avatar} alt={user?.username} />
          <AvatarFallback>{user?.username?.[0]?.toUpperCase()}</AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Мой аккаунт</DropdownMenuLabel>
        <DropdownMenuItem asChild>
          <Link to="/profile">Профиль</Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to="/favorites">Избранное</Link>
        </DropdownMenuItem>
        {isAdmin && (
          <DropdownMenuItem asChild>
            <Link to="/admin">Админ панель</Link>
          </DropdownMenuItem>
        )}
  {/* Настройки перемещены на страницу профиля (кнопка-шестерёнка) */}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={logout}>
          Выйти
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
