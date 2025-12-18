import { db } from "../db";
import {
    promotions, promotionRules, promotionActions,
    type Promotion, type PromotionRule, type PromotionAction
} from "@shared/schema";
import { eq, and, desc, gte, lte, or } from "drizzle-orm";

interface CartItem {
    productId: string;
    quantity: number;
    price: number;
    categoryId?: string;
}

interface CartContext {
    items: CartItem[];
    total: number; // Subtotal before discounts
    shippingCost?: number;
    userId?: string;
    userEmail?: string;
    usageCount?: number; // How many times user used this? (Fetched externally)
}

interface DiscountResult {
    promotionId: string;
    amount: number;
    message?: string;
    freeShipping?: boolean;
}

export class PromotionEngine {

    /**
     * Fetches all active promotions that *could* apply valid now.
     */
    async getActivePromotions(): Promise<Promotion[]> {
        const now = new Date();
        return db.select()
            .from(promotions)
            .where(and(
                eq(promotions.status, 'active'),
                or(lte(promotions.startAt, now), eq(promotions.startAt, null as any)), // null checks might need explicit isNull() if generic
                or(gte(promotions.endAt, now), eq(promotions.endAt, null as any))
            ))
            .orderBy(desc(promotions.priority)); // Higher priority first
    }

    /**
     * Loads rules and actions for a promotion.
     */
    async loadPromotionDetails(promotionId: string) {
        const [rules, actions] = await Promise.all([
            db.select().from(promotionRules).where(eq(promotionRules.promotionId, promotionId)),
            db.select().from(promotionActions).where(eq(promotionActions.promotionId, promotionId))
        ]);
        return { rules, actions };
    }

    /**
     * Validates if a promotion applies to the current cart context.
     */
    validateRules(rules: PromotionRule[], context: CartContext): boolean {
        if (rules.length === 0) return true; // No rules = applies to everyone (or implicit rules)

        // ALL rules must pass (AND logic is default) 
        // For more complex OR logic, we'd need a 'group' field in rules
        for (const rule of rules) {
            if (!this.evaluateRule(rule, context)) {
                return false;
            }
        }
        return true;
    }

    private evaluateRule(rule: PromotionRule, context: CartContext): boolean {
        const { type, operator, value } = rule;
        const targetValue = value as any; // Cast jsonb to usable type

        switch (type) {
            case 'min_order_value':
                return this.compare(context.total, operator, Number(targetValue));

            case 'min_quantity':
                const totalQty = context.items.reduce((sum, item) => sum + item.quantity, 0);
                return this.compare(totalQty, operator, Number(targetValue));

            case 'specific_product':
                // Check if ANY item in cart matches the product
                // Value might be single prodId or array
                const productIds = Array.isArray(targetValue) ? targetValue : [targetValue];
                return context.items.some(item => productIds.includes(item.productId));

            case 'customer_group':
                // Requires user info lookup (handled outside or passed in context)
                // Placeholder
                return true;

            default:
                return false;
        }
    }

    private compare(actual: number, operator: string, target: number): boolean {
        switch (operator) {
            case 'eq': return actual === target;
            case 'gt': return actual > target;
            case 'gte': return actual >= target;
            case 'lt': return actual < target;
            case 'lte': return actual <= target;
            default: return false;
        }
    }

    /**
     * Calculates the discount calculation based on actions.
     */
    calculateDiscount(promotion: Promotion, actions: PromotionAction[], context: CartContext): DiscountResult {
        let totalDiscount = 0;
        let freeShipping = false;

        // Use legacy fallback if no actions defined
        if (actions.length === 0) {
            // Legacy logic mapping
            if (promotion.type === 'percentage') {
                totalDiscount = context.total * (Number(promotion.value) / 100);
            } else if (promotion.type === 'fixed') {
                totalDiscount = Number(promotion.value);
            }
        } else {
            for (const action of actions) {
                if (action.type === 'percentage_discount') {
                    const pct = Number(action.value);
                    if (action.target === 'order_total') {
                        totalDiscount += context.total * (pct / 100);
                    }
                } else if (action.type === 'fixed_amount') {
                    totalDiscount += Number(action.value);
                } else if (action.type === 'free_shipping') {
                    freeShipping = true;
                    totalDiscount += (context.shippingCost || 0);
                }
            }
        }

        // Ensure we don't discount more than the total
        if (totalDiscount > context.total) {
            totalDiscount = context.total;
        }

        return {
            promotionId: promotion.id,
            amount: parseFloat(totalDiscount.toFixed(2)),
            freeShipping
        };
    }

    /**
     * Main entry point: Apply best promotions to a cart.
     */
    async applyPromotions(context: CartContext): Promise<{
        applied: DiscountResult[];
        totalDiscount: number;
        finalTotal: number
    }> {
        const activePromotions = await this.getActivePromotions();
        const applied: DiscountResult[] = [];
        let runningTotal = context.total;

        for (const promo of activePromotions) {
            // 1. Check Limits (Global/User) - skipped for now (needs DB lookup)

            // 2. Load and Validate Rules
            const { rules, actions } = await this.loadPromotionDetails(promo.id);

            const isValid = this.validateRules(rules, context);
            if (!isValid) continue;

            // 3. Calculate Potential Discount
            const result = this.calculateDiscount(promo, actions, { ...context, total: runningTotal });

            if (result.amount > 0 || result.freeShipping) {
                applied.push(result);
                runningTotal -= result.amount;

                // 4. Stop if not stackable
                if (!promo.stackable) {
                    break;
                }
            }
        }

        // Ensure final total >= 0
        const finalTotal = Math.max(0, runningTotal);
        const totalDiscount = context.total - finalTotal;

        return {
            applied,
            totalDiscount: parseFloat(totalDiscount.toFixed(2)),
            finalTotal: parseFloat(finalTotal.toFixed(2))
        };
    }
}

export const promotionEngine = new PromotionEngine();
