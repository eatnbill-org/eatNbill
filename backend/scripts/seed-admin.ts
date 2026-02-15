/**
 * Seed Super Admin User
 * 
 * This script creates the first SUPER_ADMIN user in the system.
 * Run once after Prisma migration to bootstrap admin access.
 * 
 * Prerequisites:
 * 1. Create a user in Supabase Auth first (via dashboard or API)
 * 2. Copy the Supabase user ID (UUID)
 * 3. Run: bun run scripts/seed-admin.ts <supabase-id> <email>
 * 
 * Example:
 *   bun run scripts/seed-admin.ts "abc123-uuid" "admin@restobilo.com"
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seedSuperAdmin() {
  const args = process.argv.slice(2);
  
  if (args.length < 2) {
    console.error('Usage: bun run scripts/seed-admin.ts <supabase-id> <email>');
    console.error('');
    console.error('Steps:');
    console.error('1. Create a user in Supabase Auth dashboard');
    console.error('2. Copy the user UUID from Supabase');
    console.error('3. Run this script with the UUID and email');
    process.exit(1);
  }

  const [supabaseId, email] = args;

  try {
    // Check if admin already exists
    const existing = await prisma.adminUser.findFirst({
      where: { 
        OR: [
          { supabase_id: supabaseId },
          { email: email }
        ]
      }
    });

    if (existing) {
      console.log('⚠️  Admin user already exists:', existing.email);
      process.exit(0);
    }

    // Create admin user
    const admin = await prisma.adminUser.create({
      data: {
        supabase_id: supabaseId!,
        email: email!,
        name: 'Super Admin',
        is_active: true,
      }
    });

    console.log('✅ Super Admin created successfully!');
    console.log('');
    console.log('Admin ID:', admin.id);
    console.log('Email:', admin.email);
    console.log('Supabase ID:', admin.supabase_id);
    console.log('');
    console.log('You can now use this account to access /api/v1/admin/* endpoints');

  } catch (error) {
    console.error('❌ Failed to create Super Admin:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

seedSuperAdmin();
