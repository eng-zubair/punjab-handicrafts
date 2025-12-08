import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Terms from '@/pages/Terms';
import { ThemeProvider } from '@/components/ThemeProvider';

function setup() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity }, mutations: { retry: false } } });
  return { client };
}

describe('Terms page', () => {
  it('renders headings and content', () => {
    const { client } = setup();
    render(<ThemeProvider><QueryClientProvider client={client}><Terms /></QueryClientProvider></ThemeProvider>);
    expect(screen.getAllByText('Terms of Service').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Introduction and Acceptance of Terms').length).toBeGreaterThan(0);
    expect(screen.getAllByText('User Responsibilities and Conduct Guidelines').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Intellectual Property Rights').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Privacy Policy Reference').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Limitation of Liability').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Termination Conditions').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Governing Law and Dispute Resolution').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Modification of Terms').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Contact Information').length).toBeGreaterThan(0);
  });
});
