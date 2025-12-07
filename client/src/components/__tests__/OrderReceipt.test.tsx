import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import OrderReceipt from '@/components/OrderReceipt';

describe('OrderReceipt', () => {
  const mockReceipt = {
    orderId: '12345678-90ab-cdef-1234-567890abcdef',
    receiptNumber: 'PH-20231026001',
    createdAt: new Date().toISOString(),
    paymentMethod: 'cod',
    shippingMethod: 'standard',
    estimatedDelivery: '3-7 business days',
    buyer: { firstName: 'Test', lastName: 'User', email: 'test@example.com', phone: '123456789' },
    shippingAddress: '123 Street, City',
    items: [
      { productTitle: 'Test Product', productImage: null, storeName: 's1', quantity: 1, unitPrice: '1000.00', lineTotal: '1000.00' }
    ],
    subtotal: '1000.00',
    shippingCost: '0.00',
    taxAmount: '0.00',
    total: '1000.00',
  };

  it('displays truncated order number', () => {
    render(<OrderReceipt receipt={mockReceipt} />);
    expect(screen.getByText('12345678')).toBeDefined();
    expect(screen.queryByText('12345678-90ab-cdef-1234-567890abcdef')).toBeNull();
  });

  it('displays receipt number', () => {
    render(<OrderReceipt receipt={mockReceipt} />);
    const elements = screen.getAllByText('PH-20231026001');
    expect(elements.length).toBeGreaterThan(0);
  });
});
