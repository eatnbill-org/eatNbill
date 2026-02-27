import { Router } from 'express';
import { authRoutes } from './modules/auth/routes';
import { productRoutes, publicProductRoutes } from './modules/products/routes';
import { categoryRoutes, publicCategoryRoutes } from './modules/categories/routes';
import { orderRoutes, publicOrderRoutes } from './modules/orders/routes';
import { kdsRoutes } from './modules/kds/routes';
import { restaurantRoutes } from './modules/restaurants/routes';
import { customerRoutes } from './modules/customers/routes';
import { superAdminRoutes } from './modules/super-admin/routes';
import { superAdminAuthRoutes } from './modules/super-admin/auth/routes';

export function registerRoutes(app: Router) {
  // Root endpoint
  app.get('/', (_req, res) => {
    res.json({ message: 'Welcome to EatnBill API', version: '1.0.0' });
  });

  // API routes (tenant-scoped)
  app.use('/api/v1/auth', authRoutes());
  app.use('/api/v1/products', productRoutes());
  app.use('/api/v1/categories', categoryRoutes());
  app.use('/api/v1/orders', orderRoutes());
  app.use('/api/v1/customers', customerRoutes());
  app.use('/api/v1/public', publicProductRoutes());
  app.use('/api/v1/public', publicCategoryRoutes());
  app.use('/api/v1/public', publicOrderRoutes());

  // Restaurant module (single source of truth)
  app.use('/api/v1/restaurant', restaurantRoutes());

  // KDS routes (Kitchen Display System - Supabase Realtime)
  app.use('/api/v1/kds', kdsRoutes());

  // Super Admin routes (platform-level, NOT tenant-scoped)
  app.use('/api/v1/super-admin/auth', superAdminAuthRoutes());
  app.use('/api/v1/super-admin', superAdminRoutes());
}
