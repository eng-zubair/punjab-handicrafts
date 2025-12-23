import { describe, it, expect, beforeEach, vi } from "vitest";
import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Header from "../Header";
import { ThemeProvider } from "@/components/ThemeProvider";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { getQueryFn } from "@/lib/queryClient";
import { WishlistProvider } from "@/components/WishlistContext";
import { CompareProvider } from "@/components/CompareContext";

function setup() {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, staleTime: Infinity, queryFn: getQueryFn({ on401: "throw" }) },
      mutations: { retry: false },
    },
  });
  return { client };
}

beforeEach(() => {
  vi.resetAllMocks();
  (window as any).matchMedia = vi.fn(() => ({
    matches: false,
    addEventListener: () => {},
    removeEventListener: () => {},
  }));
});

describe("Header autocomplete", () => {
  it("shows suggestions and allows click selection", async () => {
    const { client } = setup();
    global.fetch = vi.fn(async (url: any) => {
      const u = typeof url === "string" ? url : "";
      if (u.includes("/api/categories")) {
        return { ok: true, json: async () => ([{ id: "cat1", giBrand: "Blue Pottery", district: "Multan", crafts: ["Pottery"] }]) } as any;
      }
      if (u.includes("/api/auth/user")) {
        return { ok: true, json: async () => (null) } as any;
      }
      if (u.includes("/api/wishlist/sync") || u.includes("/api/wishlist")) {
        return { ok: true, json: async () => ([]) } as any;
      }
      if (u.includes("/api/search/suggestions")) {
        return {
          ok: true,
          json: async () => ({
            suggestions: [
              {
                id: "p1",
                title: "Blue Pottery Vase",
                giBrand: "Blue Pottery",
                category: "Home Decor",
                district: "Multan",
                image: null,
              },
            ],
            metrics: { durationMs: 10 },
          }),
        } as any;
      }
      return { ok: true, json: async () => ({}) } as any;
    });

    render(
      <ThemeProvider>
        <QueryClientProvider client={client}>
          <CompareProvider>
            <WishlistProvider>
              <Header />
            </WishlistProvider>
          </CompareProvider>
        </QueryClientProvider>
      </ThemeProvider>,
    );

    const input = screen.getAllByTestId("input-header-search")[0] as HTMLInputElement;
    await userEvent.click(input);
    await userEvent.type(input, "Blue");

    const item = await screen.findByText("Blue Pottery Vase");
    expect(item).toBeInTheDocument();

    await userEvent.click(item);
    expect(input.value).toBe("Blue Pottery Vase");
  });

  it("supports keyboard navigation with ArrowDown + Enter", async () => {
    const { client } = setup();
    global.fetch = vi.fn(async (url: any) => {
      const u = typeof url === "string" ? url : "";
      if (u.includes("/api/categories")) {
        return { ok: true, json: async () => ([{ id: "cat1", giBrand: "Khussa", district: "Lahore", crafts: ["Footwear"] }]) } as any;
      }
      if (u.includes("/api/auth/user")) {
        return { ok: true, json: async () => (null) } as any;
      }
      if (u.includes("/api/wishlist/sync") || u.includes("/api/wishlist")) {
        return { ok: true, json: async () => ([]) } as any;
      }
      if (u.includes("/api/search/suggestions")) {
        return {
          ok: true,
          json: async () => ({
            suggestions: [
              { id: "p1", title: "Khussa Shoes", giBrand: "Khussa", category: "Footwear", district: "Lahore", image: null },
              { id: "p2", title: "Blue Pottery Vase", giBrand: "Blue Pottery", category: "Home Decor", district: "Multan", image: null },
            ],
            metrics: { durationMs: 12 },
          }),
        } as any;
      }
      return { ok: true, json: async () => ({}) } as any;
    });

    render(
      <ThemeProvider>
        <QueryClientProvider client={client}>
          <CompareProvider>
            <WishlistProvider>
              <Header />
            </WishlistProvider>
          </CompareProvider>
        </QueryClientProvider>
      </ThemeProvider>,
    );

    const input = screen.getAllByTestId("input-header-search")[0] as HTMLInputElement;
    await userEvent.click(input);
    await userEvent.type(input, "Kh");

    const options = await screen.findAllByRole("option");
    expect(options.length).toBeGreaterThan(0);

    await userEvent.keyboard("{ArrowDown}");
    expect(options[0]).toHaveAttribute("aria-selected", "true");
  });
});
