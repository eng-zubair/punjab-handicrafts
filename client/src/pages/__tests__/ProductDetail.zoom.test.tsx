import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import ProductDetail from "@/pages/ProductDetail";
import { ThemeProvider } from "@/components/ThemeProvider";
import { WishlistProvider } from "@/components/WishlistContext";
import { CompareProvider } from "@/components/CompareContext";

class MockResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}
(globalThis as any).ResizeObserver = MockResizeObserver as any;

vi.mock("wouter", async () => {
  return {
    useParams: () => ({ id: "prod1" }),
    useLocation: () => ["/products/prod1", () => {}],
    Link: (props: any) => <a {...props} />,
  };
});

function setup() {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, staleTime: Infinity },
      mutations: { retry: false },
    },
  });

  const product = {
    id: "prod1",
    storeId: "store1",
    title: "Zoomable Vase",
    description: "A detailed handmade vase",
    district: "Multan",
    giBrand: "Blue Pottery",
    price: "2500",
    stock: 5,
    images: ["/img1.jpg"],
  } as any;

  const store = {
    id: "store1",
    vendorId: "vendor1",
    name: "Crafts Store",
    description: "Authentic crafts",
    district: "Multan",
    status: "approved",
  } as any;

  client.setQueryData([`/api/products/prod1`], product);
  client.setQueryData([`/api/stores/${product.storeId}`], store);
  client.setQueryData([`/api/promotions/active-by-products`, { ids: "prod1" }], []);
  client.setQueryData([`/api/products`, { giBrand: product.giBrand, page: 1, pageSize: 24 }], { products: [] });
  client.setQueryData([`/api/products`, { category: product.category, page: 1, pageSize: 24 }], { products: [] });
  client.setQueryData([`/api/products`, { district: product.district, page: 1, pageSize: 24 }], { products: [] });
  client.setQueryData([`/api/products`, { page: 1, pageSize: 24 }], { products: [] });
  client.setQueryData([`/api/products/prod1/reviews`, { sort: "newest" }], { reviews: [], stats: { count: 0, average: 0 } });

  return { client };
}

describe("ProductDetail image zoom", () => {
  it("zooms in/out and resets via controls, and pans with keyboard", async () => {
    const { client } = setup();
    render(
      <ThemeProvider>
        <QueryClientProvider client={client}>
          <CompareProvider>
            <WishlistProvider>
              <ProductDetail />
            </WishlistProvider>
          </CompareProvider>
        </QueryClientProvider>
      </ThemeProvider>
    );

    const container = await screen.findByTestId("container-image-zoom");
    const getTransformEl = () => {
      const els = container.querySelectorAll<HTMLElement>("*");
      for (const el of Array.from(els)) {
        const t = el.style.transform;
        if (t && t.length > 0) return el;
      }
      return null;
    };
    const beforeEl = getTransformEl();
    const before = beforeEl?.style.transform || "";

    await userEvent.click(screen.getByTestId("button-zoom-in"));
    await waitFor(() => {
      const el = getTransformEl();
      const t = el?.style.transform || "";
      expect(t).toContain("scale(");
      expect(t).not.toContain("scale(1)");
    });

    await userEvent.click(screen.getByTestId("button-zoom-out"));
    const afterOutEl = getTransformEl();
    const afterOut = afterOutEl?.style.transform || "";
    expect(afterOut).not.toEqual(""); // transform style applied

    await userEvent.click(screen.getByTestId("button-zoom-in"));
    const panBeforeEl = getTransformEl();
    const panBefore = panBeforeEl?.style.transform || "";
    container.focus();
    await userEvent.keyboard("{ArrowRight}");
    await waitFor(() => {
      const el = getTransformEl();
      const t = el?.style.transform || "";
      expect(t).toMatch(/translate\(/);
      expect(t).not.toContain("translate(0px, 0px)");
    });

    await userEvent.click(screen.getByTestId("button-zoom-reset"));
    await waitFor(() => {
      const el = getTransformEl();
      const t = el?.style.transform || "";
      expect(t).toContain("scale(1)");
    });
  });
});
