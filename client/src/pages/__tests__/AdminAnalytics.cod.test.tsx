import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { getQueryFn } from '@/lib/queryClient';
import AdminAnalytics from '@/pages/admin/Analytics';
import { ThemeProvider } from '@/components/ThemeProvider';
vi.mock('@/hooks/use-auth', async () => {
  return {
    useAuth: () => ({ user: { role: 'admin' }, isLoading: false }),
  };
});

function setup() {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, staleTime: Infinity, queryFn: getQueryFn({ on401: 'throw' }) },
      mutations: { retry: false },
    },
  });
  client.setQueryData(['/api/admin/analytics'], {
    totalUsers: 10,
    totalStores: 5,
    totalProducts: 100,
    totalOrders: 20,
    totalRevenue: 200000,
    pendingStores: 1,
    pendingProducts: 2,
    codOrders: 8,
    codDelivered: 6,
  });
  return { client };
}

describe('AdminAnalytics COD metrics', () => {
  it('renders COD orders and fulfillment rate', () => {
    const { client } = setup();
    // jsdom doesn't implement matchMedia by default
    (window as any).matchMedia = vi.fn(() => ({
      matches: false,
      addEventListener: () => {},
      removeEventListener: () => {},
    }));
    global.fetch = vi.fn(async (url: any) => {
      if (typeof url === 'string' && url.includes('/api/admin/analytics')) {
        return { ok: true, json: async () => client.getQueryData(['/api/admin/analytics']) } as any;
      }
      return { ok: true, json: async () => ({}) } as any;
    });
    render(
      <ThemeProvider>
        <QueryClientProvider client={client}>
          <AdminAnalytics />
        </QueryClientProvider>
      </ThemeProvider>
    );
    expect(screen.getByTestId('metric-analytics-cod-orders').textContent).toContain('8');
    expect(screen.getByTestId('metric-analytics-cod-fulfillment').textContent).toContain('75%');
  });
});