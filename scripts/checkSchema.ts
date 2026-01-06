#!/usr/bin/env tsx
/**
 * Schema verification script
 * Checks if required tables exist in Supabase database
 * 
 * Usage: npm run schema:check
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing environment variables:');
  console.error('   NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '✓' : '✗');
  console.error('   NEXT_PUBLIC_SUPABASE_ANON_KEY:', supabaseAnonKey ? '✓' : '✗');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkTableExists(tableName: string): Promise<boolean> {
  try {
    // Try to query the table with limit 0 (head request)
    // This is the most reliable way to check table existence via PostgREST
    const tableNameWithoutSchema = tableName.replace('public.', '');
    const { error: queryError } = await supabase
      .from(tableNameWithoutSchema)
      .select('*', { count: 'exact', head: true })
      .limit(0);

    if (queryError) {
      // Error code 42P01 means "undefined_table" (PostgreSQL error)
      // PGRST116 means "relation not found" (PostgREST error)
      if (
        queryError.code === '42P01' ||
        queryError.code === 'PGRST116' ||
        queryError.message?.includes('does not exist') ||
        queryError.message?.includes('relation') ||
        queryError.message?.includes('not found')
      ) {
        return false;
      }
      // Other errors might be permissions, but table exists
      // Log for debugging but assume table exists
      console.warn(`⚠️  Unexpected error checking ${tableName}:`, queryError.message);
      return true;
    }

    return true;
  } catch (err: any) {
    // If error is about table not existing, return false
    if (
      err?.code === '42P01' ||
      err?.code === 'PGRST116' ||
      err?.message?.includes('does not exist') ||
      err?.message?.includes('relation') ||
      err?.message?.includes('not found')
    ) {
      return false;
    }
    // For other errors, assume table exists (avoid false positives)
    console.warn(`⚠️  Could not verify ${tableName}:`, err.message);
    return true;
  }
}

async function main() {
  console.log('🔍 Checking database schema...\n');

  const tables = [
    'public.sources',
    'public.entry_sources',
  ];

  const results: { table: string; exists: boolean }[] = [];

  for (const table of tables) {
    const exists = await checkTableExists(table);
    results.push({ table, exists });
    console.log(`${exists ? '✅' : '❌'} ${table}: ${exists ? 'exists' : 'MISSING'}`);
  }

  const missing = results.filter(r => !r.exists);

  if (missing.length > 0) {
    console.log('\n' + '='.repeat(70));
    console.log('⚠️  MISSING TABLES DETECTED');
    console.log('='.repeat(70));
    console.log('\nMissing tables:');
    missing.forEach(({ table }) => {
      console.log(`  - ${table}`);
    });
    console.log('\n📋 Action required:');
    console.log('   Run migration: 021_create_sources_and_entry_sources.sql');
    console.log('   Location: supabase/migrations/021_create_sources_and_entry_sources.sql');
    console.log('   Run in: Supabase SQL Editor\n');
    console.log('='.repeat(70) + '\n');
    process.exit(1);
  } else {
    console.log('\n✅ All required tables exist!\n');
    process.exit(0);
  }
}

main().catch((err) => {
  console.error('❌ Script failed:', err);
  process.exit(1);
});

