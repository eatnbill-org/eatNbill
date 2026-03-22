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
  deleteTableQRCodesController,
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
  createTableReservationController,
  deleteTableReservationController,
  listTableAvailabilityController,
  listTableReservationsController,
  listReservationAlertsController,
  updateTableReservationController,
  updateTableStatusController,
  updateThemeController,
  getDashboardController,
} from './controller';
import { getStaffPerformanceAnalytics } from './repository';
import { prisma } from '../../utils/prisma';
import {
  closeDayEndController,
  createExportJobController,
  createOutletController,
  downloadExportJobController,
  generateEInvoiceController,
  getDayEndController,
  getExportJobController,
  getGstInvoiceController,
  getMyPreferencesController,
  listDayEndController,
  listExportJobsController,
  listOutletsController,
  unlockDayEndController,
  updateMyPreferencesController,
  updateOutletController,
  validateGstInvoiceController,
} from './enterprise.controller';
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

  // Analytics
  router.get('/analytics/staff', async (req: any, res: any, next: any) => {
    try {
      if (!canManageStaff(req)) {
        return res.status(403).json({ error: 'Forbidden' });
      }
      const restaurantId: string = req.user?.restaurantId;
      const { from_date, to_date, outlet_id } = req.query as Record<string, string>;
      const data = await getStaffPerformanceAnalytics(restaurantId, { from_date, to_date, outlet_id });
      res.json({ data });
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
  router.get('/tables/availability', listTableAvailabilityController);
  router.post('/tables', createTableController);
  router.post('/tables/bulk', bulkCreateTablesController);
  router.patch('/tables/:id', updateTableController);
  router.patch('/tables/:id/status', updateTableStatusController);
  router.delete('/tables/:id', deleteTableController);

  // Table reservations
  router.get('/table-reservations', listTableReservationsController);
  router.post('/table-reservations', createTableReservationController);
  router.patch('/table-reservations/:id', updateTableReservationController);
  router.delete('/table-reservations/:id', deleteTableReservationController);
  router.get('/table-reservations/alerts', listReservationAlertsController);

  // Outlets + language preferences
  router.get('/outlets', listOutletsController);
  router.post('/outlets', createOutletController);
  router.patch('/outlets/:id', updateOutletController);
  router.get('/preferences/me', getMyPreferencesController);
  router.patch('/preferences/me', updateMyPreferencesController);

  // Day-end reconciliation
  router.post('/day-end/close', closeDayEndController);
  router.get('/day-end', listDayEndController);
  router.get('/day-end/:id', getDayEndController);
  router.post('/day-end/:id/unlock', unlockDayEndController);

  // Export jobs
  router.post('/exports/jobs', createExportJobController);
  router.get('/exports/jobs', listExportJobsController);
  router.get('/exports/jobs/:id', getExportJobController);
  router.get('/exports/jobs/:id/download', downloadExportJobController);

  // GST + e-invoice
  router.post('/invoices/:orderId/validate-gst', validateGstInvoiceController);
  router.get('/invoices/:orderId', getGstInvoiceController);
  router.post('/invoices/:orderId/einvoice/generate', generateEInvoiceController);

  // ========================================
  // WAITLIST ROUTES
  // ========================================

  router.get('/waitlist', async (req: any, res: any, next: any) => {
    try {
      const restaurantId: string = req.user?.restaurantId;
      const { status } = req.query as { status?: string };
      const where: any = { restaurant_id: restaurantId };
      if (status) where.status = status;
      else where.status = { in: ['WAITING', 'NOTIFIED'] };
      const entries = await prisma.tableWaitlist.findMany({
        where,
        orderBy: { joined_at: 'asc' },
      });
      res.json({ data: entries });
    } catch (err) { next(err); }
  });

  router.post('/waitlist', async (req: any, res: any, next: any) => {
    try {
      const restaurantId: string = req.user?.restaurantId;
      const tenantId: string = req.user?.tenantId;
      const { customer_name, customer_phone, party_size, notes, estimated_wait_minutes, outlet_id } = req.body;
      const entry = await prisma.tableWaitlist.create({
        data: {
          tenant_id: tenantId,
          restaurant_id: restaurantId,
          outlet_id: outlet_id || null,
          customer_name,
          customer_phone: customer_phone || null,
          party_size: Number(party_size) || 1,
          notes: notes || null,
          estimated_wait_minutes: estimated_wait_minutes ? Number(estimated_wait_minutes) : null,
        },
      });
      res.status(201).json({ data: entry });
    } catch (err) { next(err); }
  });

  router.patch('/waitlist/:waitlistId', async (req: any, res: any, next: any) => {
    try {
      const restaurantId: string = req.user?.restaurantId;
      const { waitlistId } = req.params;
      const { status, estimated_wait_minutes, notes } = req.body;
      const updateData: any = {};
      if (status) {
        updateData.status = status;
        if (status === 'NOTIFIED') updateData.notified_at = new Date();
        if (status === 'SEATED') updateData.seated_at = new Date();
      }
      if (estimated_wait_minutes !== undefined) updateData.estimated_wait_minutes = Number(estimated_wait_minutes);
      if (notes !== undefined) updateData.notes = notes;
      const entry = await prisma.tableWaitlist.update({
        where: { id: waitlistId, restaurant_id: restaurantId },
        data: updateData,
      });
      res.json({ data: entry });
    } catch (err) { next(err); }
  });

  router.delete('/waitlist/:waitlistId', async (req: any, res: any, next: any) => {
    try {
      const restaurantId: string = req.user?.restaurantId;
      const { waitlistId } = req.params;
      await prisma.tableWaitlist.delete({ where: { id: waitlistId, restaurant_id: restaurantId } });
      res.json({ success: true });
    } catch (err) { next(err); }
  });

  // QR code generation
  router.get('/tables/:id/qrcode', generateTableQrController);
  router.post('/tables/qrcodes/regenerate', regenerateAllQrController);
  router.post('/tables/qrcodes/delete', deleteTableQRCodesController);

  // ========================================
  // PRODUCT MODIFIER GROUP ROUTES
  // ========================================

  // GET /products/:productId/modifiers — list modifier groups with options
  router.get('/products/:productId/modifiers', async (req: any, res: any, next: any) => {
    try {
      const restaurantId: string = req.user?.restaurantId;
      const { productId } = req.params;
      const groups = await prisma.productModifierGroup.findMany({
        where: { product_id: productId, restaurant_id: restaurantId },
        include: { options: { orderBy: { sort_order: 'asc' } } },
        orderBy: { sort_order: 'asc' },
      });
      res.json({ data: groups });
    } catch (err) { next(err); }
  });

  // POST /products/:productId/modifiers — create a modifier group
  router.post('/products/:productId/modifiers', async (req: any, res: any, next: any) => {
    try {
      if (!canManageStaff(req)) throw new AppError('FORBIDDEN', 'Only owner/manager can manage modifiers', 403);
      const restaurantId: string = req.user?.restaurantId;
      const { productId } = req.params;
      const { name, is_required, min_select, max_select, sort_order, options } = req.body;
      const group = await prisma.productModifierGroup.create({
        data: {
          restaurant_id: restaurantId,
          product_id: productId,
          name,
          is_required: is_required ?? false,
          min_select: min_select ?? 0,
          max_select: max_select ?? 1,
          sort_order: sort_order ?? 0,
          options: options?.length ? {
            create: options.map((o: any, idx: number) => ({
              name: o.name,
              price_delta: o.price_delta ?? 0,
              is_default: o.is_default ?? false,
              sort_order: o.sort_order ?? idx,
            })),
          } : undefined,
        },
        include: { options: { orderBy: { sort_order: 'asc' } } },
      });
      res.status(201).json({ data: group });
    } catch (err) { next(err); }
  });

  // PATCH /products/:productId/modifiers/:groupId — update a modifier group
  router.patch('/products/:productId/modifiers/:groupId', async (req: any, res: any, next: any) => {
    try {
      if (!canManageStaff(req)) throw new AppError('FORBIDDEN', 'Only owner/manager can manage modifiers', 403);
      const restaurantId: string = req.user?.restaurantId;
      const { groupId } = req.params;
      const { name, is_required, min_select, max_select, sort_order } = req.body;
      const group = await prisma.productModifierGroup.update({
        where: { id: groupId, restaurant_id: restaurantId },
        data: { name, is_required, min_select, max_select, sort_order },
        include: { options: { orderBy: { sort_order: 'asc' } } },
      });
      res.json({ data: group });
    } catch (err) { next(err); }
  });

  // DELETE /products/:productId/modifiers/:groupId
  router.delete('/products/:productId/modifiers/:groupId', async (req: any, res: any, next: any) => {
    try {
      if (!canManageStaff(req)) throw new AppError('FORBIDDEN', 'Only owner/manager can manage modifiers', 403);
      const restaurantId: string = req.user?.restaurantId;
      const { groupId } = req.params;
      await prisma.productModifierGroup.delete({ where: { id: groupId, restaurant_id: restaurantId } });
      res.json({ success: true });
    } catch (err) { next(err); }
  });

  // POST /products/:productId/modifiers/:groupId/options — add an option
  router.post('/products/:productId/modifiers/:groupId/options', async (req: any, res: any, next: any) => {
    try {
      if (!canManageStaff(req)) throw new AppError('FORBIDDEN', 'Only owner/manager can manage modifiers', 403);
      const restaurantId: string = req.user?.restaurantId;
      const { productId, groupId } = req.params;
      // Verify group belongs to this restaurant
      const group = await prisma.productModifierGroup.findFirst({ where: { id: groupId, restaurant_id: restaurantId, product_id: productId } });
      if (!group) throw new AppError('NOT_FOUND', 'Modifier group not found', 404);
      const { name, price_delta, is_default, sort_order } = req.body;
      const option = await prisma.productModifierOption.create({
        data: { group_id: groupId, name, price_delta: price_delta ?? 0, is_default: is_default ?? false, sort_order: sort_order ?? 0 },
      });
      res.status(201).json({ data: option });
    } catch (err) { next(err); }
  });

  // PATCH /products/:productId/modifiers/:groupId/options/:optionId
  router.patch('/products/:productId/modifiers/:groupId/options/:optionId', async (req: any, res: any, next: any) => {
    try {
      if (!canManageStaff(req)) throw new AppError('FORBIDDEN', 'Only owner/manager can manage modifiers', 403);
      const { optionId } = req.params;
      const { name, price_delta, is_default, is_active, sort_order } = req.body;
      const option = await prisma.productModifierOption.update({
        where: { id: optionId },
        data: { name, price_delta, is_default, is_active, sort_order },
      });
      res.json({ data: option });
    } catch (err) { next(err); }
  });

  // DELETE /products/:productId/modifiers/:groupId/options/:optionId
  router.delete('/products/:productId/modifiers/:groupId/options/:optionId', async (req: any, res: any, next: any) => {
    try {
      if (!canManageStaff(req)) throw new AppError('FORBIDDEN', 'Only owner/manager can manage modifiers', 403);
      const { optionId } = req.params;
      await prisma.productModifierOption.delete({ where: { id: optionId } });
      res.json({ success: true });
    } catch (err) { next(err); }
  });

  // ========================================
  // VOUCHER / DISCOUNT CODE ROUTES
  // ========================================

  const canManageVouchers = (req: any) =>
    req.user?.restaurantRole === 'OWNER' || req.user?.role === 'OWNER' ||
    req.user?.restaurantRole === 'MANAGER' || req.user?.role === 'MANAGER';

  router.get('/vouchers', async (req: any, res: any, next: any) => {
    try {
      const restaurantId: string = req.user?.restaurantId;
      const vouchers = await prisma.voucherCode.findMany({
        where: { restaurant_id: restaurantId },
        orderBy: { created_at: 'desc' },
      });
      res.json({ data: vouchers });
    } catch (err) { next(err); }
  });

  router.post('/vouchers', async (req: any, res: any, next: any) => {
    try {
      if (!canManageVouchers(req)) throw new AppError('FORBIDDEN', 'Only owner/manager can manage vouchers', 403);
      const restaurantId: string = req.user?.restaurantId;
      const tenantId: string = req.user?.tenantId;
      const { code, description, discount_type, discount_value, min_order_amount, max_discount_amount, usage_limit, valid_from, valid_until } = req.body;
      const voucher = await prisma.voucherCode.create({
        data: {
          tenant_id: tenantId,
          restaurant_id: restaurantId,
          code: String(code).toUpperCase().trim(),
          description: description || null,
          discount_type: discount_type || 'FLAT',
          discount_value: parseFloat(discount_value),
          min_order_amount: min_order_amount ? parseFloat(min_order_amount) : null,
          max_discount_amount: max_discount_amount ? parseFloat(max_discount_amount) : null,
          usage_limit: usage_limit ? parseInt(usage_limit) : null,
          valid_from: valid_from ? new Date(valid_from) : null,
          valid_until: valid_until ? new Date(valid_until) : null,
        },
      });
      res.status(201).json({ data: voucher });
    } catch (err) { next(err); }
  });

  router.patch('/vouchers/:id', async (req: any, res: any, next: any) => {
    try {
      if (!canManageVouchers(req)) throw new AppError('FORBIDDEN', 'Only owner/manager can manage vouchers', 403);
      const restaurantId: string = req.user?.restaurantId;
      const { id } = req.params;
      const { description, discount_type, discount_value, min_order_amount, max_discount_amount, usage_limit, valid_from, valid_until, is_active } = req.body;
      const data: any = {};
      if (description !== undefined) data.description = description;
      if (discount_type !== undefined) data.discount_type = discount_type;
      if (discount_value !== undefined) data.discount_value = parseFloat(discount_value);
      if (min_order_amount !== undefined) data.min_order_amount = min_order_amount ? parseFloat(min_order_amount) : null;
      if (max_discount_amount !== undefined) data.max_discount_amount = max_discount_amount ? parseFloat(max_discount_amount) : null;
      if (usage_limit !== undefined) data.usage_limit = usage_limit ? parseInt(usage_limit) : null;
      if (valid_from !== undefined) data.valid_from = valid_from ? new Date(valid_from) : null;
      if (valid_until !== undefined) data.valid_until = valid_until ? new Date(valid_until) : null;
      if (is_active !== undefined) data.is_active = Boolean(is_active);
      const voucher = await prisma.voucherCode.update({ where: { id, restaurant_id: restaurantId }, data });
      res.json({ data: voucher });
    } catch (err) { next(err); }
  });

  router.delete('/vouchers/:id', async (req: any, res: any, next: any) => {
    try {
      if (!canManageVouchers(req)) throw new AppError('FORBIDDEN', 'Only owner/manager can manage vouchers', 403);
      const restaurantId: string = req.user?.restaurantId;
      const { id } = req.params;
      await prisma.voucherCode.delete({ where: { id, restaurant_id: restaurantId } });
      res.json({ success: true });
    } catch (err) { next(err); }
  });

  // ========================================
  // RESERVATION DEPOSIT ROUTES
  // ========================================

  router.post('/table-reservations/:id/deposit', async (req: any, res: any, next: any) => {
    try {
      if (!canManageStaff(req)) throw new AppError('FORBIDDEN', 'Only owner/manager can manage deposits', 403);
      const restaurantId: string = req.user?.restaurantId;
      const { id: reservationId } = req.params;
      const { amount, payment_ref, provider, notes } = req.body;
      if (!amount || parseFloat(amount) <= 0) throw new AppError('VALIDATION_ERROR', 'Invalid deposit amount', 400);
      const reservation = await prisma.tableReservation.findFirst({ where: { id: reservationId, restaurant_id: restaurantId } });
      if (!reservation) throw new AppError('NOT_FOUND', 'Reservation not found', 404);
      const deposit = await prisma.reservationDeposit.create({
        data: {
          restaurant_id: restaurantId,
          reservation_id: reservationId,
          amount: parseFloat(amount),
          payment_ref: payment_ref || null,
          provider: provider || 'MANUAL',
          notes: notes || null,
        },
      });
      res.status(201).json({ data: deposit });
    } catch (err) { next(err); }
  });

  router.patch('/table-reservations/:id/deposit/:depositId', async (req: any, res: any, next: any) => {
    try {
      if (!canManageStaff(req)) throw new AppError('FORBIDDEN', 'Only owner/manager can manage deposits', 403);
      const restaurantId: string = req.user?.restaurantId;
      const { depositId } = req.params;
      const { status, notes } = req.body;
      const deposit = await prisma.reservationDeposit.update({
        where: { id: depositId, restaurant_id: restaurantId },
        data: { status: status || undefined, notes: notes !== undefined ? notes : undefined },
      });
      res.json({ data: deposit });
    } catch (err) { next(err); }
  });

  // ========================================
  // PRINTER ZONE ROUTES
  // ========================================

  router.get('/printer-zones', async (req: any, res: any, next: any) => {
    try {
      const restaurantId: string = req.user?.restaurantId;
      const zones = await prisma.printerZone.findMany({ where: { restaurant_id: restaurantId }, orderBy: { name: 'asc' } });
      res.json({ data: zones });
    } catch (err) { next(err); }
  });

  router.post('/printer-zones', async (req: any, res: any, next: any) => {
    try {
      if (!canManageVouchers(req)) throw new AppError('FORBIDDEN', 'Only owner/manager can manage printer zones', 403);
      const restaurantId: string = req.user?.restaurantId;
      const { name, description, category_ids } = req.body;
      const zone = await prisma.printerZone.create({
        data: { restaurant_id: restaurantId, name, description: description || null, category_ids: category_ids || [] },
      });
      res.status(201).json({ data: zone });
    } catch (err) { next(err); }
  });

  router.patch('/printer-zones/:id', async (req: any, res: any, next: any) => {
    try {
      if (!canManageVouchers(req)) throw new AppError('FORBIDDEN', 'Only owner/manager can manage printer zones', 403);
      const restaurantId: string = req.user?.restaurantId;
      const { id } = req.params;
      const { name, description, category_ids, is_active } = req.body;
      const data: any = {};
      if (name !== undefined) data.name = name;
      if (description !== undefined) data.description = description;
      if (category_ids !== undefined) data.category_ids = category_ids;
      if (is_active !== undefined) data.is_active = Boolean(is_active);
      const zone = await prisma.printerZone.update({ where: { id, restaurant_id: restaurantId }, data });
      res.json({ data: zone });
    } catch (err) { next(err); }
  });

  router.delete('/printer-zones/:id', async (req: any, res: any, next: any) => {
    try {
      if (!canManageVouchers(req)) throw new AppError('FORBIDDEN', 'Only owner/manager can manage printer zones', 403);
      const restaurantId: string = req.user?.restaurantId;
      const { id } = req.params;
      await prisma.printerZone.delete({ where: { id, restaurant_id: restaurantId } });
      res.json({ success: true });
    } catch (err) { next(err); }
  });

  // ========================================
  // DELIVERY ZONE ROUTES
  // ========================================

  router.get('/delivery-zones', async (req: any, res: any, next: any) => {
    try {
      const restaurantId: string = req.user?.restaurantId;
      const zones = await prisma.deliveryZone.findMany({ where: { restaurant_id: restaurantId }, orderBy: { sort_order: 'asc' } });
      res.json({ data: zones });
    } catch (err) { next(err); }
  });

  router.post('/delivery-zones', async (req: any, res: any, next: any) => {
    try {
      if (!canManageVouchers(req)) throw new AppError('FORBIDDEN', 'Only owner/manager can manage delivery zones', 403);
      const restaurantId: string = req.user?.restaurantId;
      const tenantId: string = req.user?.tenantId;
      const { name, radius_km, delivery_fee, min_order_amount, eta_minutes, sort_order } = req.body;
      const zone = await prisma.deliveryZone.create({
        data: {
          tenant_id: tenantId,
          restaurant_id: restaurantId,
          name,
          radius_km: radius_km ? parseFloat(radius_km) : null,
          delivery_fee: parseFloat(delivery_fee || '0'),
          min_order_amount: min_order_amount ? parseFloat(min_order_amount) : null,
          eta_minutes: eta_minutes ? parseInt(eta_minutes) : null,
          sort_order: sort_order ? parseInt(sort_order) : 0,
        },
      });
      res.status(201).json({ data: zone });
    } catch (err) { next(err); }
  });

  router.patch('/delivery-zones/:id', async (req: any, res: any, next: any) => {
    try {
      if (!canManageVouchers(req)) throw new AppError('FORBIDDEN', 'Only owner/manager can manage delivery zones', 403);
      const restaurantId: string = req.user?.restaurantId;
      const { id } = req.params;
      const data: any = {};
      const { name, radius_km, delivery_fee, min_order_amount, eta_minutes, sort_order, is_active } = req.body;
      if (name !== undefined) data.name = name;
      if (radius_km !== undefined) data.radius_km = radius_km ? parseFloat(radius_km) : null;
      if (delivery_fee !== undefined) data.delivery_fee = parseFloat(delivery_fee);
      if (min_order_amount !== undefined) data.min_order_amount = min_order_amount ? parseFloat(min_order_amount) : null;
      if (eta_minutes !== undefined) data.eta_minutes = eta_minutes ? parseInt(eta_minutes) : null;
      if (sort_order !== undefined) data.sort_order = parseInt(sort_order);
      if (is_active !== undefined) data.is_active = Boolean(is_active);
      const zone = await prisma.deliveryZone.update({ where: { id, restaurant_id: restaurantId }, data });
      res.json({ data: zone });
    } catch (err) { next(err); }
  });

  router.delete('/delivery-zones/:id', async (req: any, res: any, next: any) => {
    try {
      if (!canManageVouchers(req)) throw new AppError('FORBIDDEN', 'Only owner/manager can manage delivery zones', 403);
      const restaurantId: string = req.user?.restaurantId;
      const { id } = req.params;
      await prisma.deliveryZone.delete({ where: { id, restaurant_id: restaurantId } });
      res.json({ success: true });
    } catch (err) { next(err); }
  });

  // ========================================
  // COMBO PRODUCT ROUTES
  // ========================================

  router.get('/combos', async (req: any, res: any, next: any) => {
    try {
      const restaurantId: string = req.user?.restaurantId;
      const combos = await prisma.comboProduct.findMany({
        where: { restaurant_id: restaurantId },
        include: { components: { include: { product: { select: { id: true, name: true, price: true } } } } },
        orderBy: { created_at: 'desc' },
      });
      res.json({ data: combos });
    } catch (err) { next(err); }
  });

  router.post('/combos', async (req: any, res: any, next: any) => {
    try {
      if (!canManageVouchers(req)) throw new AppError('FORBIDDEN', 'Only owner/manager can manage combos', 403);
      const restaurantId: string = req.user?.restaurantId;
      const tenantId: string = req.user?.tenantId;
      const { name, description, combo_price, components } = req.body;
      if (!name || !combo_price) throw new AppError('VALIDATION_ERROR', 'name and combo_price required', 400);
      const combo = await prisma.comboProduct.create({
        data: {
          tenant_id: tenantId,
          restaurant_id: restaurantId,
          name,
          description: description || null,
          combo_price: parseFloat(combo_price),
          components: Array.isArray(components) ? {
            create: components.map((c: any) => ({ product_id: c.product_id, quantity: c.quantity || 1 })),
          } : undefined,
        },
        include: { components: true },
      });
      res.status(201).json({ data: combo });
    } catch (err) { next(err); }
  });

  router.delete('/combos/:id', async (req: any, res: any, next: any) => {
    try {
      if (!canManageVouchers(req)) throw new AppError('FORBIDDEN', 'Only owner/manager can manage combos', 403);
      const restaurantId: string = req.user?.restaurantId;
      const { id } = req.params;
      await prisma.comboProduct.delete({ where: { id, restaurant_id: restaurantId } });
      res.json({ success: true });
    } catch (err) { next(err); }
  });

  // ========================================
  // CUSTOMER FEEDBACK ROUTES
  // ========================================

  router.get('/feedback', async (req: any, res: any, next: any) => {
    try {
      const restaurantId: string = req.user?.restaurantId;
      const { rating, from_date, to_date } = req.query as Record<string, string>;
      const where: any = { restaurant_id: restaurantId };
      if (rating) where.rating = parseInt(rating);
      if (from_date) where.created_at = { ...where.created_at, gte: new Date(from_date) };
      if (to_date) where.created_at = { ...where.created_at, lte: new Date(to_date) };
      const feedback = await prisma.customerFeedback.findMany({
        where,
        orderBy: { created_at: 'desc' },
        take: 100,
      });
      res.json({ data: feedback });
    } catch (err) { next(err); }
  });

  router.post('/feedback', async (req: any, res: any, next: any) => {
    try {
      const restaurantId: string = req.user?.restaurantId;
      const tenantId: string = req.user?.tenantId;
      const { order_id, customer_id, customer_name, rating, comment, categories, source } = req.body;
      if (!rating || rating < 1 || rating > 5) throw new AppError('VALIDATION_ERROR', 'Rating must be 1-5', 400);
      const feedback = await prisma.customerFeedback.create({
        data: {
          tenant_id: tenantId,
          restaurant_id: restaurantId,
          order_id: order_id || null,
          customer_id: customer_id || null,
          customer_name: customer_name || null,
          rating: parseInt(rating),
          comment: comment || null,
          categories: categories || [],
          source: source || 'MANUAL',
        },
      });
      res.status(201).json({ data: feedback });
    } catch (err) { next(err); }
  });

  router.delete('/feedback/:id', async (req: any, res: any, next: any) => {
    try {
      if (!canManageStaff(req)) throw new AppError('FORBIDDEN', 'Only owner/manager can delete feedback', 403);
      const restaurantId: string = req.user?.restaurantId;
      const { id } = req.params;
      await prisma.customerFeedback.delete({ where: { id, restaurant_id: restaurantId } });
      res.json({ success: true });
    } catch (err) { next(err); }
  });

  // ========================================
  // STAFF SCHEDULING & TIMESHEET ROUTES
  // ========================================

  router.get('/staff-schedules', async (req: any, res: any, next: any) => {
    try {
      const restaurantId: string = req.user?.restaurantId;
      const { from_date, to_date, user_id } = req.query as Record<string, string>;
      const where: any = { restaurant_id: restaurantId };
      if (user_id) where.user_id = user_id;
      if (from_date) where.date = { ...where.date, gte: new Date(from_date) };
      if (to_date) where.date = { ...where.date, lte: new Date(to_date) };
      const schedules = await prisma.staffSchedule.findMany({
        where,
        include: { user: { select: { id: true, name: true, role: true } } },
        orderBy: { date: 'asc' },
      });
      res.json({ data: schedules });
    } catch (err) { next(err); }
  });

  router.post('/staff-schedules', async (req: any, res: any, next: any) => {
    try {
      if (!canManageStaff(req)) throw new AppError('FORBIDDEN', 'Only owner/manager can manage schedules', 403);
      const restaurantId: string = req.user?.restaurantId;
      const tenantId: string = req.user?.tenantId;
      const { user_id, date, start_time, end_time, role, notes } = req.body;
      if (!user_id || !date || !start_time || !end_time) throw new AppError('VALIDATION_ERROR', 'user_id, date, start_time, end_time required', 400);
      const schedule = await prisma.staffSchedule.create({
        data: {
          tenant_id: tenantId,
          restaurant_id: restaurantId,
          user_id,
          date: new Date(date),
          start_time,
          end_time,
          role: role || null,
          notes: notes || null,
        },
      });
      res.status(201).json({ data: schedule });
    } catch (err) { next(err); }
  });

  router.delete('/staff-schedules/:id', async (req: any, res: any, next: any) => {
    try {
      if (!canManageStaff(req)) throw new AppError('FORBIDDEN', 'Only owner/manager can manage schedules', 403);
      const restaurantId: string = req.user?.restaurantId;
      const { id } = req.params;
      await prisma.staffSchedule.delete({ where: { id, restaurant_id: restaurantId } });
      res.json({ success: true });
    } catch (err) { next(err); }
  });

  // Clock in
  router.post('/timesheets/clock-in', async (req: any, res: any, next: any) => {
    try {
      const restaurantId: string = req.user?.restaurantId;
      const tenantId: string = req.user?.tenantId;
      const userId: string = req.user?.id;
      // Check if already clocked in
      const existing = await prisma.staffTimeEntry.findFirst({
        where: { restaurant_id: restaurantId, user_id: userId, clock_out: null },
      });
      if (existing) throw new AppError('VALIDATION_ERROR', 'Already clocked in', 400);
      const entry = await prisma.staffTimeEntry.create({
        data: { tenant_id: tenantId, restaurant_id: restaurantId, user_id: userId, clock_in: new Date() },
      });
      res.status(201).json({ data: entry });
    } catch (err) { next(err); }
  });

  // Clock out
  router.post('/timesheets/clock-out', async (req: any, res: any, next: any) => {
    try {
      const restaurantId: string = req.user?.restaurantId;
      const userId: string = req.user?.id;
      const entry = await prisma.staffTimeEntry.findFirst({
        where: { restaurant_id: restaurantId, user_id: userId, clock_out: null },
      });
      if (!entry) throw new AppError('NOT_FOUND', 'No active clock-in found', 404);
      const clockOut = new Date();
      const totalMinutes = Math.round((clockOut.getTime() - entry.clock_in.getTime()) / 60000);
      const updated = await prisma.staffTimeEntry.update({
        where: { id: entry.id },
        data: { clock_out: clockOut, total_minutes: totalMinutes },
      });
      res.json({ data: updated });
    } catch (err) { next(err); }
  });

  router.get('/timesheets', async (req: any, res: any, next: any) => {
    try {
      const restaurantId: string = req.user?.restaurantId;
      const { from_date, to_date, user_id } = req.query as Record<string, string>;
      const where: any = { restaurant_id: restaurantId };
      if (user_id) where.user_id = user_id;
      if (from_date) where.clock_in = { ...where.clock_in, gte: new Date(from_date) };
      if (to_date) where.clock_in = { ...where.clock_in, lte: new Date(to_date) };
      const entries = await prisma.staffTimeEntry.findMany({
        where,
        include: { user: { select: { id: true, name: true, role: true } } },
        orderBy: { clock_in: 'desc' },
        take: 100,
      });
      res.json({ data: entries });
    } catch (err) { next(err); }
  });

  // ========================================
  // PRICING RULES (Happy Hour) ROUTES
  // ========================================

  router.get('/pricing-rules', async (req: any, res: any, next: any) => {
    try {
      const restaurantId: string = req.user?.restaurantId;
      const rules = await prisma.pricingRule.findMany({
        where: { restaurant_id: restaurantId },
        orderBy: { created_at: 'desc' },
      });
      res.json({ data: rules });
    } catch (err) { next(err); }
  });

  router.post('/pricing-rules', async (req: any, res: any, next: any) => {
    try {
      if (!canManageVouchers(req)) throw new AppError('FORBIDDEN', 'Only owner/manager can manage pricing rules', 403);
      const restaurantId: string = req.user?.restaurantId;
      const tenantId: string = req.user?.tenantId;
      const { name, discount_type, discount_value, days_of_week, start_time, end_time, applicable_to, category_ids, product_ids } = req.body;
      if (!name || !start_time || !end_time || !discount_value) throw new AppError('VALIDATION_ERROR', 'name, start_time, end_time, discount_value required', 400);
      const rule = await prisma.pricingRule.create({
        data: {
          tenant_id: tenantId,
          restaurant_id: restaurantId,
          name,
          discount_type: discount_type || 'PERCENTAGE',
          discount_value: parseFloat(discount_value),
          days_of_week: days_of_week || [],
          start_time,
          end_time,
          applicable_to: applicable_to || 'ALL',
          category_ids: category_ids || [],
          product_ids: product_ids || [],
        },
      });
      res.status(201).json({ data: rule });
    } catch (err) { next(err); }
  });

  router.patch('/pricing-rules/:id', async (req: any, res: any, next: any) => {
    try {
      if (!canManageVouchers(req)) throw new AppError('FORBIDDEN', 'Only owner/manager can manage pricing rules', 403);
      const restaurantId: string = req.user?.restaurantId;
      const { id } = req.params;
      const { name, discount_type, discount_value, days_of_week, start_time, end_time, applicable_to, category_ids, product_ids, is_active } = req.body;
      const data: any = {};
      if (name !== undefined) data.name = name;
      if (discount_type !== undefined) data.discount_type = discount_type;
      if (discount_value !== undefined) data.discount_value = parseFloat(discount_value);
      if (days_of_week !== undefined) data.days_of_week = days_of_week;
      if (start_time !== undefined) data.start_time = start_time;
      if (end_time !== undefined) data.end_time = end_time;
      if (applicable_to !== undefined) data.applicable_to = applicable_to;
      if (category_ids !== undefined) data.category_ids = category_ids;
      if (product_ids !== undefined) data.product_ids = product_ids;
      if (is_active !== undefined) data.is_active = Boolean(is_active);
      const rule = await prisma.pricingRule.update({ where: { id, restaurant_id: restaurantId }, data });
      res.json({ data: rule });
    } catch (err) { next(err); }
  });

  router.delete('/pricing-rules/:id', async (req: any, res: any, next: any) => {
    try {
      if (!canManageVouchers(req)) throw new AppError('FORBIDDEN', 'Only owner/manager can manage pricing rules', 403);
      const restaurantId: string = req.user?.restaurantId;
      const { id } = req.params;
      await prisma.pricingRule.delete({ where: { id, restaurant_id: restaurantId } });
      res.json({ success: true });
    } catch (err) { next(err); }
  });

  // ========================================
  // LOYALTY PROGRAM ROUTES
  // ========================================

  // Get or create loyalty program settings
  router.get('/loyalty/program', async (req: any, res: any, next: any) => {
    try {
      const restaurantId: string = req.user?.restaurantId;
      const program = await prisma.loyaltyProgram.findUnique({ where: { restaurant_id: restaurantId } });
      res.json({ data: program });
    } catch (err) { next(err); }
  });

  router.put('/loyalty/program', async (req: any, res: any, next: any) => {
    try {
      if (!canManageVouchers(req)) throw new AppError('FORBIDDEN', 'Only owner/manager can manage loyalty', 403);
      const restaurantId: string = req.user?.restaurantId;
      const tenantId: string = req.user?.tenantId;
      const { name, points_per_spend_unit, spend_unit, redemption_rate, min_points_to_redeem, is_active } = req.body;
      const data: any = {};
      if (name !== undefined) data.name = name;
      if (points_per_spend_unit !== undefined) data.points_per_spend_unit = parseFloat(points_per_spend_unit);
      if (spend_unit !== undefined) data.spend_unit = parseFloat(spend_unit);
      if (redemption_rate !== undefined) data.redemption_rate = parseFloat(redemption_rate);
      if (min_points_to_redeem !== undefined) data.min_points_to_redeem = parseInt(min_points_to_redeem);
      if (is_active !== undefined) data.is_active = Boolean(is_active);
      const program = await prisma.loyaltyProgram.upsert({
        where: { restaurant_id: restaurantId },
        create: { restaurant_id: restaurantId, ...data },
        update: data,
      });
      res.json({ data: program });
    } catch (err) { next(err); }
  });

  // Get customer loyalty balance
  router.get('/loyalty/customers/:customerId', async (req: any, res: any, next: any) => {
    try {
      const restaurantId: string = req.user?.restaurantId;
      const { customerId } = req.params;
      const program = await prisma.loyaltyProgram.findUnique({ where: { restaurant_id: restaurantId } });
      if (!program) return res.json({ data: null });
      const loyalty = await prisma.customerLoyalty.findUnique({
        where: { customer_id_program_id: { customer_id: customerId, program_id: program.id } },
        include: { transactions: { orderBy: { created_at: 'desc' }, take: 10 } },
      });
      res.json({ data: loyalty });
    } catch (err) { next(err); }
  });

  // Manual loyalty adjustment (OWNER/MANAGER)
  router.post('/loyalty/customers/:customerId/adjust', async (req: any, res: any, next: any) => {
    try {
      if (!canManageVouchers(req)) throw new AppError('FORBIDDEN', 'Only owner/manager can adjust loyalty', 403);
      const restaurantId: string = req.user?.restaurantId;
      const tenantId: string = req.user?.tenantId;
      const { customerId } = req.params;
      const { points, notes } = req.body;
      if (!points || points === 0) throw new AppError('VALIDATION_ERROR', 'Points cannot be zero', 400);
      const program = await prisma.loyaltyProgram.findUnique({ where: { restaurant_id: restaurantId } });
      if (!program) throw new AppError('NOT_FOUND', 'No loyalty program configured', 404);
      const loyalty = await prisma.customerLoyalty.upsert({
        where: { customer_id_program_id: { customer_id: customerId, program_id: program.id } },
        create: {
          tenant_id: tenantId,
          restaurant_id: restaurantId,
          customer_id: customerId,
          program_id: program.id,
          points_balance: Math.max(0, parseInt(points)),
          total_earned: parseInt(points) > 0 ? parseInt(points) : 0,
        },
        update: {
          points_balance: { increment: parseInt(points) },
          total_earned: parseInt(points) > 0 ? { increment: parseInt(points) } : undefined,
          total_redeemed: parseInt(points) < 0 ? { increment: -parseInt(points) } : undefined,
        },
      });
      await prisma.loyaltyTransaction.create({
        data: {
          customer_loyalty_id: loyalty.id,
          points: parseInt(points),
          type: 'ADJUSTED',
          notes: notes || null,
        },
      });
      res.json({ data: loyalty });
    } catch (err) { next(err); }
  });

  // Loyalty leaderboard (top customers by points)
  router.get('/loyalty/leaderboard', async (req: any, res: any, next: any) => {
    try {
      const restaurantId: string = req.user?.restaurantId;
      const program = await prisma.loyaltyProgram.findUnique({ where: { restaurant_id: restaurantId } });
      if (!program) return res.json({ data: [] });
      const entries = await prisma.customerLoyalty.findMany({
        where: { restaurant_id: restaurantId },
        include: { customer: { select: { name: true, phone: true } } },
        orderBy: { points_balance: 'desc' },
        take: 50,
      });
      res.json({ data: entries });
    } catch (err) { next(err); }
  });

  // Public-ish: validate a voucher code (called by frontend at checkout)
  router.post('/vouchers/validate', async (req: any, res: any, next: any) => {
    try {
      const restaurantId: string = req.user?.restaurantId;
      const { code, order_amount } = req.body;
      if (!code) throw new AppError('VALIDATION_ERROR', 'Voucher code required', 400);
      const voucher = await prisma.voucherCode.findUnique({
        where: { restaurant_id_code: { restaurant_id: restaurantId, code: String(code).toUpperCase().trim() } },
      });
      if (!voucher || !voucher.is_active) throw new AppError('NOT_FOUND', 'Voucher code not found or inactive', 404);
      const now = new Date();
      if (voucher.valid_from && voucher.valid_from > now) throw new AppError('VALIDATION_ERROR', 'Voucher not yet valid', 400);
      if (voucher.valid_until && voucher.valid_until < now) throw new AppError('VALIDATION_ERROR', 'Voucher has expired', 400);
      if (voucher.usage_limit !== null && voucher.used_count >= voucher.usage_limit) throw new AppError('VALIDATION_ERROR', 'Voucher usage limit reached', 400);
      const amount = parseFloat(order_amount || '0');
      if (voucher.min_order_amount !== null && amount < Number(voucher.min_order_amount)) {
        throw new AppError('VALIDATION_ERROR', `Minimum order amount of ${voucher.min_order_amount} required`, 400);
      }
      let discount = 0;
      if (voucher.discount_type === 'FLAT') {
        discount = Math.min(Number(voucher.discount_value), amount);
      } else {
        discount = (amount * Number(voucher.discount_value)) / 100;
        if (voucher.max_discount_amount !== null) discount = Math.min(discount, Number(voucher.max_discount_amount));
      }
      res.json({ data: { voucher_id: voucher.id, code: voucher.code, discount_amount: discount, description: voucher.description } });
    } catch (err) { next(err); }
  });

  // ---- Pricing Rules (Happy Hour / Time-based discounts) ----

  router.get('/pricing-rules', async (req: any, res: any, next: any) => {
    try {
      const restaurantId: string = req.user?.restaurantId;
      const rules = await prisma.pricingRule.findMany({
        where: { restaurant_id: restaurantId },
        orderBy: { created_at: 'asc' },
      });
      res.json({ data: rules });
    } catch (err) { next(err); }
  });

  router.post('/pricing-rules', async (req: any, res: any, next: any) => {
    try {
      if (!canManageVouchers(req)) throw new AppError('FORBIDDEN', 'Only owner/manager can manage pricing rules', 403);
      const restaurantId: string = req.user?.restaurantId;
      const tenantId: string = req.user?.tenantId;
      const { name, discount_type, discount_value, days_of_week, start_time, end_time, applicable_to, category_ids, product_ids, is_active } = req.body;
      const rule = await prisma.pricingRule.create({
        data: {
          tenant_id: tenantId,
          restaurant_id: restaurantId,
          name,
          discount_type: discount_type ?? 'PERCENTAGE',
          discount_value: parseFloat(discount_value),
          days_of_week: days_of_week ?? [],
          start_time: start_time ?? '00:00',
          end_time: end_time ?? '23:59',
          applicable_to: applicable_to ?? 'ALL',
          category_ids: category_ids ?? [],
          product_ids: product_ids ?? [],
          is_active: is_active !== false,
        },
      });
      res.status(201).json({ data: rule });
    } catch (err) { next(err); }
  });

  router.patch('/pricing-rules/:ruleId', async (req: any, res: any, next: any) => {
    try {
      if (!canManageVouchers(req)) throw new AppError('FORBIDDEN', 'Only owner/manager can manage pricing rules', 403);
      const restaurantId: string = req.user?.restaurantId;
      const { ruleId } = req.params;
      const existing = await prisma.pricingRule.findFirst({ where: { id: ruleId, restaurant_id: restaurantId } });
      if (!existing) throw new AppError('NOT_FOUND', 'Pricing rule not found', 404);
      const data: any = {};
      const fields = ['name', 'discount_type', 'discount_value', 'days_of_week', 'start_time', 'end_time', 'applicable_to', 'category_ids', 'product_ids', 'is_active'];
      for (const f of fields) {
        if (req.body[f] !== undefined) {
          if (f === 'discount_value') data[f] = parseFloat(req.body[f]);
          else data[f] = req.body[f];
        }
      }
      const rule = await prisma.pricingRule.update({ where: { id: ruleId }, data });
      res.json({ data: rule });
    } catch (err) { next(err); }
  });

  router.delete('/pricing-rules/:ruleId', async (req: any, res: any, next: any) => {
    try {
      if (!canManageVouchers(req)) throw new AppError('FORBIDDEN', 'Only owner/manager can delete pricing rules', 403);
      const restaurantId: string = req.user?.restaurantId;
      const { ruleId } = req.params;
      const existing = await prisma.pricingRule.findFirst({ where: { id: ruleId, restaurant_id: restaurantId } });
      if (!existing) throw new AppError('NOT_FOUND', 'Pricing rule not found', 404);
      await prisma.pricingRule.delete({ where: { id: ruleId } });
      res.json({ data: { success: true } });
    } catch (err) { next(err); }
  });

  // Evaluate active pricing rules for current time and order amount
  router.get('/pricing-rules/evaluate', async (req: any, res: any, next: any) => {
    try {
      const restaurantId: string = req.user?.restaurantId;
      const orderAmount = parseFloat(req.query.amount as string) || 0;
      const now = new Date();
      const dayOfWeek = now.getDay(); // 0=Sun
      const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

      const rules = await prisma.pricingRule.findMany({
        where: { restaurant_id: restaurantId, is_active: true },
      });

      // Find first matching rule (highest discount wins)
      let bestDiscount = 0;
      let bestRule: any = null;
      for (const rule of rules) {
        // Check day
        if (rule.days_of_week.length > 0 && !rule.days_of_week.includes(dayOfWeek)) continue;
        // Check time window
        if (currentTime < rule.start_time || currentTime > rule.end_time) continue;
        // Compute discount
        let discount = 0;
        if (rule.discount_type === 'FLAT') {
          discount = Math.min(Number(rule.discount_value), orderAmount);
        } else {
          discount = (orderAmount * Number(rule.discount_value)) / 100;
        }
        if (discount > bestDiscount) { bestDiscount = discount; bestRule = rule; }
      }

      res.json({ data: bestRule ? { rule: bestRule, discount_amount: bestDiscount } : null });
    } catch (err) { next(err); }
  });

  // ---- Combo Products ----

  router.get('/combos', async (req: any, res: any, next: any) => {
    try {
      const restaurantId: string = req.user?.restaurantId;
      const combos = await prisma.comboProduct.findMany({
        where: { restaurant_id: restaurantId },
        include: { components: { include: { product: { select: { id: true, name: true, price: true, category_id: true } } } } },
        orderBy: { created_at: 'asc' },
      });
      res.json({ data: combos });
    } catch (err) { next(err); }
  });

  router.post('/combos', async (req: any, res: any, next: any) => {
    try {
      if (!canManageVouchers(req)) throw new AppError('FORBIDDEN', 'Only owner/manager can manage combos', 403);
      const restaurantId: string = req.user?.restaurantId;
      const tenantId: string = req.user?.tenantId;
      const { name, description, combo_price, is_active, components } = req.body as {
        name: string; description?: string; combo_price: number; is_active?: boolean;
        components?: { product_id: string; quantity: number }[];
      };
      const combo = await prisma.comboProduct.create({
        data: {
          tenant_id: tenantId,
          restaurant_id: restaurantId,
          name,
          description,
          combo_price,
          is_active: is_active !== false,
          components: components
            ? { create: components.map((c) => ({ product_id: c.product_id, quantity: c.quantity || 1 })) }
            : undefined,
        },
        include: { components: { include: { product: { select: { id: true, name: true, price: true } } } } },
      });
      res.status(201).json({ data: combo });
    } catch (err) { next(err); }
  });

  router.patch('/combos/:comboId', async (req: any, res: any, next: any) => {
    try {
      if (!canManageVouchers(req)) throw new AppError('FORBIDDEN', 'Only owner/manager can manage combos', 403);
      const restaurantId: string = req.user?.restaurantId;
      const { comboId } = req.params;
      const existing = await prisma.comboProduct.findFirst({ where: { id: comboId, restaurant_id: restaurantId } });
      if (!existing) throw new AppError('NOT_FOUND', 'Combo not found', 404);
      const { name, description, combo_price, is_active, components } = req.body;
      const data: any = {};
      if (name !== undefined) data.name = name;
      if (description !== undefined) data.description = description;
      if (combo_price !== undefined) data.combo_price = combo_price;
      if (is_active !== undefined) data.is_active = is_active;
      if (components) {
        // Replace all components
        await prisma.comboComponent.deleteMany({ where: { combo_id: comboId } });
        data.components = { create: components.map((c: any) => ({ product_id: c.product_id, quantity: c.quantity || 1 })) };
      }
      const combo = await prisma.comboProduct.update({
        where: { id: comboId },
        data,
        include: { components: { include: { product: { select: { id: true, name: true, price: true } } } } },
      });
      res.json({ data: combo });
    } catch (err) { next(err); }
  });

  router.delete('/combos/:comboId', async (req: any, res: any, next: any) => {
    try {
      if (!canManageVouchers(req)) throw new AppError('FORBIDDEN', 'Only owner/manager can delete combos', 403);
      const restaurantId: string = req.user?.restaurantId;
      const { comboId } = req.params;
      const existing = await prisma.comboProduct.findFirst({ where: { id: comboId, restaurant_id: restaurantId } });
      if (!existing) throw new AppError('NOT_FOUND', 'Combo not found', 404);
      await prisma.comboProduct.delete({ where: { id: comboId } });
      res.json({ data: { success: true } });
    } catch (err) { next(err); }
  });

  // ---- Inventory Management ----

  // GET /inventory/ingredients — list all ingredients
  router.get('/inventory/ingredients', async (req: any, res: any, next: any) => {
    try {
      const restaurantId: string = req.user?.restaurantId;
      const ingredients = await prisma.ingredient.findMany({
        where: { restaurant_id: restaurantId },
        orderBy: { name: 'asc' },
      });
      res.json({ data: ingredients });
    } catch (err) { next(err); }
  });

  // POST /inventory/ingredients — create ingredient
  router.post('/inventory/ingredients', async (req: any, res: any, next: any) => {
    try {
      if (!canManageVouchers(req)) throw new AppError('FORBIDDEN', 'Only owner/manager can manage inventory', 403);
      const restaurantId: string = req.user?.restaurantId;
      const tenantId: string = req.user?.tenantId;
      const { name, unit, current_stock, reorder_level, cost_per_unit, category } = req.body;
      const ingredient = await prisma.ingredient.create({
        data: {
          tenant_id: tenantId,
          restaurant_id: restaurantId,
          name,
          unit: unit ?? 'pcs',
          current_stock: parseFloat(current_stock ?? '0'),
          reorder_level: reorder_level ? parseFloat(reorder_level) : null,
          cost_per_unit: parseFloat(cost_per_unit ?? '0'),
          category: category ?? null,
        },
      });
      res.status(201).json({ data: ingredient });
    } catch (err) { next(err); }
  });

  // PATCH /inventory/ingredients/:id — update ingredient
  router.patch('/inventory/ingredients/:id', async (req: any, res: any, next: any) => {
    try {
      if (!canManageVouchers(req)) throw new AppError('FORBIDDEN', 'Only owner/manager can manage inventory', 403);
      const restaurantId: string = req.user?.restaurantId;
      const { id } = req.params;
      const existing = await prisma.ingredient.findFirst({ where: { id, restaurant_id: restaurantId } });
      if (!existing) throw new AppError('NOT_FOUND', 'Ingredient not found', 404);
      const data: any = {};
      const fields = ['name', 'unit', 'reorder_level', 'cost_per_unit', 'category', 'is_active'];
      for (const f of fields) {
        if (req.body[f] !== undefined) {
          if (['reorder_level', 'cost_per_unit'].includes(f)) data[f] = req.body[f] ? parseFloat(req.body[f]) : null;
          else data[f] = req.body[f];
        }
      }
      const ingredient = await prisma.ingredient.update({ where: { id }, data });
      res.json({ data: ingredient });
    } catch (err) { next(err); }
  });

  // DELETE /inventory/ingredients/:id — delete ingredient
  router.delete('/inventory/ingredients/:id', async (req: any, res: any, next: any) => {
    try {
      if (!canManageVouchers(req)) throw new AppError('FORBIDDEN', 'Only owner/manager can manage inventory', 403);
      const restaurantId: string = req.user?.restaurantId;
      const { id } = req.params;
      await prisma.ingredient.delete({ where: { id, restaurant_id: restaurantId } });
      res.json({ data: { success: true } });
    } catch (err) { next(err); }
  });

  // POST /inventory/ingredients/:id/adjustment — stock adjustment (PURCHASE/WASTE/ADJUSTMENT)
  router.post('/inventory/ingredients/:id/adjustment', async (req: any, res: any, next: any) => {
    try {
      if (!canManageVouchers(req)) throw new AppError('FORBIDDEN', 'Only owner/manager can adjust stock', 403);
      const restaurantId: string = req.user?.restaurantId;
      const tenantId: string = req.user?.tenantId;
      const userId: string = req.user?.userId;
      const { id } = req.params;
      const { type, quantity, unit_cost, notes } = req.body;
      if (!type || quantity === undefined) throw new AppError('VALIDATION_ERROR', 'type and quantity are required', 400);
      const ingredient = await prisma.ingredient.findFirst({ where: { id, restaurant_id: restaurantId } });
      if (!ingredient) throw new AppError('NOT_FOUND', 'Ingredient not found', 404);
      const qty = parseFloat(quantity);
      const delta = ['PURCHASE', 'ADJUSTMENT'].includes(type) ? Math.abs(qty) : -Math.abs(qty);
      const [, movement] = await prisma.$transaction([
        prisma.ingredient.update({ where: { id }, data: { current_stock: { increment: delta } } }),
        prisma.stockMovement.create({
          data: {
            tenant_id: tenantId,
            restaurant_id: restaurantId,
            ingredient_id: id,
            type,
            quantity: delta,
            unit_cost: unit_cost ? parseFloat(unit_cost) : null,
            notes: notes ?? null,
            created_by: userId ?? null,
          },
        }),
      ]);
      res.status(201).json({ data: movement });
    } catch (err) { next(err); }
  });

  // GET /inventory/ingredients/:id/movements — movement history
  router.get('/inventory/ingredients/:id/movements', async (req: any, res: any, next: any) => {
    try {
      const restaurantId: string = req.user?.restaurantId;
      const { id } = req.params;
      const movements = await prisma.stockMovement.findMany({
        where: { ingredient_id: id, restaurant_id: restaurantId },
        orderBy: { created_at: 'desc' },
        take: 100,
      });
      res.json({ data: movements });
    } catch (err) { next(err); }
  });

  // GET /inventory/recipes/:productId — get recipe for a product
  router.get('/inventory/recipes/:productId', async (req: any, res: any, next: any) => {
    try {
      const restaurantId: string = req.user?.restaurantId;
      const { productId } = req.params;
      const lines = await prisma.recipeLine.findMany({
        where: { product: { restaurant_id: restaurantId }, product_id: productId },
        include: { ingredient: { select: { id: true, name: true, unit: true, cost_per_unit: true } } },
      });
      res.json({ data: lines });
    } catch (err) { next(err); }
  });

  // PUT /inventory/recipes/:productId — set/replace recipe for a product
  router.put('/inventory/recipes/:productId', async (req: any, res: any, next: any) => {
    try {
      if (!canManageVouchers(req)) throw new AppError('FORBIDDEN', 'Only owner/manager can manage recipes', 403);
      const { productId } = req.params;
      const { lines } = req.body as { lines: { ingredient_id: string; quantity: number }[] };
      await prisma.$transaction([
        prisma.recipeLine.deleteMany({ where: { product_id: productId } }),
        ...lines.map((l) => prisma.recipeLine.create({ data: { product_id: productId, ingredient_id: l.ingredient_id, quantity: l.quantity } })),
      ]);
      const updated = await prisma.recipeLine.findMany({
        where: { product_id: productId },
        include: { ingredient: { select: { id: true, name: true, unit: true, cost_per_unit: true } } },
      });
      res.json({ data: updated });
    } catch (err) { next(err); }
  });

  // GET /inventory/low-stock — ingredients below reorder level
  router.get('/inventory/low-stock', async (req: any, res: any, next: any) => {
    try {
      const restaurantId: string = req.user?.restaurantId;
      const ingredients = await prisma.ingredient.findMany({
        where: {
          restaurant_id: restaurantId,
          is_active: true,
          reorder_level: { not: null },
        },
      });
      const lowStock = ingredients.filter((i) => i.reorder_level !== null && Number(i.current_stock) <= Number(i.reorder_level));
      res.json({ data: lowStock });
    } catch (err) { next(err); }
  });

  return router;
}
