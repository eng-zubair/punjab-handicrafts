import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AuthDialog } from '@/components/AuthDialog';
import { ThemeProvider } from '@/components/ThemeProvider';

vi.mock('@/hooks/use-auth', async () => {
  return {
    useAuth: () => ({
      login: vi.fn(),
      register: vi.fn(),
      isLoggingIn: false,
      isRegistering: false,
      loginError: null,
      registerError: null,
    }),
  };
});

describe('AuthDialog password toggle', () => {
  it('toggles password visibility on login', async () => {
    const user = userEvent.setup();
    render(
      <ThemeProvider>
        <AuthDialog open={true} onOpenChange={() => {}} defaultTab="login" />
      </ThemeProvider>
    );
    const input = screen.getByTestId('input-login-password') as HTMLInputElement;
    expect(input.type).toBe('password');
    await user.click(screen.getByTestId('toggle-login-password'));
    expect(input.type).toBe('text');
    await user.click(screen.getByTestId('toggle-login-password'));
    expect(input.type).toBe('password');
  });

  it('toggles password visibility on register', async () => {
    const user = userEvent.setup();
    render(
      <ThemeProvider>
        <AuthDialog open={true} onOpenChange={() => {}} defaultTab="register" />
      </ThemeProvider>
    );
    const input = screen.getByTestId('input-register-password') as HTMLInputElement;
    expect(input.type).toBe('password');
    await user.click(screen.getByTestId('toggle-register-password'));
    expect(input.type).toBe('text');
    await user.click(screen.getByTestId('toggle-register-password'));
    expect(input.type).toBe('password');
  });
});

