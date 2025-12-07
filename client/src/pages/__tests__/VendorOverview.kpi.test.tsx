import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import VendorOverview from '@/pages/vendor/Overview';
import { ThemeProvider } from '@/components/ThemeProvider';

// Mock useAuth
vi.mock('@/hooks/use-auth', async () => ({ useAuth: () => ({ user: { role: 'vendor' }, isLoading: false, isVendor: true }) }));

// Mock wouter
vi.mock("wouter", () => ({
  Link: ({ children }: { children: React.ReactNode }) => <a>{children}</a>,
  useLocation: () => ["/vendor/dashboard", vi.fn()],
}));

vi.mock('@/pages/vendor/VendorDashboard', () => ({
  VendorDashboard: ({ children }: { children: React.ReactNode }) => <div>{children}</div>
}));

function setup() {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, staleTime: Infinity },
    },
  });

  // Mock Stores
  client.setQueryData(['/api/vendor/stores'], [
    {
      id: 'store1',
      name: 'Test Store',
      description: 'Test Description',
      district: 'Lahore',
      giBrands: ['Brand A'],
      status: 'approved',
      vendorId: 'v1',
      createdAt: new Date().toISOString(),
    }
  ]);

  // Mock Analytics (Legacy source for some data)
  client.setQueryData(['/api/vendor/analytics'], {
    totalRevenue: "0.00",
    totalEarnings: "0.00", // Intentionally 0 to verify we are using real-time calc
    totalOrders: 0, 
    totalProducts: 5,
    totalStores: 1,
  });

  // Mock Orders (Real-time source)
  client.setQueryData(['/api/vendor/orders'], [
    { id: 'o1', status: 'pending', total: '1000', items: [{ price: '1000', quantity: 1 }] },
    { id: 'o2', status: 'pending', total: '2000', items: [{ price: '1000', quantity: 2 }] },
    // Delivered order: 1500 * 1 = 1500
    { id: 'o3', status: 'delivered', total: '1500', items: [{ price: '1500', quantity: 1 }] },
    // Delivered order: 500 * 2 = 1000
    { id: 'o6', status: 'delivered', total: '1000', items: [{ price: '500', quantity: 2 }] },
    { id: 'o4', status: 'cancelled', total: '500', items: [{ price: '500', quantity: 1 }] },
    { id: 'o5', status: 'processing', total: '3000', items: [{ price: '3000', quantity: 1 }] },
  ]);

  return { client };
}

describe('VendorOverview KPIs', () => {
  it('displays real-time order counts and earnings correctly', async () => {
    const { client } = setup();
    
    render(
      <ThemeProvider>
        <QueryClientProvider client={client}>
          <VendorOverview />
        </QueryClientProvider>
      </ThemeProvider>
    );

    await waitFor(() => {
      expect(screen.queryByText('Loading...')).toBeNull();
    });

    // Total Orders: 6 (o1, o2, o3, o6, o4, o5)
    expect(screen.getByTestId('metric-total-orders').textContent).toBe('6');

    // Pending Orders: 2 (o1, o2)
    expect(screen.getByTestId('metric-pending-orders').textContent).toBe('2');

    // Delivered Orders: 2 (o3, o6)
    expect(screen.getByTestId('metric-delivered-orders').textContent).toBe('2');

    // Canceled Orders: 1 (o4)
    expect(screen.getByTestId('metric-canceled-orders').textContent).toBe('1');

    // Total Products (from Analytics)
    expect(screen.getByTestId('metric-total-products').textContent).toBe('5');

    // Total Earnings (from Orders)
    // o3 (1500) + o6 (1000) = 2500
    expect(screen.getByTestId('metric-total-revenue').textContent).toContain('2,500');
  });
});
