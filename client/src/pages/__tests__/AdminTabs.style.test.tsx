import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '@/components/ThemeProvider';
import AdminModeration from '@/pages/admin/Moderation';

vi.mock('@/hooks/use-auth', async () => ({ 
  useAuth: () => ({ user: { role: 'admin', id: 'a1' }, isLoading: false, isAdmin: true }) 
}));
vi.mock('wouter', () => ({
  Link: ({ children }: { children: React.ReactNode }) => <a>{children}</a>,
  useLocation: () => ['/admin/moderation', vi.fn()],
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
  client.setQueryData(['/api/admin/stores?status=pending'], []);
  client.setQueryData(['/api/admin/products?status=pending'], { products: [], total: 0 });
  client.setQueryData(['/api/admin/reviews?status=pending'], []);
  return { client };
}

describe('Admin Tabs active styling', () => {
  it('applies primary color styling to active moderation tab', async () => {
    const { client } = setup();
    render(
      <ThemeProvider>
        <QueryClientProvider client={client}>
          <AdminModeration />
        </QueryClientProvider>
      </ThemeProvider>
    );
    const storesTab = await screen.findByTestId('tab-pending-stores');
    expect(storesTab.getAttribute('data-state')).toBe('active');
    expect(storesTab.className).toContain('data-[state=active]:bg-primary');
  });
});
