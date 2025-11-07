import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Search, ShoppingCart, User, Menu, Moon, Sun } from "lucide-react";
import { useState } from "react";

const districts = [
  "All Districts",
  "Lahore",
  "Multan",
  "Bahawalpur",
  "Faisalabad",
  "Gujranwala",
  "Rawalpindi",
  "Sahiwal",
  "Sargodha",
  "D.G. Khan"
];

export default function Header() {
  const [cartCount] = useState(3);
  const [searchQuery, setSearchQuery] = useState("");
  const [isDark, setIsDark] = useState(false);

  const handleSearch = () => {
    console.log('Search query:', searchQuery);
  };

  const toggleTheme = () => {
    setIsDark(!isDark);
    document.documentElement.classList.toggle('dark');
    console.log('Theme toggled:', !isDark ? 'dark' : 'light');
  };

  return (
    <header className="sticky top-0 z-50 bg-background border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          <div className="flex items-center gap-6">
            <Button variant="ghost" size="icon" className="md:hidden" data-testid="button-menu">
              <Menu className="w-5 h-5" />
            </Button>
            <h1 className="text-2xl font-bold text-primary" data-testid="text-logo">
              Sanatzar
            </h1>
          </div>

          <div className="hidden md:flex items-center gap-4 flex-1 max-w-2xl">
            <Select defaultValue="All Districts">
              <SelectTrigger className="w-48" data-testid="select-district">
                <SelectValue placeholder="Select District" />
              </SelectTrigger>
              <SelectContent>
                {districts.map((district) => (
                  <SelectItem key={district} value={district}>
                    {district}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="flex-1 relative">
              <Input
                type="search"
                placeholder="Search handicrafts..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="pr-10"
                data-testid="input-search"
              />
              <Button
                size="icon"
                variant="ghost"
                className="absolute right-0 top-0"
                onClick={handleSearch}
                data-testid="button-search"
              >
                <Search className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              data-testid="button-theme-toggle"
            >
              {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </Button>
            <Button variant="ghost" size="icon" className="relative" data-testid="button-cart">
              <ShoppingCart className="w-5 h-5" />
              {cartCount > 0 && (
                <Badge
                  variant="destructive"
                  className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
                  data-testid="badge-cart-count"
                >
                  {cartCount}
                </Badge>
              )}
            </Button>
            <Button variant="ghost" size="icon" data-testid="button-user">
              <User className="w-5 h-5" />
            </Button>
          </div>
        </div>

        <div className="md:hidden pb-3">
          <div className="relative">
            <Input
              type="search"
              placeholder="Search handicrafts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pr-10"
              data-testid="input-search-mobile"
            />
            <Button
              size="icon"
              variant="ghost"
              className="absolute right-0 top-0"
              onClick={handleSearch}
              data-testid="button-search-mobile"
            >
              <Search className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
