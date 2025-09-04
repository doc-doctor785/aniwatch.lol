import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface CategoryTabsProps {
  categories: {
    icon: LucideIcon;
    label: string;
    value: string;
  }[];
  activeCategory: string;
  onSelect: (category: string) => void;
}

export function CategoryTabs({ categories, activeCategory, onSelect }: CategoryTabsProps) {
  return (
    <div className="flex flex-wrap gap-4 mb-8">
      {categories.map((category) => {
        const Icon = category.icon;
        return (
          <button
            key={category.value}
            type="button"
            onClick={() => onSelect(category.value)}
            aria-pressed={activeCategory === category.value}
            className={cn(
              "category-button",
              "flex items-center gap-2",
              activeCategory === category.value && "active"
            )}
          >
            <Icon className="w-4 h-4" />
            <span>{category.label}</span>
          </button>
        );
      })}
    </div>
  );
}
