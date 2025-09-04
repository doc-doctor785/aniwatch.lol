import { Search, X } from "lucide-react";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface SearchBarProps {
  placeholder?: string;
  value?: string;
  onChange?: (value: string) => void;
  onSearch?: (value: string) => void;
  className?: string;
  loading?: boolean;
}

export function SearchBar({
  placeholder = "Поиск аниме...",
  value = "",
  onChange,
  onSearch,
  className,
  loading = false
}: SearchBarProps) {
  const [searchValue, setSearchValue] = useState(value);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setSearchValue(newValue);
    onChange?.(newValue);
  };

  const handleSearch = () => {
    onSearch?.(searchValue);
  };

  const handleClear = () => {
    setSearchValue("");
    onChange?.("");
    onSearch?.("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  return (
    <div className={cn("relative w-full max-w-2xl", className)}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />

        <Input
          type="text"
          value={searchValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="search-input pl-10 pr-20 h-12 text-base bg-card border-border focus:border-primary focus:ring-primary/20"
          disabled={loading}
        />

        <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center gap-1">
          {searchValue && (
            <Button
              onClick={handleClear}
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 hover:bg-muted"
            >
              <X className="w-4 h-4" />
            </Button>
          )}

          <Button
            onClick={handleSearch}
            disabled={loading || !searchValue.trim()}
            className="btn-anime h-8 px-4 text-sm"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              "Поиск"
            )}
          </Button>
        </div>
      </div>

      {/* Search suggestions or recent searches could go here */}
    </div>
  );
}
