import React from 'react';
import { render, screen } from '@testing-library/react';
import ProductsPage from '../page';
import { CurrencyProvider } from '@/contexts/currency-context';

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
  }),
}));

describe('ProductsPage', () => {
  it('renders the products page with a list of products', () => {
    const mockRates = { EUR: 0.9, GBP: 0.8 };

    render(
      <CurrencyProvider rates={mockRates}>
        <ProductsPage />
      </CurrencyProvider>
    );

    // Check for the main heading
    expect(screen.getByRole('heading', { name: /products/i })).toBeInTheDocument();

    // Check if product cards are rendered
    const productCards = screen.getAllByText(/Contact Seller/i);
    expect(productCards.length).toBeGreaterThan(0);

    // Check for a specific product
    expect(screen.getByText('Industrial Grade Widgets')).toBeInTheDocument();
  });
});
