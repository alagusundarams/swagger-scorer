import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ContractCommitForm } from './ContractCommitForm';
import { type Product } from '../../inventory/types/inventoryTypes';

const mockProduct: Product = {
    id: 'prod-1',
    management_mode: 'UNTRACKED',
} as any;

describe('ContractCommitForm', () => {
    it('renders input fields and buttons', () => {
        render(
            <ContractCommitForm
                product={mockProduct}
                commitMessage=""
                setCommitMessage={vi.fn()}
                commitDescription=""
                setCommitDescription={vi.fn()}
                storageUsage={0.5}
                isSaving={false}
                onCancel={vi.fn()}
                onCommit={vi.fn()}
            />
        );

        expect(screen.getByPlaceholderText(/Commit message/i)).toBeTruthy();
        expect(screen.getByPlaceholderText(/Description/i)).toBeTruthy();
        expect(screen.getByText(/Commit to Git/i)).toBeTruthy();
    });

    it('disables commit button when message is empty', () => {
        render(
            <ContractCommitForm
                product={mockProduct}
                commitMessage=""
                setCommitMessage={vi.fn()}
                commitDescription=""
                setCommitDescription={vi.fn()}
                storageUsage={0.5}
                isSaving={false}
                onCancel={vi.fn()}
                onCommit={vi.fn()}
            />
        );

        const commitButton = screen.getByRole('button', { name: /Commit to Git/i }) as HTMLButtonElement;
        expect(commitButton.disabled).toBe(true);
    });

    it('enables commit button when message is provided', () => {
        render(
            <ContractCommitForm
                product={mockProduct}
                commitMessage="feat: update api"
                setCommitMessage={vi.fn()}
                commitDescription=""
                setCommitDescription={vi.fn()}
                storageUsage={0.5}
                isSaving={false}
                onCancel={vi.fn()}
                onCommit={vi.fn()}
            />
        );

        const commitButton = screen.getByRole('button', { name: /Commit to Git/i }) as HTMLButtonElement;
        expect(commitButton.disabled).toBe(false);
    });

    it('calls onCommit when button is clicked', () => {
        const onCommitMock = vi.fn();
        render(
            <ContractCommitForm
                product={mockProduct}
                commitMessage="feat: update api"
                setCommitMessage={vi.fn()}
                commitDescription=""
                setCommitDescription={vi.fn()}
                storageUsage={0.5}
                isSaving={false}
                onCancel={vi.fn()}
                onCommit={onCommitMock}
            />
        );

        const commitButton = screen.getByRole('button', { name: /Commit to Git/i });
        fireEvent.click(commitButton);

        expect(onCommitMock).toHaveBeenCalled();
    });

    it('shows loading state when isSaving is true', () => {
        render(
            <ContractCommitForm
                product={mockProduct}
                commitMessage="feat: update api"
                setCommitMessage={vi.fn()}
                commitDescription=""
                setCommitDescription={vi.fn()}
                storageUsage={0.5}
                isSaving={true}
                onCancel={vi.fn()}
                onCommit={vi.fn()}
            />
        );

        expect(screen.getByText(/Creating PR.../i)).toBeTruthy();
    });
});
