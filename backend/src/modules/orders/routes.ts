import { Router } from "express";
import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import { RedisStore } from "rate-limit-redis";
import { authMiddleware } from "../../middlewares/auth.middleware";
import { rateLimiters } from "../../middlewares";
import { tenantMiddleware } from "../../middlewares/tenant.middleware";
import { requireRole } from '../../middlewares/require-role.middleware';
import { requireRestaurantRole } from "../../middlewares/restaurantRole.middleware";
import { env } from "../../env";
import { redisClient } from "../../utils/redis";
import * as controller from "./controller";
import { prisma } from "../../utils/prisma";
import { AppError } from "../../middlewares/error.middleware";

/**
 * Stricter rate limiter for public order placement
 * 10 requests per minute per IP (to prevent spam orders)
 */
const publicOrderLimiter = rateLimit({
  windowMs: 60_000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: "Too many order requests, please try again later",
  },
  keyGenerator: (req: any) => {
    const phone = req.body?.customer_phone || "no-phone";
    const ip = ipKeyGenerator(req);

    return `${ip}:${phone}`;
  },

  store:
    env.REDIS_URL && redisClient.getClient()
      ? new RedisStore({

        sendCommand: (...args: string[]) =>
          redisClient.getClient()!.call(...(args as [string, ...string[]])) as Promise<any>,
        prefix: "rl:public-order:",
      })
      : undefined,
});

/**
 * Public order routes (no auth)
 * POST /public/:restaurant_slug/orders
 */
export function publicOrderRoutes() {
  const router = Router();

  router.post(
    "/:restaurant_slug/orders",
    publicOrderLimiter,
    controller.placePublicOrder
  );

  return router;
}

/**
 * Protected order routes (auth required)
 * All routes require authentication and tenant context
 */
export function orderRoutes() {
  const router = Router();

  // Stats endpoint first (before :id to avoid conflicts)
  router.get(
    "/stats",
    rateLimiters.default,
    authMiddleware,
    tenantMiddleware,
    requireRole('OWNER', 'MANAGER'),
    controller.getOrderStats
  );

  // Revenue summary (manager dashboard) - Renamed to /revenue to match frontend
  router.get(
    "/revenue",
    rateLimiters.default,
    authMiddleware,
    tenantMiddleware,
    requireRole('OWNER', 'MANAGER'),
    controller.getRevenueSummary
  );

  // Advanced Analytics (Operational Intelligence)
  router.get(
    "/advanced-analytics",
    rateLimiters.default,
    authMiddleware,
    tenantMiddleware,
    requireRole('OWNER', 'MANAGER'),
    controller.getAdvancedAnalytics
  );

  // Bills: daily and table final
  router.get(
    "/bills/today",
    rateLimiters.default,
    authMiddleware,
    tenantMiddleware,
    requireRestaurantRole('OWNER', 'MANAGER', 'WAITER'),
    controller.getDailyBills
  );

  router.get(
    "/bills/table/:tableId",
    rateLimiters.default,
    authMiddleware,
    tenantMiddleware,
    requireRestaurantRole('OWNER', 'MANAGER', 'WAITER'),
    controller.getTableBill
  );

  // List orders
  router.get(
    "/",
    rateLimiters.default,
    authMiddleware,
    tenantMiddleware,
    requireRestaurantRole('OWNER', 'MANAGER', 'WAITER'),
    controller.listOrders
  );

  // Create internal order (staff)
  router.post(
    "/",
    rateLimiters.default,
    authMiddleware,
    tenantMiddleware,
    requireRestaurantRole('OWNER', 'MANAGER', 'WAITER'),
    controller.createInternalOrder
  );

  // --- GENERIC ID ROUTES (MUST BE LAST) ---

  // Get single order
  router.get(
    "/:id",
    rateLimiters.default,
    authMiddleware,
    tenantMiddleware,
    requireRestaurantRole('OWNER', 'MANAGER', 'WAITER'),
    controller.getOrder
  );

  // Add/Update/Delete order items
  router.post(
    "/:id/items",
    rateLimiters.default,
    authMiddleware,
    tenantMiddleware,
    requireRestaurantRole('OWNER', 'MANAGER', 'WAITER'),
    controller.addOrderItems
  );

  router.patch(
    "/:id/items/:itemId",
    rateLimiters.default,
    authMiddleware,
    tenantMiddleware,
    requireRestaurantRole('OWNER', 'MANAGER', 'WAITER'),
    controller.updateOrderItem
  );

  router.delete(
    "/:id/items/:itemId",
    rateLimiters.default,
    authMiddleware,
    tenantMiddleware,
    requireRestaurantRole('OWNER', 'MANAGER', 'WAITER'),
    controller.removeOrderItem
  );

  // Accept QR order (waiter acknowledges the order)
  router.post(
    "/:id/accept",
    rateLimiters.default,
    authMiddleware,
    tenantMiddleware,
    requireRestaurantRole('OWNER', 'MANAGER', 'WAITER'),
    controller.acceptQROrder
  );

  // Reject QR order (waiter declines the order)
  router.post(
    "/:id/reject",
    rateLimiters.default,
    authMiddleware,
    tenantMiddleware,
    requireRestaurantRole('OWNER', 'MANAGER', 'WAITER'),
    controller.rejectQROrder
  );

  // Update order status
  router.patch(
    "/:id/status",
    rateLimiters.default,
    authMiddleware,
    tenantMiddleware,
    requireRestaurantRole('OWNER', 'MANAGER', 'WAITER'),
    controller.updateOrderStatus
  );

  router.patch(
    "/:id/payment",
    rateLimiters.default,
    authMiddleware,
    tenantMiddleware,
    requireRestaurantRole('OWNER', 'MANAGER', 'WAITER'),
    controller.updateOrderPayment
  );

  // Credit Analytics & Settlement
  router.get(
    "/analytics/udhaar",
    rateLimiters.default,
    authMiddleware,
    tenantMiddleware,
    requireRole('OWNER', 'MANAGER'),
    controller.getUdhaarList
  );

  router.post(
    "/analytics/settle",
    rateLimiters.default,
    authMiddleware,
    tenantMiddleware,
    requireRole('OWNER', 'MANAGER'),
    controller.settleCredit
  );

  // Void or comp an individual order item (MANAGER+ only)
  router.patch(
    "/:id/items/:itemId/void",
    rateLimiters.default,
    authMiddleware,
    tenantMiddleware,
    requireRole('OWNER', 'MANAGER'),
    controller.voidOrderItem
  );

  // Delete order
  router.delete(
    "/:id",
    rateLimiters.default,
    authMiddleware,
    tenantMiddleware,
    requireRole('OWNER', 'MANAGER'),
    controller.deleteOrder
  );

  // ========================================
  // REFUND ROUTES
  // ========================================

  router.post(
    "/:id/refunds",
    rateLimiters.default,
    authMiddleware,
    tenantMiddleware,
    requireRole('OWNER', 'MANAGER'),
    async (req: any, res: any, next: any) => {
      try {
        const { id: orderId } = req.params;
        const restaurantId: string = req.user?.restaurantId;
        const tenantId: string = req.user?.tenantId;
        const userId: string = req.user?.id;
        const { refund_amount, reason_code, notes, method } = req.body;
        if (!refund_amount || parseFloat(refund_amount) <= 0) throw new AppError('VALIDATION_ERROR', 'Invalid refund amount', 400);
        // Verify order belongs to restaurant
        const order = await prisma.order.findFirst({ where: { id: orderId, restaurant_id: restaurantId } });
        if (!order) throw new AppError('NOT_FOUND', 'Order not found', 404);
        if (order.payment_status !== 'PAID') throw new AppError('VALIDATION_ERROR', 'Can only refund paid orders', 400);
        const refund = await prisma.refund.create({
          data: {
            tenant_id: tenantId,
            restaurant_id: restaurantId,
            order_id: orderId,
            refund_amount: parseFloat(refund_amount),
            reason_code: reason_code || null,
            notes: notes || null,
            method: method || 'CASH',
            approved_by: userId || null,
          },
        });
        res.status(201).json({ data: refund });
      } catch (err) { next(err); }
    }
  );

  router.get(
    "/:id/refunds",
    rateLimiters.default,
    authMiddleware,
    tenantMiddleware,
    async (req: any, res: any, next: any) => {
      try {
        const { id: orderId } = req.params;
        const restaurantId: string = req.user?.restaurantId;
        const refunds = await prisma.refund.findMany({
          where: { order_id: orderId, restaurant_id: restaurantId },
          orderBy: { created_at: 'desc' },
        });
        res.json({ data: refunds });
      } catch (err) { next(err); }
    }
  );

  // ---- Split Bill ----
  // POST /:id/splits — create splits for an order
  router.post(
    "/:id/splits",
    rateLimiters.default,
    authMiddleware,
    tenantMiddleware,
    async (req: any, res: any, next: any) => {
      try {
        const { id: orderId } = req.params;
        const restaurantId: string = req.user?.restaurantId;
        const { split_type = 'EQUAL', splits } = req.body as {
          split_type?: string;
          splits: { payer_label: string; amount: number; item_assignments?: { order_item_id: string; quantity: number; amount: number }[] }[];
        };

        const order = await prisma.order.findFirst({ where: { id: orderId, restaurant_id: restaurantId } });
        if (!order) throw new AppError('NOT_FOUND', 'Order not found', 404);
        if (order.payment_status === 'PAID') throw new AppError('VALIDATION_ERROR', 'Order already paid', 400);

        // Delete any existing splits for this order
        await prisma.billSplit.deleteMany({ where: { order_id: orderId } });

        const created = await prisma.$transaction(
          splits.map((s) =>
            prisma.billSplit.create({
              data: {
                order_id: orderId,
                split_type: split_type as any,
                payer_label: s.payer_label,
                amount: s.amount,
                item_splits: s.item_assignments
                  ? {
                      create: s.item_assignments.map((ia) => ({
                        order_item_id: ia.order_item_id,
                        quantity: ia.quantity,
                        amount: ia.amount,
                      })),
                    }
                  : undefined,
              },
              include: { item_splits: true },
            })
          )
        );

        res.status(201).json({ data: created });
      } catch (err) { next(err); }
    }
  );

  // GET /:id/splits — list splits for an order
  router.get(
    "/:id/splits",
    rateLimiters.default,
    authMiddleware,
    tenantMiddleware,
    async (req: any, res: any, next: any) => {
      try {
        const { id: orderId } = req.params;
        const restaurantId: string = req.user?.restaurantId;
        const order = await prisma.order.findFirst({ where: { id: orderId, restaurant_id: restaurantId } });
        if (!order) throw new AppError('NOT_FOUND', 'Order not found', 404);
        const splits = await prisma.billSplit.findMany({
          where: { order_id: orderId },
          include: { item_splits: { include: { order_item: { select: { name_snapshot: true, quantity: true } } } } },
          orderBy: { created_at: 'asc' },
        });
        res.json({ data: splits });
      } catch (err) { next(err); }
    }
  );

  // PATCH /:id/splits/:splitId — mark a split as paid
  router.patch(
    "/:id/splits/:splitId",
    rateLimiters.default,
    authMiddleware,
    tenantMiddleware,
    async (req: any, res: any, next: any) => {
      try {
        const { id: orderId, splitId } = req.params;
        const restaurantId: string = req.user?.restaurantId;
        const { payment_method, payment_status } = req.body;

        const order = await prisma.order.findFirst({ where: { id: orderId, restaurant_id: restaurantId } });
        if (!order) throw new AppError('NOT_FOUND', 'Order not found', 404);

        const split = await prisma.billSplit.update({
          where: { id: splitId },
          data: {
            payment_method,
            payment_status: payment_status ?? 'PAID',
            paid_at: payment_status === 'PAID' ? new Date() : undefined,
          },
        });

        // If all splits are paid, mark order as PAID
        const allSplits = await prisma.billSplit.findMany({ where: { order_id: orderId } });
        const allPaid = allSplits.every((s) => s.payment_status === 'PAID');
        if (allPaid) {
          const totalPaid = allSplits.reduce((sum, s) => sum + Number(s.amount), 0);
          await prisma.order.update({
            where: { id: orderId },
            data: {
              payment_status: 'PAID',
              payment_method: payment_method ?? 'CASH',
              payment_amount: totalPaid,
              paid_at: new Date(),
            },
          });
        }

        res.json({ data: split });
      } catch (err) { next(err); }
    }
  );

  return router;
}
