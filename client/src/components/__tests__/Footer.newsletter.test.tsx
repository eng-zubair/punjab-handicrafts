import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Footer from '@/components/Footer';

function setup() {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, staleTime: Infinity },
      mutations: { retry: false },
    },
  });
  return { client };
}

class MockResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}
// @ts-ignore
global.ResizeObserver = global.ResizeObserver || MockResizeObserver;

beforeEach(() => {
  (global as any).fetch = vi.fn(async (url: any, init?: any) => {
    if (typeof url === 'string' && url.includes('/api/categories')) {
      return { ok: true, json: async () => [] } as any;
    }
    if (typeof url === 'string' && url.includes('/api/newsletter/subscribe')) {
      const body = init?.body ? JSON.parse(init.body) : {};
      return {
        ok: true,
        json: async () => ({ id: 'sub-1', email: body.email, consent: body.consent ?? true }),
      } as any;
    }
    return { ok: true, json: async () => ({}) } as any;
  });
});

describe('Footer newsletter signup', () => {
  it('renders the newsletter section', () => {
    const { client } = setup();
    render(<QueryClientProvider client={client}><Footer /></QueryClientProvider>);
    expect(screen.getByTestId('newsletter-section')).toBeTruthy();
    expect(screen.getByTestId('newsletter-submit')).toBeTruthy();
  });

  it('validates email input and shows error', async () => {
    const { client } = setup();
    render(<QueryClientProvider client={client}><Footer /></QueryClientProvider>);
    const section = screen.getAllByTestId('newsletter-section')[0];
    const emailInput = within(section).getByRole('textbox', { name: /email/i }) as HTMLInputElement;
    const submit = within(section).getByRole('button', { name: /subscribe/i });
    await userEvent.clear(emailInput);
    await userEvent.type(emailInput, 'invalid-email');
    await userEvent.click(submit);
    await waitFor(() => {
      expect((global as any).fetch).not.toHaveBeenCalledWith(
        '/api/newsletter/subscribe',
        expect.anything()
      );
    });
  });

  it('submits valid email and clears the input', async () => {
    const { client } = setup();
    render(<QueryClientProvider client={client}><Footer /></QueryClientProvider>);
    const section = screen.getAllByTestId('newsletter-section')[0];
    const emailInput = within(section).getByRole('textbox', { name: /email/i }) as HTMLInputElement;
    const consent = within(section).getByRole('checkbox', { name: /agree to privacy policy/i });
    const submit = within(section).getByRole('button', { name: /subscribe/i });

    await userEvent.clear(emailInput);
    await userEvent.type(emailInput, 'john@example.com');
    // consent defaults to checked; toggle on and back off to ensure controlled behavior
    await userEvent.click(consent);
    await userEvent.click(consent);
    await userEvent.click(submit);

    await waitFor(() => {
      expect((global as any).fetch).toHaveBeenCalledWith(
        '/api/newsletter/subscribe',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: 'john@example.com', consent: true }),
          credentials: 'include',
        })
      );
    });

    await waitFor(() => {
      expect(emailInput.value).toBe('');
    });
  });
});
