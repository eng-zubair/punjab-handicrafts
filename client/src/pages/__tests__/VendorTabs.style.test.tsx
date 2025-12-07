import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import VendorProducts from '@/pages/vendor/Products';
import { ThemeProvider } from '@/components/ThemeProvider';

vi.mock('@/hooks/use-auth', async () => ({ 
  useAuth: () => ({ user: { role: 'vendor', id: 'v1' }, isLoading: false, isVendor: true }) 
}));
vi.mock('wouter', () => ({
  Link: ({ children }: { children: React.ReactNode }) => <a>{children}</a>,
  useLocation: () => ['/vendor/products', vi.fn()],
}));

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
// @ts-ignore
global.ResizeObserver = class ResizeObserver { observe(){} unobserve(){} disconnect(){} };

function setup() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: Infinity }, mutations: { retry: false } },
  });
  const store = { id: 's1', name: 'Store', vendorId: 'v1', status: 'approved', district: 'Multan', giBrands: ['Blue Pottery'] } as any;
  client.setQueryData(['/api/vendor/stores'], [store]);
  client.setQueryData(['/api/categories'], [{ district: 'Multan', giBrand: 'Blue Pottery', crafts: [] }] as any[]);
  client.setQueryData(['/api/vendor/products'], []);
  client.setQueryData(['/api/vendor/groups'], []);
  client.setQueryData(['/api/vendor/promotions'], []);
  client.setQueryData(['/api/vendor/promotion-products'], []);
  return { client };
}

describe('Vendor Tabs active styling', () => {
  it('applies primary color styling to active main tab and switches on click', async () => {
    const { client } = setup();
    const user = userEvent.setup();
    render(
      <ThemeProvider>
        <QueryClientProvider client={client}>
          <VendorProducts />
        </QueryClientProvider>
      </ThemeProvider>
    );
    const productsTab = await screen.findByTestId('tab-main-products');
    const groupsTab = await screen.findByTestId('tab-main-groups');
    expect(productsTab.getAttribute('data-state')).toBe('active');
    expect(productsTab.className).toContain('data-[state=active]:bg-primary');
    expect(groupsTab.getAttribute('data-state')).not.toBe('active');
    await user.click(groupsTab);
    expect(groupsTab.getAttribute('data-state')).toBe('active');
    expect(groupsTab.className).toContain('data-[state=active]:bg-primary');
  });

  it('applies primary styling to inner filter tabs (All/Approved/...) active state', async () => {
    const { client } = setup();
    render(
      <ThemeProvider>
        <QueryClientProvider client={client}>
          <VendorProducts />
        </QueryClientProvider>
      </ThemeProvider>
    );
    const allTab = await screen.findByTestId('tab-all-products');
    expect(allTab.getAttribute('data-state')).toBe('active');
    expect(allTab.className).toContain('data-[state=active]:bg-primary');
  });
});
