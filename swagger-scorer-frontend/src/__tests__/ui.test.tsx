import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom';
import App from '../App';
import * as client from '../api/client';
import { useAnalysis } from '../store/useAnalysis';

// Mock the API client
vi.mock('../api/client', () => ({
    postAnalyze: vi.fn(),
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

describe('Swagger Scorer UI', () => {
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

    it('renders the header and form initially', () => {
        render(<App />);
        expect(screen.getByRole('heading', { level: 1, name: /APIM Self Service/i })).toBeInTheDocument();
        expect(screen.getByTestId('monaco-editor-mock')).toBeInTheDocument();
        expect(screen.getByText('Run')).toBeInTheDocument();
    });

    it('disables Run button when editor is empty', () => {
        render(<App />);
        // Use closest to get the actual button element
        const runSpan = screen.getByText('Run');
        const button = runSpan.closest('button');
        expect(button).toBeDisabled();
    });

    it('enables Run button when editor has content', () => {
        render(<App />);

        const textarea = screen.getByTestId('monaco-editor-mock');
        fireEvent.change(textarea, { target: { value: 'openapi: 3.0.0' } });

        const runSpan = screen.getByText('Run');
        const button = runSpan.closest('button');
        expect(button).not.toBeDisabled();
    });

    it('shows loading state when analysis starts', async () => {
        // Set initial state with content so button is enabled
        useAnalysis.setState({ spec: 'openapi: 3.0.0' });

        // Mock a slow response
        (client.postAnalyze as any).mockImplementation(() => new Promise(() => { }));

        render(<App />);

        // Get button and click
        const runSpan = screen.getByText('Run');
        const button = runSpan.closest('button');
        expect(button).not.toBeDisabled();
        fireEvent.click(button!);

        // Check loading state appears
        await waitFor(() => {
            expect(screen.getByText(/Running/i)).toBeInTheDocument();
        });
    });

    it('shows error message on API failure', async () => {
        // Set initial state with content
        useAnalysis.setState({ spec: 'openapi: 3.0.0' });

        (client.postAnalyze as any).mockRejectedValue(new Error('Network Error'));

        render(<App />);

        // Get button and click
        const runSpan = screen.getByText('Run');
        const button = runSpan.closest('button');
        fireEvent.click(button!);

        // Wait for error to appear
        await waitFor(() => {
            expect(screen.getByText(/Network Error/i)).toBeInTheDocument();
        });
    });
});
