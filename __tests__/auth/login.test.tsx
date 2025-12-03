/**
 * @jest-environment jsdom
 */
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useRouter } from 'next/navigation';
import { LoginForm } from '@/components/auth/LoginForm';

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

// Mock next/navigation for useToast
jest.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: jest.fn(),
  }),
}));

describe('LoginForm → /dashboard Navigation', () => {
  let mockPush: jest.Mock;
  let mockRefresh: jest.Mock;

  beforeEach(() => {
    mockPush = jest.fn();
    mockRefresh = jest.fn();
    (useRouter as jest.Mock).mockReturnValue({
      push: mockPush,
      refresh: mockRefresh,
    });

    // Mock localStorage
    const localStorageMock = {
      getItem: jest.fn(),
      setItem: jest.fn(),
      removeItem: jest.fn(),
      clear: jest.fn(),
    };
    global.localStorage = localStorageMock as any;

    // Mock fetch
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should render login form', () => {
    render(<LoginForm />);
    expect(screen.getByLabelText(/Email or Username/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Sign In/i })).toBeInTheDocument();
  });

  it('should successfully login and redirect to /dashboard', async () => {
    const user = userEvent.setup();

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: jest.fn().mockResolvedValueOnce({
        success: true,
        message: 'Login successful',
        token: 'test-token',
        user: {
          role: 'admin',
          firstName: 'Admin',
          email: 'admin@hrms.com',
          permissions: { dashboard: { view: true } },
        },
      }),
    });

    render(<LoginForm />);

    const usernameInput = screen.getByLabelText(/Email or Username/i);
    const passwordInput = screen.getByLabelText(/Password/i);
    const submitButton = screen.getByRole('button', { name: /Sign In/i });

    await user.type(usernameInput, 'Admin');
    await user.type(passwordInput, 'Admin123');
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/dashboard');
      expect(mockRefresh).toHaveBeenCalled();
      expect(global.localStorage.setItem).toHaveBeenCalledWith('auth-token', 'test-token');
    });
  });

  it('should store permissions in localStorage after successful login', async () => {
    const user = userEvent.setup();
    const mockPermissions = {
      payroll: { view: true, create: false },
      leave: { view: true, approve: true },
    };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: jest.fn().mockResolvedValueOnce({
        success: true,
        message: 'Login successful',
        token: 'test-token',
        user: {
          role: 'hr',
          firstName: 'HR',
          email: 'hr@hrms.com',
          permissions: mockPermissions,
        },
      }),
    });

    render(<LoginForm />);

    const usernameInput = screen.getByLabelText(/Email or Username/i);
    const passwordInput = screen.getByLabelText(/Password/i);
    const submitButton = screen.getByRole('button', { name: /Sign In/i });

    await user.type(usernameInput, 'hr@hrms.com');
    await user.type(passwordInput, 'password123');
    await user.click(submitButton);

    await waitFor(() => {
      expect(global.localStorage.setItem).toHaveBeenCalledWith(
        'auth-permissions',
        JSON.stringify(mockPermissions)
      );
    });
  });

  it('should display error message on failed login', async () => {
    const user = userEvent.setup();

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      json: jest.fn().mockResolvedValueOnce({
        success: false,
        message: 'Invalid credentials',
      }),
    });

    render(<LoginForm />);

    const usernameInput = screen.getByLabelText(/Email or Username/i);
    const passwordInput = screen.getByLabelText(/Password/i);
    const submitButton = screen.getByRole('button', { name: /Sign In/i });

    await user.type(usernameInput, 'invalid@hrms.com');
    await user.type(passwordInput, 'wrongpassword');
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/Login Failed/i)).toBeInTheDocument();
      expect(screen.getByText(/Invalid credentials/i)).toBeInTheDocument();
    });
  });
});
