import { Router } from "express";
import { authMiddleware } from "../../middlewares/auth.middleware";
import { tenantMiddleware } from "../../middlewares/tenant.middleware";
import { rateLimiters } from "../../middlewares";
import * as controller from "./controller";

/**
 * KDS (Kitchen Display System) routes
 * All routes require authentication and restaurant context
 *
 * Realtime updates are handled via Supabase Realtime:
 * - Client authenticates via standard JWT
 * - Client subscribes to postgres_changes on orders table
 * - Filter: restaurant_id=eq.{restaurantId}
 *
 * These REST endpoints provide:
 * - Initial data load (dashboard, orders)
 * - Settings management
 * - Realtime configuration info
 */
export function kdsRoutes() {
  const router = Router();

  // Apply auth and tenant middleware to all KDS routes
  router.use(rateLimiters.default);
  router.use(authMiddleware);
  router.use(tenantMiddleware);

  /**
   * GET /kds/dashboard
   * Full KDS dashboard: orders, counts, settings, server time
   * Use this for initial page load
   */
  router.get("/dashboard", controller.getDashboard);

  /**
   * GET /kds/orders
   * Active orders only (PLACED, CONFIRMED, PREPARING, READY)
   * Use this for order list refresh
   */
  router.get("/orders", controller.getOrders);

  /**
   * GET /kds/orders/:id
   * Single order details
   */
  router.get("/orders/:id", controller.getOrder);

  /**
   * GET /kds/settings
   * KDS settings for the restaurant
   */
  router.get("/settings", controller.getSettings);

  /**
   * PATCH /kds/settings
   * Update KDS settings (OWNER/MANAGER only)
   */
  router.patch("/settings", controller.updateSettings);

  /**
   * GET /kds/realtime-config
   * Get Supabase Realtime subscription configuration
   * Returns channel name, table, filter for client-side setup
   */
  router.get("/realtime-config", controller.getRealtimeConfig);

  return router;
}
