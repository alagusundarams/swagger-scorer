import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { LoginPage } from './Login.view';
import { useAuth } from '../hooks/useAuth';

// Mock the auth hook
vi.mock('../hooks/useAuth');
vi.mock('../../../layouts/Header/LoginButton', () => ({
    LoginButton: ({ fullWidth }: { fullWidth?: boolean }) => (
        <button data-testid="sso-button" className={fullWidth ? 'w-full' : ''}>
            Sign In with SSO
        </button>

    ),
}));

vi.mock('../../inventory/api/inventoryClient', () => ({
    getProducts: vi.fn(),
    getTeams: vi.fn(),
    getSubscriptions: vi.fn(),
    postAnalyze: vi.fn(),
    requestProductAccess: vi.fn(),
    updateSubscription: vi.fn(),
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

            expect(screen.getByPlaceholderText('Enter your email')).toBeTruthy();
            expect(screen.getByText('Next →')).toBeTruthy();
            expect(screen.getByTestId('sso-button')).toBeTruthy();
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
            fireEvent.submit(nextButton.closest('form')!);


            await waitFor(() => {
                expect(screen.getByText('Please enter a valid email address')).toBeTruthy();
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
                expect(screen.getByText('Please enter a valid email address')).toBeTruthy();
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
                expect(screen.getByPlaceholderText('Enter your password')).toBeTruthy();
                expect(screen.getByText('user@guest.com')).toBeTruthy();
                expect(screen.getByText('Change')).toBeTruthy();
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
                expect(screen.getByPlaceholderText('Enter your password')).toBeTruthy();
            });
        });

        it('renders password input and sign in button', () => {
            expect(screen.getByPlaceholderText('Enter your password')).toBeTruthy();
            expect(screen.getByRole('button', { name: 'Sign in' })).toBeTruthy();
            expect(screen.getByText('user@guest.com')).toBeTruthy();
            expect(screen.getByText('Change')).toBeTruthy();
        });

        it('shows error for empty password', async () => {
            const signInButton = screen.getByRole('button', { name: 'Sign in' });
            fireEvent.click(signInButton);

            await waitFor(() => {
                expect(screen.getByText('Please enter your password')).toBeTruthy();
            });
        });

        it('goes back to email step when change is clicked', async () => {
            const changeButton = screen.getByText('Change');
            fireEvent.click(changeButton);

            await waitFor(() => {
                expect(screen.getByPlaceholderText('Enter your email')).toBeTruthy();
                expect(screen.queryByPlaceholderText('Enter your password')).toBeNull();
            });
        });

        it('clears error when going back', async () => {
            const signInButton = screen.getByRole('button', { name: 'Sign in' });
            fireEvent.click(signInButton);

            await waitFor(() => {
                expect(screen.getByText('Please enter your password')).toBeTruthy();
            });

            const changeButton = screen.getByText('Change');
            fireEvent.click(changeButton);

            await waitFor(() => {
                expect(screen.queryByText('Please enter your password')).toBeNull();
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
                expect(screen.getByText('Loading...')).toBeTruthy();
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
                expect(loadingButton?.disabled).toBe(true);
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
