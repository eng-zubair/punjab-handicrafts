import { db } from './db';
import { platformSettings, taxRules } from '@shared/schema';

export type TaxItem = {
  productId: string;
  quantity: number;
  price: string;
  taxExempt?: boolean;
  variantTaxRate?: number;
};

type GetSettings = () => Promise<{ taxEnabled: boolean }>;
type GetRules = () => Promise<Array<{ enabled: boolean; exempt: boolean; category?: string | null; province?: string | null; rate: number; priority?: number }>>;

export async function computeTax(
  items: Array<TaxItem>,
  _province: string | undefined,
  _buyerId: string,
  opts?: { getPlatformSettings?: GetSettings; getTaxRules?: GetRules }
): Promise<{ amount: number; breakdown: Array<{ productId: string; rate: number; tax: number }> }> {
  const getPlatformSettings: GetSettings = opts?.getPlatformSettings || (async () => {
    const rows = await db.select().from(platformSettings);
    const enabled = rows.length === 0 ? true : !!rows[0].taxEnabled;
    return { taxEnabled: enabled };
  });
  const getTaxRules: GetRules = opts?.getTaxRules || (async () => {
    const rows = await db.select().from(taxRules);
    return rows as any;
  });

  const settings = await getPlatformSettings();
  if (!settings.taxEnabled) {
    return { amount: 0, breakdown: items.map(it => ({ productId: it.productId, rate: 0, tax: 0 })) };
  }

  const rules = await getTaxRules();
  const general = rules
    .filter(r => r.enabled && !r.exempt)
    .filter(r => !r.category || String(r.category).toLowerCase() === 'general')
    .filter(r => !r.province);
  const sorted = (general.length ? general : rules.filter(r => r.enabled && !r.exempt))
    .sort((a: any, b: any) => (Number(b.priority || 0) - Number(a.priority || 0)));
  const globalRateRaw = sorted.length ? parseFloat(String(sorted[0].rate)) : 0;
  const globalRate = Number.isFinite(globalRateRaw) && globalRateRaw > 0 ? globalRateRaw : 0;

  let total = 0;
  const breakdown: Array<{ productId: string; rate: number; tax: number }> = [];
  for (const it of items) {
    const unit = parseFloat(String(it.price));
    const qty = Number(it.quantity);
    const line = (Number.isFinite(unit) ? unit : 0) * (Number.isFinite(qty) ? qty : 0);
    let rate = typeof it.variantTaxRate === 'number' && Number.isFinite(it.variantTaxRate) && it.variantTaxRate >= 0 ? it.variantTaxRate : globalRate;
    let tax = 0;
    if (!it.taxExempt && line > 0 && rate > 0) {
      tax = (rate / 100) * line;
    }
    total += tax;
    breakdown.push({ productId: it.productId, rate, tax });
  }
  return { amount: parseFloat(total.toFixed(2)), breakdown };
}

