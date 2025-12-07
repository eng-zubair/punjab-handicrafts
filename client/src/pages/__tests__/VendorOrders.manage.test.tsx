import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import VendorOrders from '@/pages/vendor/Orders';
import { ThemeProvider } from '@/components/ThemeProvider';
import userEvent from '@testing-library/user-event';

vi.mock('@/hooks/use-auth', async () => ({ useAuth: () => ({ user: { role: 'vendor' }, isLoading: false, isVendor: true }) }));

vi.mock('@tanstack/react-query', async (importOriginal) => {
  const actual = await importOriginal<any>();
  return actual;
});

vi.mock('@/lib/queryClient', async () => {
  return {
    apiRequest: vi.fn(async (method: string, url: string, body: any) => ({ ok: true, json: async () => ({}) })),
  };
});

function setup() {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, staleTime: Infinity },
      mutations: { retry: false },
    },
  });
  client.setQueryData(['/api/vendor/orders'], [
    {
      id: 'ord1', buyerId: 'u1', total: '5000', status: 'pending', paymentMethod: 'cod', shippingAddress: '123 Street', shippingPhone: '03001234567', preferredCommunication: 'in_app', createdAt: new Date().toISOString(),
      buyer: { id: 'u1', firstName: 'Ali', lastName: 'Khan', email: 'ali@example.com' },
      items: [],
    },
  ]);
  return { client };
}

describe('VendorOrders management', () => {
  it('shows buyer info and actions', async () => {
    (window as any).matchMedia = vi.fn(() => ({ matches: false, addEventListener: () => {}, removeEventListener: () => {} }));
    const { client } = setup();
    render(
      <ThemeProvider>
        <QueryClientProvider client={client}>
          <VendorOrders />
        </QueryClientProvider>
      </ThemeProvider>
    );
    expect(screen.getByTestId('text-order-buyer-ord1').textContent).toContain('Ali');
    expect(screen.getByTestId('badge-cod-ord1').textContent).toContain('Pending');
    const user = userEvent.setup();
    await user.click(screen.getByTestId('btn-status-processing-ord1'));
    await user.click(screen.getByTestId('btn-cod-collect-ord1'));
  });
});