import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
// import '@testing-library/jest-dom'; // incompatible with happy-dom without setup
import { AnalyzerForm } from '../components/AnalyzerForm';
import * as client from '../api/client';
import { useAnalysis } from '../store/useAnalysis';



// Mock the API client
vi.mock('../api/client', () => ({
    postAnalyze: vi.fn(),
    getLatestDraft: vi.fn().mockResolvedValue({ data: { spec: '' } }),
    saveDraft: vi.fn().mockResolvedValue({}),
}));

// Mock useAuth
vi.mock('../../auth/hooks/useAuth', () => ({
    useAuth: vi.fn().mockReturnValue({
        isAuthenticated: false,
        login: vi.fn(),
        getToken: vi.fn().mockResolvedValue('mock-token'),
    }),
}));


// Mock Monaco Editor
vi.mock('@monaco-editor/react', () => ({
    default: ({ onChange, value }: any) => (
        <textarea
            data-testid="monaco-editor-mock"
            value={value}
            onChange={(e) => onChange(e.target.value)}
        />
    ),
}));

// Mock components used in AnalyzerForm if any complex ones exist
// AnalyzerForm seems self-contained with standard UI elements

describe('AnalyzerForm', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        // Reset Zustand store state
        useAnalysis.setState({
            spec: '',
            result: null,
            error: null,
            loading: false,
            isMaximized: false,
            selectedLine: null
        });
    });

    afterEach(() => {
        cleanup();
    });


    it('renders the editor and run button', () => {
        render(<AnalyzerForm />);
        screen.debug();
        expect(screen.getByTestId('monaco-editor-mock')).toBeTruthy();
        expect(screen.getByText('Run')).toBeTruthy();
    });


    it('disables Run button when editor is empty', () => {
        render(<AnalyzerForm />);
        const runSpan = screen.getByText('Run');
        const button = runSpan.closest('button');
        expect(button?.disabled).toBe(true);
    });

    it('enables Run button when editor has content', () => {
        render(<AnalyzerForm />);

        const textarea = screen.getByTestId('monaco-editor-mock');
        fireEvent.change(textarea, { target: { value: 'openapi: 3.0.0' } });

        const runSpan = screen.getByText('Run');
        const button = runSpan.closest('button');
        expect(button?.disabled).toBe(false);
    });

    it('shows loading state when analysis starts', async () => {
        useAnalysis.setState({ spec: 'openapi: 3.0.0' });
        (client.postAnalyze as any).mockImplementation(() => new Promise(() => { }));

        render(<AnalyzerForm />);

        const runSpan = screen.getByText('Run');
        const button = runSpan.closest('button');
        fireEvent.click(button!);

        await waitFor(() => {
            expect(screen.getByText(/Running/i)).toBeTruthy();
        });
    });

    it('shows error message on API failure', async () => {
        useAnalysis.setState({ spec: 'openapi: 3.0.0' });
        (client.postAnalyze as any).mockRejectedValue(new Error('Network Error'));

        render(<AnalyzerForm />);

        const runSpan = screen.getByText('Run');
        const button = runSpan.closest('button');
        fireEvent.click(button!);

        await waitFor(() => {
            expect(screen.getByText(/Network Error/i)).toBeTruthy();
        });
    });
});
