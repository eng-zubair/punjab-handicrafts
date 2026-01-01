import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Footer from '@/components/Footer';

class MockResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

(globalThis as any).ResizeObserver = (globalThis as any).ResizeObserver || MockResizeObserver;

function setup() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity }, mutations: { retry: false } } });
  return { client };
}

describe('Footer links', () => {
  it('shows Privacy Policy and Terms of Service links', () => {
    const { client } = setup();
    render(<QueryClientProvider client={client}><Footer /></QueryClientProvider>);
    const privacy = screen.getAllByText('Privacy Policy')[0] as HTMLAnchorElement;
    const terms = screen.getAllByText('Terms of Service')[0] as HTMLAnchorElement;
    expect(privacy.getAttribute('href')).toBe('/privacy-policy');
    expect(terms.getAttribute('href')).toBe('/terms');
  });
});
