import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { within } from '@testing-library/dom';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import VendorProducts from '@/pages/vendor/Products';
import { ThemeProvider } from '@/components/ThemeProvider';

// Mock useAuth
vi.mock('@/hooks/use-auth', async () => ({ 
  useAuth: () => ({ user: { role: 'vendor', id: 'v1' }, isLoading: false, isVendor: true }) 
}));

// Mock wouter
vi.mock("wouter", () => ({
  Link: ({ children }: { children: React.ReactNode }) => <a>{children}</a>,
  useLocation: () => ["/vendor/products", vi.fn()],
}));

// Mock window.matchMedia
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

global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// Mock Pointer Events for Radix UI
window.Element.prototype.hasPointerCapture = vi.fn(() => false);
window.Element.prototype.setPointerCapture = vi.fn();
window.Element.prototype.releasePointerCapture = vi.fn();
window.HTMLElement.prototype.scrollIntoView = vi.fn();
window.Element.prototype.scrollIntoView = vi.fn();

// Mock apiRequest
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

  const store = { id: 's1', name: 'Test Store', vendorId: 'v1', status: 'approved', district: 'Multan', giBrands: ['Blue Pottery'] } as any;
  const categories = [
    { district: 'Multan', giBrand: 'Blue Pottery', crafts: [] },
  ] as any[];
  const products = [] as any[];

  client.setQueryData(['/api/vendor/stores'], [store]);
  client.setQueryData(['/api/categories'], categories);
  client.setQueryData(['/api/vendor/products'], products);
  client.setQueryData(['/api/vendor/groups'], []);
  client.setQueryData(['/api/vendor/promotions'], []);
  client.setQueryData(['/api/vendor/promotion-products'], []);
  client.setQueryData(['/api/product-categories'], [
    { id: 'pc1', name: 'Pottery', slug: 'pottery', description: null, createdAt: new Date().toISOString() },
    { id: 'pc2', name: 'Other', slug: 'other', description: null, createdAt: new Date().toISOString() },
  ]);

  return { client };
}

describe('VendorProducts Add Product with Variants', () => {
  it('opens add dialog, fills form with category and variants, and submits', async () => {
    const { client } = setup();
    const user = userEvent.setup();

    // Mock product categories fetch for ProductForm
    // Provide a couple of categories including 'Pottery'
    // This must be set before rendering
    // @ts-ignore
    global.fetch = vi.fn(async (url: any) => {
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
    });

    render(
      <ThemeProvider>
        <QueryClientProvider client={client}>
          <VendorProducts />
        </QueryClientProvider>
      </ThemeProvider>
    );

    // Click Add Product button
    const addButton = await screen.findByText('Add Product');
    await user.click(addButton);

    // Check if dialog opens
    expect(screen.getByText('Add New Product')).toBeDefined();

    // Fill basic fields
    await user.type(screen.getByTestId('input-product-title'), 'Test Variant Product');
    await user.type(screen.getByTestId('input-product-description'), 'Description with variants');
    await user.type(screen.getByTestId('input-product-price'), '1000');
    await user.type(screen.getByTestId('input-product-stock'), '100');

    // Select District (Select trigger interaction)
    const districtTrigger = screen.getByTestId('select-product-district');
    await user.click(districtTrigger);
    const districtOption = await screen.findByRole('option', { name: 'Multan' });
    await user.click(districtOption);

    // Select GI Brand
    const brandTrigger = screen.getByTestId('select-product-gi-brand');
    await user.click(brandTrigger);
    const brandOption = await screen.findByRole('option', { name: 'Blue Pottery' });
    await user.click(brandOption);

    // Category default is preselected to ensure a valid submission

    // Enable Variants
    const variantSwitch = screen.getByRole('switch');
    await user.click(variantSwitch);

    // Add Variant
    const addVariantBtn = screen.getByText('Add Variant');
    await user.click(addVariantBtn);

    // Fill Variant Fields
    // Since there's only one row, we can target by placeholder or label
    // Type
    const typeInput = screen.getByPlaceholderText('Size');
    await user.type(typeInput, 'Small');
    
    // Option
    const optionInput = screen.getByPlaceholderText('Small');
    await user.type(optionInput, 'S'); // Input value will be "S"

    // SKU
    const skuInput = screen.getByPlaceholderText('SKU-001');
    await user.type(skuInput, 'SKU-S');

    // Price
    // There are multiple price inputs (main product price + variant price).
    // The variant price is in the variant row.
    // We can use getAllByPlaceholderText('0')
    const priceInputs = screen.getAllByPlaceholderText('0');
    // The first one is likely variant price, second is stock.
    await user.type(priceInputs[0], '1000');
    await user.type(priceInputs[1], '50'); // Stock

    // Mock Image Upload (skip actual upload, but form requires it?)
    // The mutation checks: if (uploadedImages.length === 0) throw new Error("Please upload at least one image");
    // I need to mock the uploadedImages state.
    // Since I can't easily mock useState inside the component from here without complex setup,
    // I will try to simulate the upload if possible, or just expect validation error if I don't.
    // But wait, the test environment mocks apiRequest.
    // `handleImageUpload` calls `/api/upload/product-images`.
    // I need to mock global.fetch for that.
    
    global.fetch = vi.fn(async (url: any) => {
      if (url.includes('/api/upload/product-images')) {
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
    });

    const fileInput = screen.getByTestId('input-product-images');
    const file = new File(['(⌐□_□)'], 'chucknorris.png', { type: 'image/png' });
    await user.upload(fileInput, file);

    // Wait for upload to finish (it sets state)
    await waitFor(() => expect(screen.getByAltText('Product 1')).toBeDefined());

    // Submit
    const submitBtn = screen.getByText('Create Product');
    await user.click(submitBtn);

    // Verify apiRequest
    await waitFor(() => {
      expect(apiRequest).toHaveBeenCalledWith('POST', '/api/products', expect.objectContaining({
        title: 'Test Variant Product',
        category: expect.any(String),
        hasVariants: true,
        variants: expect.arrayContaining([
          expect.objectContaining({
            type: 'Small',
            option: 'S',
            sku: 'SKU-S',
            price: 1000,
            stock: 50
          })
        ])
      }));
    });
  });
});
