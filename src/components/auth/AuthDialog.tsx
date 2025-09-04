import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/components/ui/use-toast";
import { PasswordInput } from "@/components/PasswordInput";

interface AuthDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AuthDialog({ open, onOpenChange }: AuthDialogProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const { login, register } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (isLogin) {
        await login(email, password);
        toast({
          title: "Успешный вход",
          description: "Вы успешно вошли в систему",
        });
      } else {
        await register(username, email, password);
        toast({
          title: "Успешная регистрация",
          description: "Ваш аккаунт успешно создан",
        });
      }
      onOpenChange(false);
    } catch (error) {
      toast({
        title: "Ошибка",
        description: error instanceof Error ? error.message : "Произошла ошибка",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {isLogin ? "Вход в аккаунт" : "Регистрация"}
          </DialogTitle>
          <DialogDescription>
            {isLogin
              ? "Войдите в свой аккаунт чтобы получить доступ ко всем функциям"
              : "Создайте новый аккаунт чтобы получить доступ ко всем функциям"}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <div>
              <Label htmlFor="username">Имя пользователя</Label>
              <Input
                id="username"
                value={username}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setUsername(e.target.value)
                }
                required
              />
            </div>
          )}
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setEmail(e.target.value)
              }
              required
            />
          </div>
          <div>
            <Label htmlFor="password">Пароль</Label>
            <PasswordInput
              id="password"
              value={password}
              onChange={setPassword}
              required
            />
          </div>
          <div className="flex flex-col gap-2">
            <Button type="submit">
              {isLogin ? "Войти" : "Зарегистрироваться"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setIsLogin(!isLogin)}
            >
              {isLogin
                ? "Нет аккаунта? Зарегистрируйтесь"
                : "Уже есть аккаунт? Войдите"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
