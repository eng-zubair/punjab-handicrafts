import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import VendorProducts from '@/pages/vendor/Products';
import { ThemeProvider } from '@/components/ThemeProvider';
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }),
});

vi.mock('@/lib/queryClient', async () => {
  const actual = await vi.importActual<any>('@/lib/queryClient');
  return {
    ...actual,
    apiRequest: vi.fn(async (method: string, url: string, body?: any) => {
      if (method === 'POST' && url.includes('/api/vendor/promotions/') && url.endsWith('/products/bulk')) {
        return { added: (body?.items || []).length, invalid: [] };
      }
      return {};
    }),
  };
});

function setup() {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, staleTime: Infinity },
      mutations: { retry: false },
    },
  });

  const store = { id: 's1', name: 'Test Store', vendorId: 'v1', status: 'approved', district: 'Multan', giBrands: ['Blue Pottery'] } as any;
  const products = [
    { id: 'p1', storeId: 's1', title: 'Blue Pottery Vase', description: '', district: 'Multan', giBrand: 'Blue Pottery', price: '2500', stock: 3, images: [], status: 'approved', isActive: true, createdAt: new Date().toISOString() },
    { id: 'p2', storeId: 's1', title: 'Khussa Shoes', description: '', district: 'Multan', giBrand: 'Khussa', price: '4000', stock: 0, images: [], status: 'pending', isActive: true, createdAt: new Date().toISOString() },
  ] as any[];
  const promotions = [
    { id: 'promo1', storeId: 's1', name: 'Winter Sale', description: '', type: 'percentage', value: '10', minQuantity: null, appliesTo: 'all', targetId: null, startAt: null, endAt: null, status: 'active', createdAt: new Date().toISOString() },
  ] as any[];

  client.setQueryData(['/api/vendor/stores'], [store]);
  client.setQueryData(['/api/vendor/products'], products);
  client.setQueryData(['/api/vendor/promotions'], promotions);
  client.setQueryData(['/api/auth/user'], { id: 'v1', role: 'vendor', email: 'vendor@example.com', firstName: 'Vendor', lastName: 'User' } as any);

  return { client };
}

describe('VendorProducts add products to promotion', () => {
  it('opens dialog, selects product, sets options, submits', async () => {
    const { client } = setup();
    const user = userEvent.setup();

    render(
      <ThemeProvider>
        <QueryClientProvider client={client}>
          <VendorProducts />
        </QueryClientProvider>
      </ThemeProvider>
    );

    await user.click(await screen.findByTestId('tab-main-promotions'));

    await user.click(screen.getByTestId('button-attach-products-promo1'));

    const checkbox = await screen.findByTestId('checkbox-select-product-p1');
    await user.click(checkbox);

    const qtyInput = screen.getByTestId('input-quantity-limit-p1');
    await user.clear(qtyInput);
    await user.type(qtyInput, '2');

    const priceInput = screen.getByTestId('input-override-price-p1');
    await user.clear(priceInput);
    await user.type(priceInput, '2000');

    const submit = screen.getByTestId('button-submit-attach');
    expect(submit.hasAttribute('disabled')).toBe(false);
    await user.click(submit);
    expect(apiRequest).toHaveBeenCalled();
    // dialog should close after success
    await new Promise(r => setTimeout(r, 0));
    expect(screen.queryByText('Add Products to Promotion')).toBeNull();
  });
});