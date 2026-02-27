/**
 * Super Admin Seeder Script
 * 
 * Usage:
 *   bun run src/scripts/seed-super-admin.ts
 * 
 * Environment variables:
 *   SUPER_ADMIN_EMAIL - Email for the super admin (default: admin@eatnbill.com)
 *   SUPER_ADMIN_PASSWORD - Password for the super admin (default: changeme123)
 *   SUPER_ADMIN_NAME - Name for the super admin (default: Super Admin)
 */

import { prisma } from '../utils/prisma';
import { hash } from 'bcrypt';

const SALT_ROUNDS = 12;

async function seedSuperAdmin() {
  const email = process.env.SUPER_ADMIN_EMAIL || 'admin@eatnbill.com';
  const password = process.env.SUPER_ADMIN_PASSWORD || '123456789';
  const name = process.env.SUPER_ADMIN_NAME || 'Super Admin';

  console.log('🌱 Seeding super admin...');
  console.log(`   Email: ${email}`);

  try {
    // Check if admin already exists
    const existingAdmin = await prisma.adminUser.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (existingAdmin) {
      console.log('⚠️  Super admin already exists, updating password...');
      
      // Update password
      const passwordHash = await hash(password, SALT_ROUNDS);
      
      await prisma.adminUser.update({
        where: { id: existingAdmin.id },
        data: {
          password_hash: passwordHash,
          name,
          is_active: true,
          updated_at: new Date(),
        },
      });
      
      console.log('✅ Super admin password updated successfully!');
      return;
    }

    // Create new admin
    const passwordHash = await hash(password, SALT_ROUNDS);
    
    const admin = await prisma.adminUser.create({
      data: {
        email: email.toLowerCase(),
        name,
        password_hash: passwordHash,
        supabase_id: `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        is_active: true,
      },
    });

    console.log('✅ Super admin created successfully!');
    console.log(`   ID: ${admin.id}`);
    console.log(`   Email: ${admin.email}`);
    console.log(`   Name: ${admin.name}`);
    console.log(`   Name: ${admin.password_hash ? '********' : 'No password set'}`);
    console.log('');
    console.log('⚠️  IMPORTANT: Please change the default password after first login!');
    
  } catch (error) {
    console.error('❌ Failed to seed super admin:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the seeder
seedSuperAdmin();
