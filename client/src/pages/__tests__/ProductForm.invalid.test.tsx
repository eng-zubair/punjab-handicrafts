import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ProductForm from '@/components/vendor/ProductForm';

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
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

window.Element.prototype.hasPointerCapture = vi.fn(() => false);
window.Element.prototype.setPointerCapture = vi.fn();
window.Element.prototype.releasePointerCapture = vi.fn();
window.HTMLElement.prototype.scrollIntoView = vi.fn();
window.Element.prototype.scrollIntoView = vi.fn();

vi.mock('@/lib/queryClient', async () => {
  const actual = await vi.importActual<any>('@/lib/queryClient');
  return {
    ...actual,
    apiRequest: vi.fn(async () => ({})),
  };
});

function setup() {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, staleTime: Infinity },
      mutations: { retry: false },
    },
  });
  const store = { id: 's1', name: 'Test Store', district: 'Multan', giBrands: ['Blue Pottery'] } as any;
  const categories = [
    { id: 'c1', district: 'Multan', giBrand: 'Blue Pottery', crafts: [] },
  ] as any[];
  return { client, store, categories };
}

describe('ProductForm invalid submission', () => {
  it('shows validation errors when required fields are missing', async () => {
    const { client, store, categories } = setup();
    const user = userEvent.setup();

    render(
      <QueryClientProvider client={client}>
        <ProductForm
          mode="create"
          store={store}
          categories={categories}
          onCancel={() => {}}
          onSuccess={() => {}}
        />
      </QueryClientProvider>
    );

    // Try submit without filling anything
    const submitBtn = screen.getByText('Add Product');
    await user.click(submitBtn);

    // Expect error messages
    expect(await screen.findByText(/Title must be at least/i)).toBeDefined();
    expect(await screen.findByText(/Description must be at least/i)).toBeDefined();
    // Images error appears after attempting upload; we can toggle variants error
    const variantSwitch = screen.getByLabelText('Toggle product variants');
    await user.click(variantSwitch);
    await user.click(submitBtn);
    expect(await screen.findByText(/Please add at least one variant/i)).toBeDefined();
  });
});
