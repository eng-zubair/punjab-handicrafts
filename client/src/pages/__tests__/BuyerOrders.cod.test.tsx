import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Orders from '@/pages/Orders';
import { ThemeProvider } from '@/components/ThemeProvider';

function setup() {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, staleTime: Infinity },
      mutations: { retry: false },
    },
  });
  client.setQueryData(['/api/buyer/orders'], [
    { id: 'ord1', buyerId: 'u1', total: '5000', status: 'pending', paymentMethod: 'cod', shippingAddress: '123 Street, Multan', createdAt: new Date().toISOString() },
  ]);
  return { client };
}

describe('BuyerOrders COD notice', () => {
  it('shows COD notice for COD orders', () => {
    const { client } = setup();
    render(
      <ThemeProvider>
        <QueryClientProvider client={client}>
          <Orders />
        </QueryClientProvider>
      </ThemeProvider>
    );
    expect(screen.getByTestId('notice-cod-ord1')).toBeDefined();
    expect(screen.getByTestId('text-order-payment-ord1').textContent).toContain('cod');
  });
});