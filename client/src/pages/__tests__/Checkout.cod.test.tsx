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
    { productId: 'p1', storeId: 's1', title: 'Blue Pottery Vase', price: '2500', quantity: 2, image: '/img.jpg', stock: 5, storeName: 'Crafts Store' },
  ];
  return {
    getCart: () => cart,
    getCartCount: () => cart.length,
    clearCart: () => {},
  };
});

vi.mock('@/lib/queryClient', async () => {
  const actual = await vi.importActual<any>('@/lib/queryClient');
  return {
    ...actual,
    apiRequest: vi.fn(async () => ({ json: async () => ({ id: 'order1', reference: 'PH-20250101', estimatedDelivery: '3-7 business days' }) })),
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

describe('Checkout COD flow', () => {
  it('selects COD, reviews, and shows COD notice', async () => {
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
    await user.click(screen.getByTestId('button-review'));

    expect(screen.getByText(/Payment Method:/)).toBeDefined();
    expect(screen.getByText(/Payment will be collected upon delivery/)).toBeDefined();
    expect(screen.getByText(/Amount/)).toBeDefined();
  });
});
