import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { AuthDialog } from "@/components/auth/AuthDialog";
import { useAuth } from "@/contexts/AuthContext";
import { UserProfileMenu } from "@/components/UserProfileMenu";
import { MobileNav } from "@/components/MobileNav";
import { SearchBar } from "@/components/SearchBar";

interface HeaderProps {
  onSearch?: (query: string) => Promise<void>;
  searchLoading?: boolean;
}

export function Header({ onSearch, searchLoading }: HeaderProps) {
  const [showAuthDialog, setShowAuthDialog] = useState(false);
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleBack = () => {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      navigate(-1);
    }
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 max-w-screen-2xl items-center">
        <MobileNav />
        <div className="hidden md:flex mr-4 items-center">
          {location.pathname !== '/' && (
            <button onClick={handleBack} className="mr-3 px-2 py-1 rounded hover:bg-muted">
              ← Назад
            </button>
          )}
          <Link to="/" className="mr-6 flex items-center space-x-2">
            <span className="hidden font-bold sm:inline-block text-green-500">
              AniWatch
            </span>
          </Link>
          <nav className="flex items-center space-x-6 text-sm font-medium">
            <Link to="/catalog" className="transition-colors hover:text-foreground/80">
              Каталог
            </Link>
            <Link to="/favorites" className="transition-colors hover:text-foreground/80">
              Избранное
            </Link>
          </nav>
        </div>
        <div className="flex flex-1 items-center justify-between space-x-2 md:justify-end">
          <SearchBar onSearch={onSearch} loading={searchLoading} className="max-w-sm mr-4" />
          {isAuthenticated ? (
            <UserProfileMenu />
          ) : (
            <Button
              onClick={() => setShowAuthDialog(true)}
              variant="outline"
              className="ml-auto"
            >
              Войти
            </Button>
          )}
          <AuthDialog open={showAuthDialog} onOpenChange={setShowAuthDialog} />
        </div>
      </div>
    </header>
  );
}
