import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ProductDetail from '@/pages/ProductDetail';
import { ThemeProvider } from '@/components/ThemeProvider';
import { WishlistProvider } from '@/components/WishlistContext';

vi.mock('wouter', async () => {
  return {
    useParams: () => ({ id: 'prod1' }),
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

  const reviews = [
    {
      id: 'rev1',
      productId: 'prod1',
      userId: 'u1',
      rating: '4.5',
      comment: 'Excellent quality and design.',
      verifiedPurchase: true,
      helpfulUp: 3,
      helpfulDown: 0,
      status: 'approved',
      createdAt: new Date('2024-10-05T00:00:00Z').toISOString(),
      reviewerName: 'Ali Khan',
    },
  ];

  const stats = { count: 1, average: 4.5 };

  client.setQueryData([`/api/products/prod1`], product);
  client.setQueryData([`/api/stores/${product.storeId}`], store);
  client.setQueryData([`/api/products/prod1/reviews`, { sort: 'newest' }], { reviews, stats });
  client.setQueryData([`/api/promotions/active-by-products`, { ids: 'prod1' }], []);

  return { client };
}

describe('ProductDetail reviews display', () => {
  it('renders rating summary and review with name, text, date', () => {
    const { client } = setup();
    render(
      <ThemeProvider>
        <QueryClientProvider client={client}>
          <WishlistProvider>
            <ProductDetail />
          </WishlistProvider>
        </QueryClientProvider>
      </ThemeProvider>
    );

    const breadcrumb = screen.getByLabelText('Breadcrumb');
    expect(breadcrumb.getAttribute('role')).toBe('navigation');
    const bc = within(breadcrumb);
    expect(bc.getByText('Home')).toBeDefined();
    expect(bc.getByText('Products')).toBeDefined();
    expect(bc.getByText('Handmade Vase')).toBeDefined();
    expect((bc.getByText('Home').closest('a') as HTMLAnchorElement).getAttribute('href')).toBe('/');
    expect((bc.getByText('Products').closest('a') as HTMLAnchorElement).getAttribute('href')).toBe('/products');

    expect(screen.getByTestId('text-product-title').textContent).toContain('Handmade Vase');
    expect(screen.getByText('(1)')).toBeDefined();
    expect(screen.getByText('4.5')).toBeDefined();
    expect(screen.getByText('Excellent quality and design.')).toBeDefined();
    expect(screen.getByText(/Ali Khan/)).toBeDefined();
  });
});
