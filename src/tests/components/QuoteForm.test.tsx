import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { QuoteForm } from '@/components/revenue/QuoteForm';
import * as revenueActions from '@/modules/revenue/actions/revenue.actions';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('@/modules/revenue/actions/revenue.actions', () => ({
  createQuoteAction: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

// Mock useFormStatus for Next.js app router forms
vi.mock('react-dom', async () => {
  const actual = await vi.importActual('react-dom');
  return {
    ...actual,
    useFormStatus: () => ({ pending: false }),
  };
});

describe('QuoteForm', () => {
  const customers = [
    { id: 'c1', name: 'Customer 1' },
    { id: 'c2', name: 'Customer 2' },
  ];

  const deals = [
    { id: 'd1', title: 'Deal 1 (C1)', customerId: 'c1' },
    { id: 'd2', title: 'Deal 2 (C1)', customerId: 'c1' },
    { id: 'd3', title: 'Deal 3 (C2)', customerId: 'c2' },
  ];

  const priceBooks = [
    { id: 'pb1', name: 'PriceBook 1' }
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('filters deals based on selected customer', () => {
    render(<QuoteForm customers={customers} deals={deals} priceBooks={priceBooks} />);

    // Open modal
    fireEvent.click(screen.getByText('New Quote'));

    // Initially, all deals should be available as options
    expect(screen.getByText('Deal 1 (C1)')).toBeDefined();
    expect(screen.getByText('Deal 3 (C2)')).toBeDefined();

    // Select Customer 1
    const customerSelect = screen.getByLabelText('Customer');
    fireEvent.change(customerSelect, { target: { value: 'c1' } });

    // Now only C1 deals should be visible
    expect(screen.getByText('Deal 1 (C1)')).toBeDefined();
    expect(screen.getByText('Deal 2 (C1)')).toBeDefined();
    expect(screen.queryByText('Deal 3 (C2)')).toBeNull();
  });

  it('clears incompatible deal when customer changes', () => {
    render(<QuoteForm customers={customers} deals={deals} priceBooks={priceBooks} />);
    fireEvent.click(screen.getByText('New Quote'));

    // Select Customer 1
    fireEvent.change(screen.getByLabelText('Customer'), { target: { value: 'c1' } });

    // Select Deal 1
    const dealSelect = screen.getByLabelText('Deal');
    fireEvent.change(dealSelect, { target: { value: 'd1' } });
    expect((dealSelect as HTMLSelectElement).value).toBe('d1');

    // Change to Customer 2
    fireEvent.change(screen.getByLabelText('Customer'), { target: { value: 'c2' } });

    // Deal should be cleared
    expect((dealSelect as HTMLSelectElement).value).toBe('');
  });

  it('displays inline error on failed submission', async () => {
    vi.spyOn(revenueActions, 'createQuoteAction').mockResolvedValue({
      success: false,
      error: 'Customer mismatch for this deal',
    });

    render(<QuoteForm customers={customers} deals={deals} priceBooks={priceBooks} />);
    fireEvent.click(screen.getByText('New Quote'));

    // Select fields
    fireEvent.change(screen.getByLabelText('Customer'), { target: { value: 'c1' } });
    fireEvent.change(screen.getByLabelText('Deal'), { target: { value: 'd1' } });
    fireEvent.change(screen.getByLabelText('Price Book'), { target: { value: 'pb1' } });

    // Submit
    fireEvent.click(screen.getByRole('button', { name: 'Create Quote' }));

    // Verify inline error appears
    await waitFor(() => {
      expect(screen.getByText(/Customer mismatch for this deal/i)).toBeDefined();
    });
  });
});
