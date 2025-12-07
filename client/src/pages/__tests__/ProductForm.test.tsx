import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ProductForm from '@/components/vendor/ProductForm';

// Accessibility and Radix UI environment mocks
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

// ResizeObserver mock
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
    apiRequest: vi.fn(async (method: string, url: string, body?: any) => {
      return {};
    }),
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
  client.setQueryData(['/api/product-categories'], [
    { id: 'pc1', name: 'Pottery', slug: 'pottery', description: null, createdAt: new Date().toISOString() },
    { id: 'pc2', name: 'Other', slug: 'other', description: null, createdAt: new Date().toISOString() },
  ]);
  return { client, store, categories };
}

describe('ProductForm', () => {
  beforeEach(() => {
    // Mock image upload endpoint
    global.fetch = vi.fn(async (url: any) => {
      if (String(url).includes('/api/upload/product-images')) {
        return {
          ok: true,
          json: async () => ({ images: ['/img1.jpg'] }),
        } as any;
      }
      if (String(url).includes('/api/product-categories')) {
        return {
          ok: true,
          json: async () => ([
            { id: 'pc1', name: 'Pottery', slug: 'pottery', description: null, createdAt: new Date().toISOString() },
            { id: 'pc2', name: 'Other', slug: 'other', description: null, createdAt: new Date().toISOString() },
          ]),
        } as any;
      }
      return { ok: true, json: async () => ({}) } as any;
    }) as any;
  });

  it('submits valid data with category and variants', async () => {
    const { client, store, categories } = setup();
    const user = userEvent.setup();
    const { apiRequest } = await import('@/lib/queryClient');

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

    await user.type(screen.getByLabelText('Product Title'), 'Test Product');
    await user.type(screen.getByLabelText('Description'), 'A valid description for product');
    await user.type(screen.getByLabelText('Price (PKR)'), '1000');
    await user.type(screen.getByLabelText('Stock'), '10');

    // District select
    const districtTrigger = screen.getByLabelText('Select district');
    await user.click(districtTrigger);
    const districtOption = await screen.findByRole('option', { name: 'Multan' });
    await user.click(districtOption);

    // GI Brand select
    const brandTrigger = screen.getByLabelText('Select GI brand');
    await user.click(brandTrigger);
    const brandOption = await screen.findByRole('option', { name: 'Blue Pottery' });
    await user.click(brandOption);

    // Category default is preselected

    // Toggle variants
    const variantSwitch = screen.getByLabelText('Toggle product variants');
    await user.click(variantSwitch);

    const addVariantBtn = screen.getByText('Add Variant');
    await user.click(addVariantBtn);

    await user.type(screen.getByPlaceholderText('Size'), 'Size');
    await user.type(screen.getByPlaceholderText('Small'), 'Small');
    await user.type(screen.getByPlaceholderText('SKU-001'), 'SKU-S');
    const numericPlaceholders = screen.getAllByPlaceholderText('0');
    await user.type(numericPlaceholders[0], '1000');
    await user.type(numericPlaceholders[1], '5');

    // Upload an image
    const file = new File(['image'], 'img.png', { type: 'image/png' });
    const fileInput = screen.getByLabelText('Upload product images');
    await user.upload(fileInput, file);

    // Submit
    const submitBtn = screen.getByText('Add Product');
    await user.click(submitBtn);

    await vi.waitFor(() => {
      expect((apiRequest as any)).toHaveBeenCalledWith('POST', '/api/products', expect.objectContaining({
        title: 'Test Product',
        price: '1000',
        stock: 10,
        district: 'Multan',
        giBrand: 'Blue Pottery',
        category: expect.any(String),
        variants: expect.arrayContaining([
          expect.objectContaining({ sku: 'SKU-S', price: 1000, stock: 5 })
        ]),
        images: expect.arrayContaining(['/img1.jpg'])
      }));
    });
  });
});
