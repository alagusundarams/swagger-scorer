// import '@testing-library/jest-dom';
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';


// Global Axios Mock
vi.mock('axios', () => {
    return {
        default: {
            create: vi.fn(() => ({
                get: vi.fn(() => Promise.resolve({ data: [] })),
                post: vi.fn(() => Promise.resolve({ data: {} })),
                put: vi.fn(() => Promise.resolve({ data: {} })),
                delete: vi.fn(() => Promise.resolve({ data: {} })),
                patch: vi.fn(() => Promise.resolve({ data: {} })),
                interceptors: {
                    request: { use: vi.fn(), eject: vi.fn() },
                    response: { use: vi.fn(), eject: vi.fn() },
                },
            })),
        },
    };
});

afterEach(() => {
    cleanup();
    vi.clearAllMocks();
});
