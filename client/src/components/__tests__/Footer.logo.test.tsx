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

describe('Footer logo placement', () => {
  it('renders logo image on right side', () => {
    const { client } = setup();
    render(<QueryClientProvider client={client}><Footer /></QueryClientProvider>);
    const img = screen.getByAltText('Official Logo') as HTMLImageElement;
    expect(img).toBeDefined();
    const src = img.getAttribute('src') || '';
    expect(src.includes('swd.png')).toBe(true);
  });
});
