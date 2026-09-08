import { describe, it, expect } from 'vitest';
import { Prisma } from '@prisma/client';
import { RevenueService } from '../../src/modules/revenue/revenue.service';
import { serializeDecimal } from '../../src/lib/utils/decimal';

describe('Financial Precision and Decimal Handling', () => {
  it('should correctly handle decimal arithmetic without floating point errors', () => {
    const a = new Prisma.Decimal('0.1');
    const b = new Prisma.Decimal('0.2');
    const sum = a.add(b).toString();
    expect(sum).toBe('0.3');
  });

  it('should correctly round HALF_UP to 4 decimal places for line discounts', () => {
    // line subtotal = 100
    // discount rate = 15.5555%
    // itemDiscountTotal = 15.5555
    const itemSubtotal = new Prisma.Decimal('100.0000');
    const discountDec = new Prisma.Decimal('15.5555');
    const discountRate = discountDec.div(100);
    const itemDiscountTotal = itemSubtotal.mul(discountRate).toDecimalPlaces(4, Prisma.Decimal.ROUND_HALF_UP);
    
    expect(itemDiscountTotal.toString()).toBe('15.5555');
  });

  it('should serialize Prisma.Decimal values safely', () => {
    const obj = {
      subtotal: new Prisma.Decimal('250.5000'),
      nested: {
        amount: new Prisma.Decimal('100.1234')
      },
      tags: ['a', 'b']
    };

    const serialized = serializeDecimal(obj);
    expect(serialized.subtotal).toBe('250.5');
    expect(serialized.nested.amount).toBe('100.1234');
    expect(serialized.tags).toEqual(['a', 'b']);
  });
});
