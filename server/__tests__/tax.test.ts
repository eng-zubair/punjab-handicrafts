import { describe, it, expect } from 'vitest';
import { computeTax } from '../tax';

const getSettings = async () => ({ taxEnabled: true });
const makeRules = (rate: number) => async () => ([{ enabled: true, exempt: false, category: 'general', province: null, rate, priority: 100 }] as any);

describe('computeTax', () => {
  it('applies global rate for standard item', async () => {
    const res = await computeTax([{ productId: 'p1', quantity: 1, price: '1000' }], undefined, 'u', { getPlatformSettings: getSettings, getTaxRules: makeRules(3) });
    expect(res.amount).toBe(30);
    expect(res.breakdown[0].rate).toBe(3);
  });

  it('uses variant override rate when provided', async () => {
    const res = await computeTax([{ productId: 'p1', quantity: 1, price: '1000', variantTaxRate: 5 }], undefined, 'u', { getPlatformSettings: getSettings, getTaxRules: makeRules(3) });
    expect(res.amount).toBe(50);
    expect(res.breakdown[0].rate).toBe(5);
  });

  it('applies zero tax for tax-exempt items', async () => {
    const res = await computeTax([{ productId: 'p1', quantity: 2, price: '750', taxExempt: true }], undefined, 'u', { getPlatformSettings: getSettings, getTaxRules: makeRules(3) });
    expect(res.amount).toBe(0);
    expect(res.breakdown[0].tax).toBe(0);
  });

  it('handles quantity changes accurately', async () => {
    const res = await computeTax([{ productId: 'p1', quantity: 3, price: '200' }], undefined, 'u', { getPlatformSettings: getSettings, getTaxRules: makeRules(3) });
    expect(res.amount).toBe(18);
  });

  it('handles zero-value items gracefully', async () => {
    const res1 = await computeTax([{ productId: 'p1', quantity: 0, price: '1000' }], undefined, 'u', { getPlatformSettings: getSettings, getTaxRules: makeRules(3) });
    const res2 = await computeTax([{ productId: 'p1', quantity: 1, price: '0' }], undefined, 'u', { getPlatformSettings: getSettings, getTaxRules: makeRules(3) });
    expect(res1.amount).toBe(0);
    expect(res2.amount).toBe(0);
  });

  it('rounds taxes to two decimals', async () => {
    const res = await computeTax([{ productId: 'p1', quantity: 1, price: '333.33', variantTaxRate: 7.5 }], undefined, 'u', { getPlatformSettings: getSettings, getTaxRules: makeRules(0) });
    expect(res.amount).toBe(25.0);
  });
});

