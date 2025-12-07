import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import AdminSettings from '@/pages/admin/Settings';
import { ThemeProvider } from '@/components/ThemeProvider';

vi.mock('@/hooks/use-auth', async () => ({ useAuth: () => ({ user: { role: 'admin' }, isLoading: false, isAdmin: true }) }));

vi.mock('@tanstack/react-query', async (importOriginal) => {
  const actual = await importOriginal<any>();
  return actual;
});

vi.mock('@/lib/queryClient', async () => {
  const actual = await vi.importActual<any>('@/lib/queryClient');
  return {
    ...actual,
    apiRequest: vi.fn(async (method: string, url: string, body?: any) => ({ ok: true, json: async () => ({}) })),
  };
});

function setup() {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, staleTime: Infinity },
      mutations: { retry: false },
    },
  });
  client.setQueryData(['/api/admin/platform/settings'], { id: 'default', taxEnabled: true, shippingEnabled: true });
  client.setQueryData(['/api/admin/tax-rules'], [
    { id: 'tax1', enabled: true, category: 'general', province: null, rate: '15.00', exempt: false, priority: 100 },
  ]);
  client.setQueryData(['/api/admin/shipping-rate-rules'], [
    { id: 'ship1', enabled: true, carrier: 'internal', method: 'standard', zone: 'PK', minWeightKg: '0', maxWeightKg: '999', baseRate: '100.00', perKgRate: '25.00', dimensionalFactor: null, surcharge: null, priority: 100 },
  ]);
  return { client };
}

describe('AdminSettings controls', () => {
  it('toggles tax and updates tax percentage and shipping rates', async () => {
    (window as any).matchMedia = vi.fn(() => ({ matches: false, addEventListener: () => {}, removeEventListener: () => {} }));
    const { client } = setup();
    const user = userEvent.setup();

    render(
      <ThemeProvider>
        <QueryClientProvider client={client}>
          <AdminSettings />
        </QueryClientProvider>
      </ThemeProvider>
    );

    await user.click(screen.getByTestId('switch-tax-enabled'));
    const { apiRequest } = await import('@/lib/queryClient');
    expect(apiRequest).toHaveBeenCalledWith('PUT', '/api/admin/platform/settings', { taxEnabled: false });

    const taxInput = screen.getByTestId('input-tax-rate') as HTMLInputElement;
    await user.clear(taxInput);
    await user.type(taxInput, '18.00');
    await user.click(screen.getByTestId('button-save-tax'));
    expect(apiRequest).toHaveBeenCalledWith('PUT', '/api/admin/tax-rules/tax1', { rate: '18.00', enabled: true, exempt: false });

    const baseInput = screen.getByTestId('input-shipping-base') as HTMLInputElement;
    const perKgInput = screen.getByTestId('input-shipping-perkg') as HTMLInputElement;
    await user.clear(baseInput);
    await user.type(baseInput, '150.00');
    await user.clear(perKgInput);
    await user.type(perKgInput, '50.00');
    await user.click(screen.getByTestId('button-save-shipping'));
    expect(apiRequest).toHaveBeenCalledWith('PUT', '/api/admin/shipping-rate-rules/ship1', { baseRate: '150.00', perKgRate: '50.00', enabled: true });
  });
});
