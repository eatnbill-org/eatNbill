import { Router } from "express";
import * as controller from "./controller";
import { authMiddleware } from "../../middlewares/auth.middleware";
import { requireRole } from "../../middlewares/role.middleware";
import { tenantMiddleware } from "../../middlewares/tenant.middleware";
import { preserveRawBody, verifyWebhookSignature, webhookRateLimiter } from "./middleware/webhook.middleware";

const router = Router();

// ==========================================
// Public Webhook Routes (No auth required)
// ==========================================

/**
 * POST /integrations/zomato/webhook
 * Zomato order webhook
 * - No authentication (webhook from Zomato)
 * - Raw body preserved for signature verification
 * - Rate limited per IP
 * - Signature verified against stored secret
 */
router.post(
  "/zomato/webhook",
  webhookRateLimiter,
  preserveRawBody,
  verifyWebhookSignature("ZOMATO"),
  controller.handleZomatoWebhook
);

/**
 * POST /integrations/swiggy/webhook
 * Swiggy order webhook
 * - No authentication (webhook from Swiggy)
 * - Raw body preserved for signature verification
 * - Rate limited per IP
 * - Signature verified against stored secret
 */
router.post(
  "/swiggy/webhook",
  webhookRateLimiter,
  preserveRawBody,
  verifyWebhookSignature("SWIGGY"),
  controller.handleSwiggyWebhook
);

// ==========================================
// Protected Routes (Tenant auth required)
// ==========================================

// All routes below require authentication
router.use(authMiddleware);
router.use(tenantMiddleware);

// -----------------------------------------
// Config Management (OWNER only)
// -----------------------------------------

/**
 * GET /integrations/config
 * List all integration configs for tenant
 */
router.get("/config", requireRole("OWNER", "MANAGER"), controller.listConfigs);

/**
 * POST /integrations/config
 * Create new integration config
 * Body: { platform, external_restaurant_id, is_enabled, auto_accept }
 */
router.post("/config", requireRole("OWNER", "MANAGER"), controller.createConfig);

/**
 * PATCH /integrations/config/:id
 * Update integration config
 * Body: { is_enabled?, auto_accept?, regenerate_secret? }
 */
router.patch("/config/:id", requireRole("OWNER", "MANAGER"), controller.updateConfig);

/**
 * DELETE /integrations/config/:id
 * Delete integration config (soft delete)
 */
router.delete("/config/:id", requireRole("OWNER", "MANAGER"), controller.deleteConfig);

// -----------------------------------------
// Menu Mapping (OWNER only)
// -----------------------------------------

/**
 * GET /integrations/config/:id/menu-map
 * List menu mappings for config
 */
router.get("/config/:id/menu-map", requireRole("OWNER", "MANAGER"), controller.listMenuMappings);

/**
 * POST /integrations/config/:id/menu-map
 * Create single menu mapping
 * Body: { external_item_id, product_id, external_item_name? }
 */
router.post("/config/:id/menu-map", requireRole("OWNER", "MANAGER"), controller.createMenuMapping);

/**
 * POST /integrations/config/:id/menu-map/bulk
 * Bulk create menu mappings
 * Body: { mappings: [{ external_item_id, product_id, external_item_name? }] }
 */
router.post(
  "/config/:id/menu-map/bulk",
  requireRole("OWNER", "MANAGER"),
  controller.bulkCreateMenuMappings
);

/**
 * DELETE /integrations/menu-map/:mapId
 * Delete menu mapping
 */
router.delete("/menu-map/:mapId", requireRole("OWNER", "MANAGER"), controller.deleteMenuMapping);

// -----------------------------------------
// Webhook Logs (OWNER can view their own)
// -----------------------------------------

/**
 * GET /integrations/logs
 * List webhook logs for tenant
 * Query: { status?, config_id?, page?, limit? }
 */
router.get("/logs", requireRole("OWNER", "MANAGER"), controller.listWebhookLogs);

/**
 * GET /integrations/logs/:id
 * Get webhook log detail
 */
router.get("/logs/:id", requireRole("OWNER", "MANAGER"), controller.getWebhookLogDetail);

export default router;
