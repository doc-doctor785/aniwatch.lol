import { useState } from "react";
import { Menu, Home, Search, Heart, User, Bookmark } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { AuthDialog } from "@/components/auth/AuthDialog";
import { useAuth } from "@/contexts/AuthContext";

interface MobileNavProps {
  className?: string;
}

export function MobileNav({ className }: MobileNavProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { user, logout } = useAuth();

  const navItems = [
    { icon: Home, label: "Главная", href: "/" },
    { icon: Search, label: "Поиск", href: "/search" },
    { icon: Heart, label: "Избранное", href: "/favorites" },
    { icon: Bookmark, label: "Мой список", href: "/list" },
    { icon: User, label: "Профиль", href: "/profile" },
  ];

  return (
    <div className={cn("md:hidden", className)}>
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground hover:text-foreground"
          >
            <Menu className="w-5 h-5" />
          </Button>
        </SheetTrigger>

        <SheetContent side="right" className="w-72 p-0 bg-card border-border">
          <div className="flex flex-col h-full">
            {/* Header */}
            <div className="flex items-center p-6 border-b border-border">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-gradient-primary rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-lg">A</span>
                </div>
                <h2 className="text-lg font-bold gradient-text">AnimeWatch</h2>
              </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 py-6">
              <div className="space-y-2 px-4">
                {navItems.map((item) => (
                  <a
                    key={item.href}
                    href={item.href}
                    onClick={() => setIsOpen(false)}
                    className={cn(
                      "flex items-center gap-3 px-4 py-3 rounded-lg transition-colors duration-200",
                      "text-muted-foreground hover:text-foreground hover:bg-accent"
                    )}
                  >
                    <item.icon className="w-5 h-5" />
                    <span className="font-medium">{item.label}</span>
                  </a>
                ))}
              </div>
            </nav>

            {/* Footer */}
            <div className="p-6 border-t border-border">
              {user ? (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Добро пожаловать, {user.username}
                  </p>
                  <Button
                    onClick={() => {
                      logout();
                      setIsOpen(false);
                    }}
                    variant="outline"
                    className="w-full"
                  >
                    Выйти
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  <AuthDialog>
                    <Button className="w-full btn-anime">
                      Войти
                    </Button>
                  </AuthDialog>
                  <AuthDialog>
                    <Button variant="outline" className="w-full">
                      Регистрация
                    </Button>
                  </AuthDialog>
                </div>
              )}

              <div className="mt-4 text-center">
                <p className="text-xs text-muted-foreground">
                  © 2024 AnimeWatch
                </p>
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
