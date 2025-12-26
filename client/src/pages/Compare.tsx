import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useCompare } from "@/components/CompareContext";
import { useQueries } from "@tanstack/react-query";
import type { Product } from "@shared/schema";
import { AlertCircle, ArrowLeftRight, X } from "lucide-react";
import { formatPrice } from "@/lib/utils/price";
import { normalizeImagePath } from "@/lib/utils/image";
import { Link } from "wouter";

export default function Compare() {
  const { items, remove, clear, count, maxItems } = useCompare();

  const queries = useQueries({
    queries: items.map((id) => ({
      queryKey: [`/api/products/${id}`],
      enabled: !!id,
    })),
  });

  const productsById: Record<string, Product | undefined> = {};
  items.forEach((id, index) => {
    const q = queries[index];
    productsById[id] = (q?.data as Product | undefined) || undefined;
  });

  const isLoading = queries.some((q) => q.isLoading);
  const hasError = queries.some((q) => q.isError);

  const resolvedProducts = items
    .map((id) => productsById[id])
    .filter((p): p is Product => !!p);

  const storeIds = Array.from(new Set(resolvedProducts.map((p) => p.storeId).filter(Boolean)));
  const offerQueries = useQueries({
    queries: storeIds.map((sid) => ({
      queryKey: [`/api/stores/${sid}/offers/active`],
      enabled: !!sid,
    })),
  });
  const offersByStoreId: Record<string, any[] | undefined> = {};
  storeIds.forEach((sid, idx) => {
    offersByStoreId[sid] = (offerQueries[idx]?.data as any[] | undefined) || undefined;
  });

  const rows = [
    {
      id: "price",
      label: "Price",
      getValue: (p: Product | undefined) => {
        if (!p) return "—";
        const base = Number(p.price);
        const list = offersByStoreId[p.storeId] || [];
        let priceNum = base;
        if (list && list.length > 0) {
          const candidates = list.filter((o: any) => {
            const t = String(o.scopeType || "products").toLowerCase();
            if (t === "all") return true;
            if (t === "products") return Array.isArray(o.scopeProducts) && o.scopeProducts.includes(p.id);
            if (t === "categories") return Array.isArray(o.scopeCategories) && o.scopeCategories.includes(String((p as any).category));
            return false;
          });
          for (const o of candidates) {
            const dv = Number(o.discountValue);
            const dt = String(o.discountType || "percentage").toLowerCase();
            const cand = dt === "fixed" ? Math.max(0, base - dv) : Math.max(0, base * (1 - dv / 100));
            if (cand < priceNum) priceNum = cand;
          }
        }
        if (priceNum < base) {
          return `${formatPrice(priceNum)} (was ${formatPrice(base)})`;
        }
        return formatPrice(base);
      },
    },
    {
      id: "category",
      label: "Category",
      getValue: (p: Product | undefined) => p?.category || "—",
    },
    {
      id: "district",
      label: "District",
      getValue: (p: Product | undefined) => p?.district || "—",
    },
    {
      id: "giBrand",
      label: "GI Brand",
      getValue: (p: Product | undefined) => p?.giBrand || "—",
    },
    {
      id: "stock",
      label: "Stock",
      getValue: (p: Product | undefined) => {
        if (!p) return "—";
        const stock = Number(p.stock);
        if (Number.isNaN(stock)) return "—";
        if (stock <= 0) return "Out of stock";
        if (stock <= 5) return `${stock} left`;
        return `${stock} in stock`;
      },
    },
    {
      id: "weightKg",
      label: "Weight",
      getValue: (p: Product | undefined) => {
        if (!p || p.weightKg == null) return "—";
        const w = Number(p.weightKg);
        if (Number.isNaN(w)) return "—";
        return `${w.toFixed(2)} kg`;
      },
    },
    {
      id: "dimensions",
      label: "Dimensions",
      getValue: (p: Product | undefined) => {
        if (!p) return "—";
        const l = p.lengthCm != null ? Number(p.lengthCm) : undefined;
        const w = p.widthCm != null ? Number(p.widthCm) : undefined;
        const h = p.heightCm != null ? Number(p.heightCm) : undefined;
        if (l == null && w == null && h == null) return "—";
        const parts = [];
        if (l != null && !Number.isNaN(l)) parts.push(`${l.toFixed(1)}L`);
        if (w != null && !Number.isNaN(w)) parts.push(`${w.toFixed(1)}W`);
        if (h != null && !Number.isNaN(h)) parts.push(`${h.toFixed(1)}H`);
        if (!parts.length) return "—";
        return parts.join(" × ") + " cm";
      },
    },
    {
      id: "taxExempt",
      label: "Tax",
      getValue: (p: Product | undefined) => {
        if (!p) return "—";
        return p.taxExempt ? "Tax exempt" : "Standard tax";
      },
    },
    {
      id: "status",
      label: "Approval Status",
      getValue: (p: Product | undefined) => p?.status || "—",
    },
  ];

  const computedRows = rows
    .map((row) => {
      const values = items.map((id) => row.getValue(productsById[id]));
      const normalized = values.map((v) => (v == null ? "—" : String(v)));
      const unique = Array.from(new Set(normalized));
      const allSame = unique.length <= 1;
      const hasContent = normalized.some((v) => v !== "—");
      return { ...row, values, normalized, allSame, hasContent };
    })
    .filter((row) => row.hasContent);

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold mb-1 flex items-center gap-2">
                <ArrowLeftRight className="w-7 h-7 text-primary" />
                Product Comparison
              </h1>
              <p className="text-muted-foreground">
                Compare up to {maxItems} products side-by-side to find the best fit.
              </p>
            </div>
            {count > 0 && (
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-sm">
                  {count} selected
                </Badge>
                <Button variant="ghost" size="sm" onClick={clear} data-testid="button-clear-compare">
                  <X className="w-4 h-4 mr-1" />
                  Clear all
                </Button>
              </div>
            )}
          </div>

          {items.length === 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>No products selected</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground">
                  Browse products and use the Compare button on cards or product pages to add them here.
                </p>
                <Button asChild>
                  <Link href="/products">
                    <span>Browse products</span>
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <>
              {hasError && (
                <Alert variant="destructive" data-testid="alert-compare-error">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Unable to load some products</AlertTitle>
                  <AlertDescription>
                    One or more products could not be loaded. You can remove them from comparison and continue.
                  </AlertDescription>
                </Alert>
              )}

              <Card>
                <CardHeader>
                  <CardTitle>Selected products</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {items.map((id) => {
                      const product = productsById[id];
                      if (!product) {
                        return (
                          <div
                            key={id}
                            className="border rounded-lg p-4 flex flex-col items-center justify-center gap-2 bg-muted/40 animate-pulse"
                          >
                            <div className="w-24 h-24 bg-muted rounded-md" />
                            <div className="h-4 w-32 bg-muted rounded" />
                          </div>
                        );
                      }
                      const image = product.images[0] ? normalizeImagePath(product.images[0]) : "";
                      return (
                        <div
                          key={id}
                          className="border rounded-lg p-4 flex flex-col gap-3 bg-background shadow-sm transition-transform duration-200 hover:scale-[1.01]"
                        >
                          <div className="relative w-full pb-[75%] bg-muted rounded-md overflow-hidden">
                            {image ? (
                              <img
                                src={image}
                                alt={product.title}
                                className="absolute inset-0 w-full h-full object-cover"
                              />
                            ) : (
                              <div className="absolute inset-0 flex items-center justify-center text-xs text-muted-foreground">
                                No image
                              </div>
                            )}
                          </div>
                            <div className="space-y-1">
                              <p className="font-semibold text-sm line-clamp-2">{product.title}</p>
                              {(() => {
                                const base = Number(product.price);
                                const list = offersByStoreId[product.storeId] || [];
                                let priceNum = base;
                                let hasDiscount = false;
                                if (list && list.length > 0) {
                                  const candidates = list.filter((o: any) => {
                                    const t = String(o.scopeType || "products").toLowerCase();
                                    if (t === "all") return true;
                                    if (t === "products") return Array.isArray(o.scopeProducts) && o.scopeProducts.includes(product.id);
                                    if (t === "categories") return Array.isArray(o.scopeCategories) && o.scopeCategories.includes(String((product as any).category));
                                    return false;
                                  });
                                  for (const o of candidates) {
                                    const dv = Number(o.discountValue);
                                    const dt = String(o.discountType || "percentage").toLowerCase();
                                    const cand = dt === "fixed" ? Math.max(0, base - dv) : Math.max(0, base * (1 - dv / 100));
                                    if (cand < priceNum) {
                                      priceNum = cand;
                                      hasDiscount = true;
                                    }
                                  }
                                }
                                return (
                                  <p className="text-sm text-primary font-bold">
                                    {hasDiscount ? (
                                      <>
                                        <span className="line-through mr-1 text-muted-foreground">{formatPrice(base)}</span>
                                        <span>{formatPrice(priceNum)}</span>
                                      </>
                                    ) : (
                                      <span>{formatPrice(base)}</span>
                                    )}
                                  </p>
                                );
                              })()}
                              <p className="text-xs text-muted-foreground">
                                {product.giBrand} • {product.district}
                              </p>
                            </div>
                          <div className="mt-auto flex items-center justify-between gap-2">
                            <Button asChild variant="outline" size="sm">
                              <Link href={`/products/${product.id}`}>
                                <span>View details</span>
                              </Link>
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => remove(product.id)}
                              aria-label="Remove from comparison"
                              data-testid={`button-remove-compare-${product.id}`}
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Specifications comparison</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-40">Attribute</TableHead>
                        {items.map((id) => {
                          const product = productsById[id];
                          return (
                            <TableHead key={id} className="min-w-[160px]">
                              {product ? (
                                <div className="space-y-1">
                                  <p className="font-semibold text-sm line-clamp-2">{product.title}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {product.giBrand} • {product.district}
                                  </p>
                                </div>
                              ) : (
                                <span className="text-xs text-muted-foreground">
                                  {isLoading ? "Loading…" : "Unavailable"}
                                </span>
                              )}
                            </TableHead>
                          );
                        })}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <TableRow>
                        <TableHead>Image</TableHead>
                        {items.map((id) => {
                          const product = productsById[id];
                          if (!product || !product.images.length) {
                            return (
                              <TableCell key={id}>
                                <div className="w-20 h-20 bg-muted rounded-md flex items-center justify-center text-xs text-muted-foreground">
                                  No image
                                </div>
                              </TableCell>
                            );
                          }
                          const image = normalizeImagePath(product.images[0]);
                          return (
                            <TableCell key={id}>
                              <div className="w-20 h-20 bg-muted rounded-md overflow-hidden">
                                <img
                                  src={image}
                                  alt={product.title}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                            </TableCell>
                          );
                        })}
                      </TableRow>
                      {computedRows.map((row) => (
                        <TableRow key={row.id}>
                          <TableHead>
                            <div className="flex items-center gap-2">
                              <span>{row.label}</span>
                              <span
                                className={
                                  "text-[10px] px-2 py-0.5 rounded-full font-medium " +
                                  (row.allSame
                                    ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200"
                                    : "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-200")
                                }
                              >
                                {row.allSame ? "Same" : "Differs"}
                              </span>
                            </div>
                          </TableHead>
                          {row.values.map((value, index) => (
                            <TableCell key={`${row.id}-${items[index]}`}>
                              <span className="text-sm">{value}</span>
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                    <TableCaption className="pt-4">
                      Highlighted badges indicate whether attributes are identical or different across selected products.
                    </TableCaption>
                  </Table>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
