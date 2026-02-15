import { Router } from 'express';
import { authMiddleware } from '../../middlewares/auth.middleware';
import { rateLimiters } from '../../middlewares';
import { tenantMiddleware } from '../../middlewares/tenant.middleware';
import {
  createHallController,
  createTableController,
  bulkCreateTablesController,
  deleteHallController,
  deleteTableController,
  generateTableQrController,
  regenerateAllQrController,
  setupRestaurantController,
  getProfileController,
  getSettingsController,
  getThemeController,
  listHallsController,
  listTablesController,
  updateHallController,
  updateProfileController,
  updateSlugController,
  updateSettingsController,
  updateTableController,
  updateThemeController,
  getDashboardController,
} from './controller';
import * as staffService from './staff.service';
import { z } from 'zod';
import { validateBody, validateParams } from '../../middlewares/validation.middleware';
import { upload } from '../../middlewares/upload.middleware';
import { AppError } from '../../middlewares/error.middleware';
import {
  uploadLogoController,
} from './controller';

// Staff schemas
const createStaffSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  role: z.enum(['MANAGER', 'WAITER']),
  email: z.string().email('Valid email is required').optional(),
  phone: z.string().optional(),
  password: z.string().min(8, 'Password must be at least 8 characters').optional(),
  address: z.string().optional(),
  salary: z.string().optional(),
  shiftDetail: z.string().optional(),
}).superRefine((data, ctx) => {
  if (data.role === 'MANAGER') {
    if (!data.email) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Email is required for managers', path: ['email'] });
    }
    if (!data.phone) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Phone is required for managers', path: ['phone'] });
    }
    if (!data.password) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Password is required for managers', path: ['password'] });
    }
  }
});

const updateStaffSchema = z.object({
  name: z.string().optional(),
  role: z.enum(['MANAGER', 'WAITER']).optional(),
  email: z.string().email('Valid email is required').optional(),
  phone: z.string().optional(),
  password: z.string().min(8, 'Password must be at least 8 characters').optional(),
  address: z.string().optional(),
  salary: z.string().optional(),
  shiftDetail: z.string().optional(),
  isActive: z.boolean().optional(),
});

const sharedLoginSchema = z.object({
  email: z.string().min(1, 'Valid email or ID is required'), // Relaxed validation
  password: z.string().min(4, 'Password must be at least 4 characters').optional(),
});

const staffIdParamSchema = z.object({
  id: z.string().uuid('Invalid staff id'),
});

export function restaurantRoutes() {
  const router = Router();

  router.use(rateLimiters.default);
  router.use(authMiddleware);
  router.use(tenantMiddleware);

  const canManageStaff = (req: any) =>
    req.user?.restaurantRole === 'OWNER' ||
    req.user?.restaurantRole === 'MANAGER' ||
    req.user?.role === 'OWNER' ||
    req.user?.role === 'MANAGER';

  // Core Restaurant Routes
  router.get('/dashboard', getDashboardController);
  router.post('/setup', setupRestaurantController);
  router.get('/profile', getProfileController);
  router.patch('/profile', updateProfileController);
  router.patch('/slug', updateSlugController);
  router.post('/profile/logo', upload.single('logo'), uploadLogoController);
  router.get('/settings', getSettingsController);
  router.patch('/settings', updateSettingsController);
  router.get('/theme', getThemeController);
  router.patch('/theme', updateThemeController);

  // ========================================
  // STAFF MANAGEMENT ROUTES
  // ========================================

  // List all staff
  router.get('/staff', async (req, res, next) => {
    try {
      if (!canManageStaff(req)) {
        throw new AppError('FORBIDDEN', 'Only owner/manager can manage staff', 403);
      }
      const { tenantId, restaurantId } = req as any;
      const staff = await staffService.listStaff(tenantId, restaurantId);
      res.json(staff);
    } catch (error) {
      next(error);
    }
  });

  // Create new staff (manager/waiter)
  router.post('/staff', validateBody(createStaffSchema), async (req, res, next) => {
    try {
      if (!canManageStaff(req)) {
        throw new AppError('FORBIDDEN', 'Only owner/manager can create staff', 403);
      }
      const { tenantId, restaurantId } = req as any;
      const staff = await staffService.createStaff(tenantId, restaurantId, req.body);
      res.status(201).json(staff);
    } catch (error) {
      next(error);
    }
  });

  // Backward-compatible alias
  router.post('/staff/add', validateBody(createStaffSchema), async (req, res, next) => {
    try {
      if (!canManageStaff(req)) {
        throw new AppError('FORBIDDEN', 'Only owner/manager can create staff', 403);
      }
      const { tenantId, restaurantId } = req as any;
      const staff = await staffService.createStaff(tenantId, restaurantId, req.body);
      res.status(201).json(staff);
    } catch (error) {
      next(error);
    }
  });

  // Get shared login details
  router.get('/staff/shared-login', async (req, res, next) => {
    try {
      if (!canManageStaff(req)) {
        throw new AppError('FORBIDDEN', 'Only owner/manager can manage shared login', 403);
      }
      const { restaurantId } = req as any;
      const details = await staffService.getSharedLoginDetails(restaurantId);
      res.json(details);
    } catch (error) {
      next(error);
    }
  });

  // Setup/Update shared login
  router.post('/staff/shared-login', validateBody(sharedLoginSchema), async (req, res, next) => {
    try {
      if (!canManageStaff(req)) {
        throw new AppError('FORBIDDEN', 'Only owner/manager can manage shared login', 403);
      }
      const { restaurantId } = req as any;
      const { email, password } = req.body as { email: string; password?: string };
      const result = await staffService.updateSharedLoginCredentials(restaurantId, email, password);
      res.json(result);
    } catch (error) {
      next(error);
    }
  });

  // Get staff details
  router.get('/staff/:id', validateParams(staffIdParamSchema), async (req, res, next) => {
    try {
      if (!canManageStaff(req)) {
        throw new AppError('FORBIDDEN', 'Only owner/manager can view staff', 403);
      }
      const { tenantId } = req as any;
      const staff = await staffService.getStaffDetails(tenantId, String(req.params.id));
      res.json(staff);
    } catch (error) {
      next(error);
    }
  });

  // Update staff
  router.patch(
    '/staff/:id',
    validateParams(staffIdParamSchema),
    validateBody(updateStaffSchema),
    async (req, res, next) => {
    try {
      if (!canManageStaff(req)) {
        throw new AppError('FORBIDDEN', 'Only owner/manager can update staff', 403);
      }
      const { tenantId } = req as any;
      const staff = await staffService.updateStaff(tenantId, String(req.params.id), req.body);
      res.json(staff);
    } catch (error) {
      next(error);
    }
  });

  // Toggle staff active status
  router.patch('/staff/:id/toggle', validateParams(staffIdParamSchema), async (req, res, next) => {
    try {
      if (!canManageStaff(req)) {
        throw new AppError('FORBIDDEN', 'Only owner/manager can toggle staff status', 403);
      }
      const { tenantId } = req as any;
      const result = await staffService.toggleStaffStatus(tenantId, String(req.params.id));
      res.json(result);
    } catch (error) {
      next(error);
    }
  });

  // Delete staff
  router.delete('/staff/:id', validateParams(staffIdParamSchema), async (req, res, next) => {
    try {
      if (!canManageStaff(req)) {
        throw new AppError('FORBIDDEN', 'Only owner/manager can delete staff', 403);
      }
      const { tenantId } = req as any;
      const result = await staffService.deleteStaff(tenantId, String(req.params.id));
      res.json(result);
    } catch (error) {
      next(error);
    }
  });

  // Halls
  router.get('/halls', listHallsController);
  router.post('/halls', createHallController);
  router.patch('/halls/:id', updateHallController);
  router.delete('/halls/:id', deleteHallController);

  // Tables
  router.get('/tables', listTablesController);
  router.post('/tables', createTableController);
  router.post('/tables/bulk', bulkCreateTablesController);
  router.patch('/tables/:id', updateTableController);
  router.delete('/tables/:id', deleteTableController);

  // QR code generation
  router.get('/tables/:id/qrcode', generateTableQrController);
  router.post('/tables/qrcodes/regenerate', regenerateAllQrController);

  return router;
}
