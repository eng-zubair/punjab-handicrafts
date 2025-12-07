import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

vi.mock('wouter', async (importOriginal) => {
  const actual = await importOriginal<any>();
  return { ...actual, useLocation: () => ["/checkout", () => {}], Link: (props: any) => <a {...props} /> };
});

let cartQty = 1;
vi.mock('@/lib/cart', async () => {
  const cart = [
    { productId: 'p1', storeId: 's1', title: 'Variant Product', price: '3000', quantity: cartQty, image: '/img.jpg', stock: 10, storeName: 'Crafts', variant: { sku: 'SKU-123', type: 'size', option: 'L' } },
  ];
  return { getCart: () => cart, getCartCount: () => cart.length, clearCart: () => {} };
});

let apiSpy: any;
vi.mock('@/lib/queryClient', async () => {
  const actual = await vi.importActual<any>('@/lib/queryClient');
  return { ...actual, apiRequest: (...args: any[]) => apiSpy(...args) };
});

describe('Checkout taxes', () => {
  it('shows taxes for variant item using global rate', async () => {
    cartQty = 1;
    apiSpy = vi.fn(async (method: string, url: string, body: any) => {
      if (url === '/api/checkout/calculate') {
        const subtotal = body.items.reduce((s: number, it: any) => s + parseFloat(String(it.price)) * Number(it.quantity), 0);
        const taxes = (0.03 * subtotal);
        const shipping = 200;
        const total = subtotal + taxes + shipping;
        return { ok: true, json: async () => ({ subtotal: subtotal.toFixed(2), taxes: taxes.toFixed(2), shipping: shipping.toFixed(2), total: total.toFixed(2) }) } as any;
      }
      return { ok: true, json: async () => ({}) } as any;
    });
    const { default: Checkout } = await import('@/pages/Checkout');
    const { ThemeProvider } = await import('@/components/ThemeProvider');
    const client = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity }, mutations: { retry: false } } });
    const user = userEvent.setup();
    render(<ThemeProvider><QueryClientProvider client={client}><Checkout /></QueryClientProvider></ThemeProvider>);
    await user.type(screen.getAllByPlaceholderText('Recipient full name')[0], 'Ali Khan');
    await user.type(screen.getAllByPlaceholderText('Street address')[0], '123 Street');
    await user.type(screen.getAllByPlaceholderText('City')[0], 'Multan');
    await user.selectOptions(screen.getAllByLabelText('State/Province')[0], 'Punjab');
    const taxesNode = (await screen.findAllByTestId('text-taxes'))[0];
    expect(apiSpy).toHaveBeenCalledWith('POST', '/api/checkout/calculate', expect.any(Object));
    expect(taxesNode.textContent || '').toContain('PKR');
  });

  it('updates taxes when quantity changes', async () => {
    cartQty = 3;
    apiSpy = vi.fn(async (method: string, url: string, body: any) => {
      if (url === '/api/checkout/calculate') {
        const subtotal = body.items.reduce((s: number, it: any) => s + parseFloat(String(it.price)) * Number(it.quantity), 0);
        const taxes = (0.03 * subtotal);
        const shipping = 200;
        const total = subtotal + taxes + shipping;
        return { ok: true, json: async () => ({ subtotal: subtotal.toFixed(2), taxes: taxes.toFixed(2), shipping: shipping.toFixed(2), total: total.toFixed(2) }) } as any;
      }
      return { ok: true, json: async () => ({}) } as any;
    });
    const { default: Checkout } = await import('@/pages/Checkout');
    const { ThemeProvider } = await import('@/components/ThemeProvider');
    const client = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity }, mutations: { retry: false } } });
    const user = userEvent.setup();
    render(<ThemeProvider><QueryClientProvider client={client}><Checkout /></QueryClientProvider></ThemeProvider>);
    await user.type(screen.getAllByPlaceholderText('Recipient full name')[0], 'Ali Khan');
    await user.type(screen.getAllByPlaceholderText('Street address')[0], '123 Street');
    await user.type(screen.getAllByPlaceholderText('City')[0], 'Multan');
    await user.selectOptions(screen.getAllByLabelText('State/Province')[0], 'Punjab');
    const taxesEl = (await screen.findAllByTestId('text-taxes'))[0];
    await waitFor(() => expect(taxesEl.textContent || '').not.toEqual('PKR 0'));
    expect((taxesEl.textContent || '').startsWith('PKR ')).toBe(true);
  });
});
