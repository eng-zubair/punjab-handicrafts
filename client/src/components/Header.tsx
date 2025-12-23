import { Button } from "@/components/ui/button";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ShoppingCart, User, Menu, Moon, Sun, Store, LayoutDashboard, LogOut, ShieldCheck, Award, Search, Heart, ArrowLeftRight } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { Link, useLocation } from "wouter";
import { toSlug } from "@/lib/utils";
import { getCartCount } from "@/lib/cart";
import { useAuth } from "@/hooks/use-auth";
import { useTheme } from "@/components/ThemeProvider";
import { AuthDialog } from "@/components/AuthDialog";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import type { Category } from "@shared/schema";
import { NavigationMenu, NavigationMenuList, NavigationMenuItem, NavigationMenuTrigger, NavigationMenuContent, NavigationMenuLink } from "@/components/ui/navigation-menu";
import { Sheet, SheetTrigger, SheetContent, SheetHeader, SheetTitle, SheetClose, SheetDescription } from "@/components/ui/sheet";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { useWishlist } from "@/components/WishlistContext";
import { useCompare } from "@/components/CompareContext";
import { apiRequest } from "@/lib/queryClient";



export default function Header() {
  const { user, isAuthenticated, isVendor, isTrainee, isArtisan, logout, isLoggingOut } = useAuth();
  const isAdmin = user?.role === "admin";
  const isBuyer = user?.role === "buyer";
  const { theme, toggleTheme } = useTheme();
  const { toast } = useToast();
  const [cartCount, setCartCount] = useState(0);
  const { items: wishlistItems, count: wishlistCount, replace: replaceWishlist } = useWishlist();
  const { count: compareCount } = useCompare();

  const [, setLocation] = useLocation();
  const [authDialogOpen, setAuthDialogOpen] = useState(false);
  const [authDialogTab, setAuthDialogTab] = useState<"login" | "register">("login");
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const listboxId = "header-search-suggestions";
  const inputRef = useRef<HTMLInputElement | null>(null);

  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ["/api/categories"],
  });
  const giBrands = Array.from(new Set(categories.map(c => c.giBrand)));


  useEffect(() => {
    setCartCount(getCartCount());

    const handleCartUpdate = () => {
      setCartCount(getCartCount());
    };

    window.addEventListener('cart-updated', handleCartUpdate);
    return () => window.removeEventListener('cart-updated', handleCartUpdate);
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function syncWishlist() {
      if (!isAuthenticated) return;
      try {
        await apiRequest("POST", "/api/wishlist/sync", { productIds: wishlistItems });
        const res = await apiRequest("GET", "/api/wishlist");
        const ids: string[] = await res.json();
        if (!cancelled) replaceWishlist(ids);
      } catch {}
    }
    syncWishlist();
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated]);

  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedQuery(searchQuery.trim());
    }, 300);
    return () => clearTimeout(t);
  }, [searchQuery]);

  const { data: suggestionsResp, isFetching: isSuggestionsLoading, isError: isSuggestionsError } = useQuery<{ suggestions: Array<{ id: string; title: string; giBrand: string; category: string; district: string; image: string | null }>; metrics?: any }>({
    queryKey: ["/api/search/suggestions", { q: debouncedQuery }],
    enabled: debouncedQuery.length >= 2,
  });
  const suggestions = suggestionsResp?.suggestions ?? [];

  const handleLogout = () => {
    logout(undefined, {
      onSuccess: () => {
        toast({
          title: "Logged out",
          description: "You have been logged out successfully.",
        });
        setLocation("/");
      },
      onError: (error: any) => {
        toast({
          variant: "destructive",
          title: "Logout failed",
          description: error?.message || "Failed to logout",
        });
      },
    });
  };

  const handleLoginClick = () => {
    setAuthDialogTab("login");
    setAuthDialogOpen(true);
  };

  const handleRegisterClick = () => {
    setAuthDialogTab("register");
    setAuthDialogOpen(true);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = searchQuery.trim();
    setLocation(q ? `/products?search=${encodeURIComponent(q)}` : "/products");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen && e.key !== "Escape") {
      setIsOpen(true);
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIndex((prev) => {
        const next = prev + 1;
        return next >= suggestions.length ? suggestions.length - 1 : next;
      });
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex((prev) => {
        const next = prev - 1;
        return next < 0 ? -1 : next;
      });
    } else if (e.key === "Enter") {
      if (highlightedIndex >= 0 && highlightedIndex < suggestions.length) {
        const s = suggestions[highlightedIndex];
        setLocation(`/products/${s.id}`);
        setIsOpen(false);
      } else {
        handleSearchSubmit(e as any);
      }
    } else if (e.key === "Escape") {
      setIsOpen(false);
    }
  };

  const handleSuggestionClick = (index: number) => {
    const s = suggestions[index];
    if (!s) return;
    setSearchQuery(s.title);
    setLocation(`/products/${s.id}`);
    setIsOpen(false);
  };

  return (
    <header className="sticky top-0 z-50 bg-background border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          <div className="flex items-center gap-4 sm:gap-6">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden" data-testid="button-menu" aria-label="Open navigation menu">
                  <Menu className="w-5 h-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left">
                <SheetHeader>
                  <SheetTitle>Navigation</SheetTitle>
                  <SheetDescription className="sr-only">Main site navigation</SheetDescription>
                </SheetHeader>
                <div className="p-2 max-h-[calc(100vh-4rem)] overflow-y-auto">
                  <Accordion type="multiple" className="divide-y">
                    <AccordionItem value="gi-brands">
                      <AccordionTrigger className="px-2">
                        <span className="flex items-center gap-2"><Award className="w-4 h-4" /> GI Brands</span>
                      </AccordionTrigger>
                      <AccordionContent>
                        <ScrollArea className="h-[60vh]">
                          <div className="mt-2 grid grid-cols-1 gap-1 pr-2">
                            {giBrands.map((brand) => (
                              <SheetClose key={brand} asChild>
                                <Link href={`/brands/${toSlug(brand)}`}>
                                  <span className="block w-full rounded-md px-3 py-2 text-sm leading-snug whitespace-normal break-words hover:bg-muted" data-testid={`link-gi-${brand.toLowerCase().replace(/\s+/g, '-')}`}>{brand}</span>
                                </Link>
                              </SheetClose>
                            ))}
                          </div>
                        </ScrollArea>
                      </AccordionContent>
                    </AccordionItem>
                    <AccordionItem value="vendors">
                      <AccordionTrigger className="px-2">
                        <span className="flex items-center gap-2"><Store className="w-4 h-4" /> Artisans</span>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="mt-2 grid grid-cols-1 gap-1">
                          <SheetClose asChild>
                            <Link href="/vendor/register">
                              <span className="block w-full rounded-md px-3 py-2 text-sm leading-snug hover:bg-muted">Create Store</span>
                            </Link>
                          </SheetClose>
                          <SheetClose asChild>
                            <Link href="/vendor/pricing">
                              <span className="block w-full rounded-md px-3 py-2 text-sm leading-snug hover:bg-muted">Pricing</span>
                            </Link>
                          </SheetClose>
                          <SheetClose asChild>
                            <Link href="/vendor/guide">
                              <span className="block w-full rounded-md px-3 py-2 text-sm leading-snug hover:bg-muted">Seller Guide</span>
                            </Link>
                          </SheetClose>
                          <SheetClose asChild>
                            <Link href="/vendor/verification">
                              <span className="block w-full rounded-md px-3 py-2 text-sm leading-snug hover:bg-muted">GI Verification</span>
                            </Link>
                          </SheetClose>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                </div>
              </SheetContent>
            </Sheet>
            <Link href="/">
              <h1 className="text-xl sm:text-2xl font-bold text-primary cursor-pointer hover-elevate rounded-md px-2 py-1" data-testid="text-logo">
                Sanatzar
              </h1>
            </Link>
          </div>

          <div className="hidden md:flex items-center gap-3 flex-1 max-w-2xl">
            <NavigationMenu>
              <NavigationMenuList>
                <NavigationMenuItem>
                  <NavigationMenuTrigger>
                    <div className="flex items-center gap-2"><Award className="w-4 h-4" /> GI Brands</div>
                  </NavigationMenuTrigger>
                  <NavigationMenuContent>
                    <div className="grid grid-cols-2 gap-1.5 p-3 w-[520px] sm:w-[600px]">
                      {giBrands.map((brand) => (
                        <NavigationMenuLink key={brand} asChild>
                          <Link href={`/brands/${toSlug(brand)}`}>
                            <span className="block rounded-md px-2 py-1.5 text-sm leading-snug whitespace-normal break-words hover:bg-muted" data-testid={`link-gi-${brand.toLowerCase().replace(/\s+/g, '-')}`}>{brand}</span>
                          </Link>
                        </NavigationMenuLink>
                      ))}
                    </div>
                  </NavigationMenuContent>
                </NavigationMenuItem>
                <NavigationMenuItem>
                  <NavigationMenuTrigger>
                    <div className="flex items-center gap-2"><Store className="w-4 h-4" /> Artisans</div>
                  </NavigationMenuTrigger>
                  <NavigationMenuContent>
                    <div className="grid grid-cols-2 gap-1.5 p-3 w-[520px] sm:w-[600px]">
                      <NavigationMenuLink asChild>
                        <Link href="/vendor/register">
                          <span className="block rounded-md px-2 py-1.5 text-sm leading-snug hover:bg-muted" data-testid="link-create-store">Create Store</span>
                        </Link>
                      </NavigationMenuLink>
                      <NavigationMenuLink asChild>
                        <Link href="/vendor/pricing">
                          <span className="block rounded-md px-2 py-1.5 text-sm leading-snug hover:bg-muted" data-testid="link-pricing">Pricing</span>
                        </Link>
                      </NavigationMenuLink>
                      <NavigationMenuLink asChild>
                        <Link href="/vendor/guide">
                          <span className="block rounded-md px-2 py-1.5 text-sm leading-snug hover:bg-muted" data-testid="link-seller-guide">Seller Guide</span>
                        </Link>
                      </NavigationMenuLink>
                      <NavigationMenuLink asChild>
                        <Link href="/vendor/verification">
                          <span className="block rounded-md px-2 py-1.5 text-sm leading-snug hover:bg-muted" data-testid="link-gi-verification">GI Verification</span>
                        </Link>
                      </NavigationMenuLink>
                      <div className="col-span-2 border-t my-1" />
                      <NavigationMenuLink asChild>
                        <Link href="/training">
                          <span className="block rounded-md px-2 py-1.5 text-sm leading-snug hover:bg-muted" data-testid="link-training">🎓 Training Programs</span>
                        </Link>
                      </NavigationMenuLink>
                      <NavigationMenuLink asChild>
                        <Link href="/artisan/register">
                          <span className="block rounded-md px-2 py-1.5 text-sm leading-snug hover:bg-muted" data-testid="link-artisan-register">📝 Register as Artisan</span>
                        </Link>
                      </NavigationMenuLink>
                    </div>
                  </NavigationMenuContent>
                </NavigationMenuItem>
              </NavigationMenuList>
            </NavigationMenu>
            <form onSubmit={handleSearchSubmit} className="ml-auto" role="search">
              <div className="relative w-[260px] lg:w-[360px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => setIsOpen(true)}
                  onBlur={() => setTimeout(() => setIsOpen(false), 150)}
                  onKeyDown={handleKeyDown}
                  ref={inputRef}
                  placeholder="Search the Handicrafts"
                  aria-label="Search the Handicrafts"
                  aria-autocomplete="list"
                  aria-controls={listboxId}
                  aria-expanded={isOpen}
                  aria-activedescendant={highlightedIndex >= 0 ? `${listboxId}-item-${highlightedIndex}` : undefined}
                  className="pl-9"
                  data-testid="input-header-search"
                />
                {isOpen && (isSuggestionsLoading || suggestions.length > 0 || isSuggestionsError) && (
                  <div className="absolute left-0 right-0 top-full mt-1 bg-popover border rounded-md shadow-md z-50">
                    {isSuggestionsLoading ? (
                      <div className="p-3 text-sm text-muted-foreground">Loading…</div>
                    ) : isSuggestionsError ? (
                      <div className="p-3 text-sm text-destructive">Failed to load suggestions</div>
                    ) : suggestions.length === 0 ? (
                      <div className="p-3 text-sm text-muted-foreground">No suggestions</div>
                    ) : (
                      <ul id={listboxId} role="listbox" aria-label="Search suggestions" className="py-1 max-h-[300px] overflow-auto">
                        {suggestions.map((s, idx) => {
                          const isActive = idx === highlightedIndex;
                          return (
                            <li
                              id={`${listboxId}-item-${idx}`}
                              key={s.id}
                              role="option"
                              aria-selected={isActive}
                              className={`px-3 py-2 text-sm cursor-pointer ${isActive ? 'bg-muted' : 'hover:bg-muted'}`}
                              onMouseEnter={() => setHighlightedIndex(idx)}
                              onMouseDown={(e) => e.preventDefault()}
                              onClick={() => handleSuggestionClick(idx)}
                            >
                              <div className="flex items-center gap-3">
                                {s.image ? <img src={s.image} alt="" className="w-8 h-8 rounded object-cover" /> : <div className="w-8 h-8 rounded bg-muted" />}
                                <div className="min-w-0">
                                  <div className="font-medium truncate">{s.title}</div>
                                  <div className="text-xs text-muted-foreground truncate">{[s.giBrand, s.category, s.district].filter(Boolean).join(" • ")}</div>
                                </div>
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>
                )}
              </div>
            </form>
          </div>

          <div className="flex items-center gap-1 sm:gap-2">
            <Sheet>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="md:hidden"
                  aria-label="Open search"
                  data-testid="button-mobile-search"
                >
                  <Search className="w-5 h-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="top">
                <SheetHeader>
                  <SheetTitle>Search</SheetTitle>
                  <SheetDescription className="sr-only">Search the handicrafts</SheetDescription>
                </SheetHeader>
                <form onSubmit={handleSearchSubmit} className="p-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      type="search"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onFocus={() => setIsOpen(true)}
                      onBlur={() => setTimeout(() => setIsOpen(false), 150)}
                      onKeyDown={handleKeyDown}
                      placeholder="Search the Handicrafts"
                      aria-label="Search the Handicrafts"
                      aria-autocomplete="list"
                      aria-controls={listboxId}
                      aria-expanded={isOpen}
                      aria-activedescendant={highlightedIndex >= 0 ? `${listboxId}-item-${highlightedIndex}` : undefined}
                      className="pl-9"
                    />
                    {isOpen && (isSuggestionsLoading || suggestions.length > 0 || isSuggestionsError) && (
                      <div className="absolute left-0 right-0 top-full mt-1 bg-popover border rounded-md shadow-md z-50">
                        {isSuggestionsLoading ? (
                          <div className="p-3 text-sm text-muted-foreground">Loading…</div>
                        ) : isSuggestionsError ? (
                          <div className="p-3 text-sm text-destructive">Failed to load suggestions</div>
                        ) : suggestions.length === 0 ? (
                          <div className="p-3 text-sm text-muted-foreground">No suggestions</div>
                        ) : (
                          <ul id={listboxId} role="listbox" aria-label="Search suggestions" className="py-1 max-h-[300px] overflow-auto">
                            {suggestions.map((s, idx) => {
                              const isActive = idx === highlightedIndex;
                              return (
                                <li
                                  id={`${listboxId}-item-${idx}`}
                                  key={s.id}
                                  role="option"
                                  aria-selected={isActive}
                                  className={`px-3 py-2 text-sm cursor-pointer ${isActive ? 'bg-muted' : 'hover:bg-muted'}`}
                                  onMouseEnter={() => setHighlightedIndex(idx)}
                                  onMouseDown={(e) => e.preventDefault()}
                                  onClick={() => handleSuggestionClick(idx)}
                                >
                                  <div className="flex items-center gap-3">
                                    {s.image ? <img src={s.image} alt="" className="w-8 h-8 rounded object-cover" /> : <div className="w-8 h-8 rounded bg-muted" />}
                                    <div className="min-w-0">
                                      <div className="font-medium truncate">{s.title}</div>
                                      <div className="text-xs text-muted-foreground truncate">{[s.giBrand, s.category, s.district].filter(Boolean).join(" • ")}</div>
                                    </div>
                                  </div>
                                </li>
                              );
                            })}
                          </ul>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="mt-3 flex justify-end">
                    <SheetClose asChild>
                      <Button type="submit">Search</Button>
                    </SheetClose>
                  </div>
                </form>
              </SheetContent>
            </Sheet>

            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              data-testid="button-theme-toggle"
              aria-label="Toggle theme"
            >
              {theme === "dark" ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </Button>
            <Link href="/cart">
              <Button variant="ghost" size="icon" className="relative" data-testid="button-cart" aria-label="Shopping cart">
                <ShoppingCart className="w-5 h-5" />
                {cartCount > 0 && (
                  <Badge
                    variant="destructive"
                    className="absolute -top-1.5 -right-0 z-[100] rounded-full min-w-[20px] h-[20px] flex items-center justify-center px-[5px] text-[11px] font-bold leading-none shadow-md border-2 border-background"
                    data-testid="badge-cart-count"
                    aria-label={`Cart items: ${cartCount}`}
                    style={{ backgroundColor: '#e63946' }}
                  >
                    {cartCount > 9 ? '9+' : cartCount}
                  </Badge>
                )}
              </Button>
            </Link>
            <Link href="/compare">
              <Button variant="ghost" size="icon" className="relative" data-testid="button-compare" aria-label="Product comparison">
                <ArrowLeftRight className="w-5 h-5" />
                {compareCount > 0 && (
                  <Badge
                    variant="destructive"
                    className="absolute -top-1.5 -right-0 z-[100] rounded-full min-w-[20px] h-[20px] flex items-center justify-center px-[5px] text-[11px] font-bold leading-none shadow-md border-2 border-background"
                    data-testid="badge-compare-count"
                    aria-label={`Products in comparison: ${compareCount}`}
                    style={{ backgroundColor: '#2563eb' }}
                  >
                    {compareCount > 9 ? '9+' : compareCount}
                  </Badge>
                )}
              </Button>
            </Link>
            <Link href="/wishlist">
              <Button variant="ghost" size="icon" className="relative" data-testid="button-wishlist" aria-label="Wishlist">
                <Heart className="w-5 h-5" />
                {wishlistCount > 0 && (
                  <Badge
                    variant="destructive"
                    className="absolute -top-1.5 -right-0 z-[100] rounded-full min-w-[20px] h-[20px] flex items-center justify-center px-[5px] text-[11px] font-bold leading-none shadow-md border-2 border-background"
                    data-testid="badge-wishlist-count"
                    aria-label={`Wishlist items: ${wishlistCount}`}
                    style={{ backgroundColor: '#e63946' }}
                  >
                    {wishlistCount > 9 ? '9+' : wishlistCount}
                  </Badge>
                )}
              </Button>
            </Link>

            {isAuthenticated ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" data-testid="button-user-menu" aria-label="User menu" className="rounded-full">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={user?.profileImageUrl || undefined} alt={user?.firstName || "User"} />
                      <AvatarFallback>
                        {user?.firstName?.[0]}{user?.lastName?.[0]}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium" data-testid="text-user-name">
                        {user?.firstName} {user?.lastName}
                      </p>
                      <p className="text-xs text-muted-foreground" data-testid="text-user-email">
                        {user?.email}
                      </p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {isAdmin && (
                    <>
                      <DropdownMenuItem asChild>
                        <Link href="/admin/dashboard">
                          <ShieldCheck className="w-4 h-4 mr-2" />
                          <span data-testid="link-admin-dashboard">Admin Dashboard</span>
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                    </>
                  )}
                  {isVendor && (
                    <>
                      <DropdownMenuItem asChild>
                        <Link href="/vendor/dashboard">
                          <LayoutDashboard className="w-4 h-4 mr-2" />
                          <span data-testid="link-vendor-dashboard">Vendor Dashboard</span>
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                    </>
                  )}
                  {isBuyer && (
                    <>
                      <DropdownMenuItem asChild>
                        <Link href="/buyer/dashboard">
                          <LayoutDashboard className="w-4 h-4 mr-2" />
                          <span data-testid="link-buyer-dashboard">Buyer Dashboard</span>
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                    </>
                  )}
                  {isTrainee && (
                    <>
                      <DropdownMenuItem asChild>
                        <Link href="/trainee/dashboard">
                          <LayoutDashboard className="w-4 h-4 mr-2" />
                          <span data-testid="link-trainee-dashboard">Trainee Dashboard</span>
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                    </>
                  )}
                  {isArtisan && (
                    <>
                      <DropdownMenuItem asChild>
                        <Link href="/artisan/dashboard">
                          <LayoutDashboard className="w-4 h-4 mr-2" />
                          <span data-testid="link-artisan-dashboard">Artisan Dashboard</span>
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                    </>
                  )}
                  <DropdownMenuItem onClick={handleLogout} disabled={isLoggingOut} data-testid="button-logout">
                    <LogOut className="w-4 h-4 mr-2" />
                    <span>{isLoggingOut ? "Logging out..." : "Logout"}</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button variant="default" size="sm" onClick={handleLoginClick} data-testid="button-login">
                Login
              </Button>
            )}
          </div>
        </div>


      </div>

      <AuthDialog
        open={authDialogOpen}
        onOpenChange={setAuthDialogOpen}
        defaultTab={authDialogTab}
      />
    </header>
  );
}
