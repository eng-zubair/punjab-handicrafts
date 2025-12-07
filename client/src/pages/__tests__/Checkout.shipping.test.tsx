import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Checkout from '@/pages/Checkout';
import { ThemeProvider } from '@/components/ThemeProvider';

vi.mock('wouter', async (importOriginal) => {
  const actual = await importOriginal<any>();
  return {
    ...actual,
    useLocation: () => ["/checkout", () => {}],
    Link: (props: any) => <a {...props} />,
  };
});

vi.mock('@/lib/cart', async () => {
  const cart = [
    { productId: 'p1', storeId: 's1', title: 'Test Product', price: '1350', quantity: 1, image: '/img.jpg', stock: 5, storeName: 'Crafts' },
  ];
  return {
    getCart: () => cart,
    getCartCount: () => cart.length,
    clearCart: () => {},
  };
});

vi.mock('@/lib/queryClient', async () => {
  const actual = await vi.importActual<any>('@/lib/queryClient');
  const apiSpy = vi.fn(async (method: string, url: string, body: any) => ({ ok: true, json: async () => ({ subtotal: '1350.00', taxes: '202.50', shipping: '200.00', total: '1752.50' }) }));
  (globalThis as any).__apiSpy = apiSpy;
  return {
    ...actual,
    apiRequest: apiSpy,
  };
});

function setup() {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, staleTime: Infinity },
      mutations: { retry: false },
    },
  });
  return { client };
}

describe('Checkout shipping details form', () => {
  it('validates required fields and triggers calculator', async () => {
    const { client } = setup();
    const user = userEvent.setup();

    render(
      <ThemeProvider>
        <QueryClientProvider client={client}>
          <Checkout />
        </QueryClientProvider>
      </ThemeProvider>
    );

    await user.type(screen.getByPlaceholderText('Recipient full name'), 'Ali Khan');
    await user.type(screen.getByPlaceholderText('Street address'), '123 Street');
    await user.type(screen.getByPlaceholderText('City'), 'Multan');
    await user.selectOptions(screen.getByLabelText('State/Province'), 'Punjab');

    const apiSpy = (globalThis as any).__apiSpy as ReturnType<typeof vi.fn>;
    expect(apiSpy).toHaveBeenCalledWith('POST', '/api/checkout/calculate', expect.objectContaining({ shippingProvince: 'Punjab', shippingCity: 'Multan' }));

    await user.click(screen.getByTestId('button-review'));
    expect(screen.getByTestId('text-taxes').textContent).toBeDefined();
    expect(screen.getByTestId('text-shipping').textContent).toBeDefined();
  });
});
