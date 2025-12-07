import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import BuyerDashboard from '@/pages/buyer/Dashboard';
import { ThemeProvider } from '@/components/ThemeProvider';

vi.mock('@/lib/queryClient', async () => {
  const actual = await vi.importActual<any>('@/lib/queryClient');
  const apiSpy = vi.fn(async (method: string, url: string, body?: any) => ({ ok: true, json: async () => ({}) }));
  (globalThis as any).__apiSpy = apiSpy;
  return { ...actual, apiRequest: apiSpy };
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

describe('BuyerDashboard shipping preferences', () => {
  it('prefills from profile and saves shippingPrefs', async () => {
    const { client } = setup();
    const user = userEvent.setup();

    const fetchSpy = vi.spyOn(global, 'fetch').mockImplementation(async (input: any, init?: any) => {
      const url = typeof input === 'string' ? input : input?.url;
      if (url === '/api/buyer/profile') {
        return new Response(JSON.stringify({
          id: 'u1',
          email: 'buyer@example.com',
          firstName: 'Ali',
          lastName: 'Khan',
          phone: '03001234567',
          defaultShippingAddress: 'Old Street, Lahore, Punjab, 54000, Pakistan',
          shippingPrefs: {
            recipientName: 'Ali Khan',
            recipientEmail: 'buyer@example.com',
            shippingStreet: 'Old Street',
            shippingCity: 'Lahore',
            shippingProvince: 'Punjab',
            shippingPostalCode: '54000',
            shippingCountry: 'Pakistan',
          },
        }), { status: 200 }) as any;
      }
      if (url === '/api/messages') {
        return new Response(JSON.stringify([]), { status: 200 }) as any;
      }
      if (url === '/api/buyer/orders') {
        return new Response(JSON.stringify([]), { status: 200 }) as any;
      }
      return new Response(JSON.stringify({}), { status: 200 }) as any;
    });

    render(
      <ThemeProvider>
        <QueryClientProvider client={client}>
          <BuyerDashboard />
        </QueryClientProvider>
      </ThemeProvider>
    );

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Street address')).toBeDefined();
    });

    await user.clear(screen.getByPlaceholderText('Street address'));
    await user.type(screen.getByPlaceholderText('Street address'), '123 New Street');
    await user.clear(screen.getByPlaceholderText('City'));
    await user.type(screen.getByPlaceholderText('City'), 'Multan');
    await user.selectOptions(screen.getByLabelText('State/Province'), 'Punjab');

    await user.click(screen.getByText('Save Shipping'));

    const apiSpy = (globalThis as any).__apiSpy as ReturnType<typeof vi.fn>;
    expect(apiSpy).toHaveBeenCalledWith(
      'PUT',
      '/api/buyer/profile',
      expect.objectContaining({
        shippingPrefs: expect.objectContaining({ shippingStreet: '123 New Street', shippingCity: 'Multan', shippingProvince: 'Punjab' }),
        defaultShippingAddress: expect.stringContaining('123 New Street'),
      })
    );

    fetchSpy.mockRestore();
  });
});
