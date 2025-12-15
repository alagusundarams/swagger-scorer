import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { LoginPage } from './LoginPage';
import { useAuth } from '../auth/useAuth';

// Mock the auth hook
vi.mock('../auth/useAuth');
vi.mock('../components/LoginButton', () => ({
    LoginButton: ({ fullWidth }: { fullWidth?: boolean }) => (
        <button data-testid="sso-button" className={fullWidth ? 'w-full' : ''}>
            Sign In with SSO
        </button>
    ),
}));

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
    const actual = await vi.importActual('react-router-dom');
    return {
        ...actual,
        useNavigate: () => mockNavigate,
    };
});

describe('LoginPage', () => {
    const mockLogin = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
        (useAuth as any).mockReturnValue({
            isAuthenticated: false,
            login: mockLogin,
        });
    });

    describe('Email Step', () => {
        it('renders email input and next button', () => {
            render(
                <BrowserRouter>
                    <LoginPage />
                </BrowserRouter>
            );

            expect(screen.getByPlaceholderText('Enter your email')).toBeInTheDocument();
            expect(screen.getByText('Next →')).toBeInTheDocument();
            expect(screen.getByTestId('sso-button')).toBeInTheDocument();
        });

        it('shows error for invalid email', async () => {
            render(
                <BrowserRouter>
                    <LoginPage />
                </BrowserRouter>
            );

            const emailInput = screen.getByPlaceholderText('Enter your email');
            const nextButton = screen.getByText('Next →');

            fireEvent.change(emailInput, { target: { value: 'invalid-email' } });
            fireEvent.click(nextButton);

            await waitFor(() => {
                expect(screen.getByText('Please enter a valid email address')).toBeInTheDocument();
            });
        });

        it('shows error for empty email', async () => {
            render(
                <BrowserRouter>
                    <LoginPage />
                </BrowserRouter>
            );

            const nextButton = screen.getByText('Next →');
            fireEvent.click(nextButton);

            await waitFor(() => {
                expect(screen.getByText('Please enter a valid email address')).toBeInTheDocument();
            });
        });

        it('triggers SSO for organization email', async () => {
            render(
                <BrowserRouter>
                    <LoginPage />
                </BrowserRouter>
            );

            const emailInput = screen.getByPlaceholderText('Enter your email');
            const nextButton = screen.getByText('Next →');

            fireEvent.change(emailInput, { target: { value: 'user@company.com' } });
            fireEvent.click(nextButton);

            await waitFor(() => {
                expect(mockLogin).toHaveBeenCalled();
            });
        });

        it('shows password step for guest email', async () => {
            render(
                <BrowserRouter>
                    <LoginPage />
                </BrowserRouter>
            );

            const emailInput = screen.getByPlaceholderText('Enter your email');
            const nextButton = screen.getByText('Next →');

            fireEvent.change(emailInput, { target: { value: 'user@guest.com' } });
            fireEvent.click(nextButton);

            await waitFor(() => {
                expect(screen.getByPlaceholderText('Enter your password')).toBeInTheDocument();
                expect(screen.getByText('user@guest.com')).toBeInTheDocument();
                expect(screen.getByText('Change')).toBeInTheDocument();
            });
        });
    });

    describe('Password Step', () => {
        beforeEach(async () => {
            render(
                <BrowserRouter>
                    <LoginPage />
                </BrowserRouter>
            );

            const emailInput = screen.getByPlaceholderText('Enter your email');
            const nextButton = screen.getByText('Next →');

            fireEvent.change(emailInput, { target: { value: 'user@guest.com' } });
            fireEvent.click(nextButton);

            await waitFor(() => {
                expect(screen.getByPlaceholderText('Enter your password')).toBeInTheDocument();
            });
        });

        it('renders password input and sign in button', () => {
            expect(screen.getByPlaceholderText('Enter your password')).toBeInTheDocument();
            expect(screen.getByText('Sign in')).toBeInTheDocument();
            expect(screen.getByText('user@guest.com')).toBeInTheDocument();
            expect(screen.getByText('Change')).toBeInTheDocument();
        });

        it('shows error for empty password', async () => {
            const signInButton = screen.getByText('Sign in');
            fireEvent.click(signInButton);

            await waitFor(() => {
                expect(screen.getByText('Please enter your password')).toBeInTheDocument();
            });
        });

        it('goes back to email step when change is clicked', async () => {
            const changeButton = screen.getByText('Change');
            fireEvent.click(changeButton);

            await waitFor(() => {
                expect(screen.getByPlaceholderText('Enter your email')).toBeInTheDocument();
                expect(screen.queryByPlaceholderText('Enter your password')).not.toBeInTheDocument();
            });
        });

        it('clears error when going back', async () => {
            const signInButton = screen.getByText('Sign in');
            fireEvent.click(signInButton);

            await waitFor(() => {
                expect(screen.getByText('Please enter your password')).toBeInTheDocument();
            });

            const changeButton = screen.getByText('Change');
            fireEvent.click(changeButton);

            await waitFor(() => {
                expect(screen.queryByText('Please enter your password')).not.toBeInTheDocument();
            });
        });
    });

    describe('Loading States', () => {
        it('shows loading state on SSO login', async () => {
            render(
                <BrowserRouter>
                    <LoginPage />
                </BrowserRouter>
            );

            const emailInput = screen.getByPlaceholderText('Enter your email');
            const nextButton = screen.getByText('Next →');

            fireEvent.change(emailInput, { target: { value: 'user@company.com' } });
            fireEvent.click(nextButton);

            await waitFor(() => {
                expect(screen.getByText('Loading...')).toBeInTheDocument();
            });
        });

        it('disables button during loading', async () => {
            render(
                <BrowserRouter>
                    <LoginPage />
                </BrowserRouter>
            );

            const emailInput = screen.getByPlaceholderText('Enter your email');
            const nextButton = screen.getByText('Next →');

            fireEvent.change(emailInput, { target: { value: 'user@company.com' } });
            fireEvent.click(nextButton);

            await waitFor(() => {
                const loadingButton = screen.getByText('Loading...').closest('button');
                expect(loadingButton).toBeDisabled();
            });
        });
    });

    describe('Navigation', () => {
        it('redirects to home when authenticated', () => {
            (useAuth as any).mockReturnValue({
                isAuthenticated: true,
                login: mockLogin,
            });

            render(
                <BrowserRouter>
                    <LoginPage />
                </BrowserRouter>
            );

            expect(mockNavigate).toHaveBeenCalledWith('/');
        });
    });
});
