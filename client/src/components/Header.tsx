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
import { Link, useLocation } from "wouter";

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
  const [selectedDistrict, setSelectedDistrict] = useState("all");
  const [isDark, setIsDark] = useState(false);
  const [, setLocation] = useLocation();

  const handleSearch = () => {
    if (searchQuery.trim()) {
      setLocation(`/products?search=${encodeURIComponent(searchQuery)}`);
    } else {
      setLocation('/products');
    }
  };

  const handleDistrictChange = (district: string) => {
    setSelectedDistrict(district);
    if (district === "all") {
      setLocation('/products');
    } else {
      setLocation(`/products?district=${encodeURIComponent(district)}`);
    }
  };

  const toggleTheme = () => {
    setIsDark(!isDark);
    document.documentElement.classList.toggle('dark');
  };

  return (
    <header className="sticky top-0 z-50 bg-background border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          <div className="flex items-center gap-4 sm:gap-6">
            <Button variant="ghost" size="icon" className="md:hidden" data-testid="button-menu" aria-label="Open navigation menu">
              <Menu className="w-5 h-5" />
            </Button>
            <Link href="/">
              <h1 className="text-xl sm:text-2xl font-bold text-primary cursor-pointer hover-elevate rounded-md px-2 py-1" data-testid="text-logo">
                Sanatzar
              </h1>
            </Link>
          </div>

          <div className="hidden md:flex items-center gap-3 flex-1 max-w-2xl">
            <Select value={selectedDistrict} onValueChange={handleDistrictChange}>
              <SelectTrigger className="w-44" data-testid="select-district">
                <SelectValue placeholder="All Districts" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Districts</SelectItem>
                {districts.slice(1).map((district) => (
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
                aria-label="Search products"
              >
                <Search className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <div className="flex items-center gap-1 sm:gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              data-testid="button-theme-toggle"
              aria-label="Toggle theme"
            >
              {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </Button>
            <Link href="/cart">
              <Button variant="ghost" size="icon" className="relative" data-testid="button-cart" aria-label="Shopping cart">
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
            </Link>
            <Button variant="ghost" size="icon" data-testid="button-user" aria-label="User menu">
              <User className="w-5 h-5" />
            </Button>
          </div>
        </div>

        <div className="md:hidden pb-3 space-y-2">
          <div className="relative">
            <Input
              type="search"
              placeholder="Search handicrafts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="pr-10"
              data-testid="input-search-mobile"
            />
            <Button
              size="icon"
              variant="ghost"
              className="absolute right-0 top-0"
              onClick={handleSearch}
              data-testid="button-search-mobile"
              aria-label="Search"
            >
              <Search className="w-4 h-4" />
            </Button>
          </div>
          <Select value={selectedDistrict} onValueChange={handleDistrictChange}>
            <SelectTrigger className="w-full" data-testid="select-district-mobile">
              <SelectValue placeholder="All Districts" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Districts</SelectItem>
              {districts.slice(1).map((district) => (
                <SelectItem key={district} value={district}>
                  {district}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </header>
  );
}
