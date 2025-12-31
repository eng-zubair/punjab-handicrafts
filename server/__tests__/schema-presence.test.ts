import 'dotenv/config';
import { describe, it, expect } from 'vitest';
import { pool } from '../db';

const requiredTables = [
  'sessions',
  'users',
  'stores',
  'products',
  'product_variants',
  'orders',
  'order_items',
  'categories',
  'product_categories',
  'messages',
  'subscriptions',
  'transactions',
  'payouts',
  'product_groups',
  'product_group_members',
  'offers',
  'reviews',
  'review_media',
  'review_votes',
  'newsletter_subscriptions',
  'wishlist_items',
  'vendor_suborders',
  'platform_settings',
  'tax_rules',
  'shipping_rate_rules',
  'config_audits',
  'order_audits',
  'sanatzar_centers',
  'training_program_templates',
  'training_programs',
  'training_applications',
  'registered_artisans',
  'training_centers',
  'trainee_applications',
  'trainee_progress',
  'artisan_work',
  'survey_questions',
];

async function getPublicTables(): Promise<Set<string>> {
  const res = await pool.query(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_type = 'BASE TABLE' AND table_schema = 'public'
  `);
  return new Set(res.rows.map((r: any) => r.table_name));
}

describe('Schema presence', () => {
  it('all required tables exist in public schema', async () => {
    const tables = await getPublicTables();
    const missing = requiredTables.filter(t => !tables.has(t));
    if (missing.length > 0) {
      console.log('Missing tables:', missing);
    }
    expect(missing).toEqual([]);
  });
});
