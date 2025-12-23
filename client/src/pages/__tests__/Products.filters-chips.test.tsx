import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { getQueryFn } from "@/lib/queryClient";
import "@testing-library/jest-dom/vitest";
import Products from "@/pages/Products";
import { ThemeProvider } from "@/components/ThemeProvider";
import { WishlistProvider } from "@/components/WishlistContext";
import { CompareProvider } from "@/components/CompareContext";

// Simplify framer-motion in tests to avoid exit animation keeping nodes in DOM
vi.mock("framer-motion", async () => {
  const React = await vi.importActual<any>("react");
  return {
    AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    motion: {
      button: (props: any) => <button {...props} />,
      div: (props: any) => <div {...props} />,
    },
  };
});

// Polyfill ResizeObserver for Radix UI in jsdom
class RO {
  observe() {}
  unobserve() {}
  disconnect() {}
}
(globalThis as any).ResizeObserver = (globalThis as any).ResizeObserver || RO;

let __mockLocation = "/products";
vi.mock("wouter", async () => ({
  useLocation: () => [__mockLocation, () => {}],
  Link: (props: any) => <a {...props} />,
}));

const categoriesFixture = [
  { id: "cat1", giBrand: "Blue Pottery", district: "Multan", crafts: ["Pottery"] },
];

const storesFixture = [
  { id: "store1", name: "Artisan Vendor", district: "Multan" },
];

const productsFixture = {
  products: [
    {
      id: "p1",
      title: "Blue Pottery Vase",
      description: "Handcrafted vase",
      price: "1200",
      images: ["/attached_assets/generated_images/Multan_blue_pottery_workshop_21555b73.png"],
      district: "Multan",
      giBrand: "Blue Pottery",
      storeId: "store1",
      stock: 5,
      ratingAverage: 4.5,
      ratingCount: 12,
    },
  ],
  pagination: { page: 1, pageSize: 12, total: 1, totalPages: 1 },
};

function createClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        queryFn: getQueryFn({ on401: "throw" }),
        retry: false,
        staleTime: Infinity,
      },
      mutations: { retry: false },
    },
  });
}

beforeEach(() => {
  vi.resetAllMocks();
  global.fetch = vi.fn(async (url: any) => {
    const u = typeof url === "string" ? url : "";
    if (u.includes("/api/categories")) {
      return { ok: true, json: async () => categoriesFixture } as any;
    }
    if (u.includes("/api/stores?status=approved")) {
      return { ok: true, json: async () => storesFixture } as any;
    }
    if (u.includes("/api/products")) {
      return { ok: true, json: async () => productsFixture } as any;
    }
    if (u.includes("/api/promotions/active-by-products")) {
      return { ok: true, json: async () => [] } as any;
    }
    if (u.includes("/api/auth/user")) {
      return { ok: true, json: async () => null } as any;
    }
    if (u.includes("/api/wishlist")) {
      return { ok: true, json: async () => [] } as any;
    }
    return { ok: true, json: async () => ({}) } as any;
  });
});

describe("Products filter chips", () => {
  it.skip("renders chips for active filters from URL", async () => {
    __mockLocation = "/products?search=pottery&district=Multan&giBrand=Blue%20Pottery&minPrice=500&maxPrice=9000";
    const client = createClient();

    render(
      <ThemeProvider>
        <QueryClientProvider client={client}>
          <CompareProvider>
            <WishlistProvider>
              <Products />
            </WishlistProvider>
          </CompareProvider>
        </QueryClientProvider>
      </ThemeProvider>
    );

    const chipsContainer = await screen.findByTestId("chips-active-filters");
    expect(chipsContainer).toBeInTheDocument();
    expect(await screen.findByTestId("chip-district")).toBeInTheDocument();
    expect(await screen.findByTestId("chip-giBrand")).toBeInTheDocument();
    expect(await screen.findByTestId("chip-priceRange")).toBeInTheDocument();
  });

  it("shows no chips when filters are default", async () => {
    __mockLocation = "/products?search=&district=all&giBrand=all&minPrice=0&maxPrice=10000";
    const client = createClient();
    render(
      <ThemeProvider>
        <QueryClientProvider client={client}>
          <CompareProvider>
            <WishlistProvider>
              <Products />
            </WishlistProvider>
          </CompareProvider>
        </QueryClientProvider>
      </ThemeProvider>
    );
    await waitFor(() => {
      expect(screen.queryByTestId("chips-active-filters")).toBeNull();
    });
  });
});
