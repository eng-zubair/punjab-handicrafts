import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ProductDetail from '@/pages/ProductDetail';
import { ThemeProvider } from '@/components/ThemeProvider';
import { WishlistProvider } from '@/components/WishlistContext';
import { CompareProvider } from '@/components/CompareContext';
import { apiRequest } from '@/lib/queryClient';

vi.mock('wouter', async () => {
  return {
    useParams: () => ({ id: 'prod1' }),
    useLocation: () => ["/products/prod1", () => {}],
    Link: (props: any) => <a {...props} />,
  };
});

vi.mock('@/lib/queryClient', async () => {
  const actual = await vi.importActual<any>('@/lib/queryClient');
  return {
    ...actual,
    apiRequest: vi.fn(async (method: string, url: string, body?: any) => ({ ok: true, json: async () => ({}) })),
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
    id: 'prod1',
    storeId: 'store1',
    title: 'Handmade Vase',
    description: 'A beautiful handmade vase',
    district: 'Multan',
    giBrand: 'Blue Pottery',
    price: '2500',
    stock: 5,
    images: ['/img1.jpg'],
  } as any;

  const store = {
    id: 'store1',
    vendorId: 'vendor1',
    name: 'Crafts Store',
    description: 'Authentic crafts',
    district: 'Multan',
    status: 'approved',
  } as any;

  const stats = { count: 0, average: 0 };

  client.setQueryData([`/api/products/prod1`], product);
  client.setQueryData([`/api/stores/${product.storeId}`], store);
  client.setQueryData([`/api/products/prod1/reviews`, { sort: 'newest' }], { reviews: [], stats });
  client.setQueryData([`/api/promotions/active-by-products`, { ids: 'prod1' }], []);

  return { client };
}

describe('ProductDetail share actions', () => {
  it('renders share buttons with accessible labels and triggers actions', async () => {
    const { client } = setup();
    (window as any).matchMedia = vi.fn(() => ({ matches: false, addEventListener: () => {}, removeEventListener: () => {} }));
    // @ts-ignore
    global.ResizeObserver = class ResizeObserver { observe(){} unobserve(){} disconnect(){} };
    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => ({} as any));
    (navigator as any).clipboard = { writeText: vi.fn(async () => {}) };

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

    const wa = await screen.findByTestId('button-share-whatsapp');
    const fb = await screen.findByTestId('button-share-facebook');
    const tw = await screen.findByTestId('button-share-twitter');
    const cp = await screen.findByTestId('button-copy-link');

    expect(wa.getAttribute('aria-label')).toBe('Share on WhatsApp');
    expect(fb.getAttribute('aria-label')).toBe('Share on Facebook');
    expect(tw.getAttribute('aria-label')).toBe('Share on X');
    expect(cp.getAttribute('aria-label')).toBe('Copy product link');

    wa.click();
    fb.click();
    tw.click();
    cp.click();

    expect(openSpy).toHaveBeenCalled();
    expect((navigator as any).clipboard.writeText).toHaveBeenCalledWith(expect.stringContaining('/products/prod1'));
  });

  it('uses Web Share API on mobile when available', async () => {
    const { client } = setup();
    // @ts-ignore
    global.ResizeObserver = class ResizeObserver { observe(){} unobserve(){} disconnect(){} };
    (window as any).matchMedia = vi.fn(() => ({ matches: false, addEventListener: () => {}, removeEventListener: () => {} }));
    (navigator as any).share = vi.fn(async () => {});
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
    await screen.findByTestId('text-product-title');
    const wa = screen.getByTestId('button-share-whatsapp');
    wa.click();
    expect((navigator as any).share).toHaveBeenCalled();
  });

});
