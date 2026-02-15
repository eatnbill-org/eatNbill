import type { Request, Response, NextFunction } from "express";
import * as service from "./service";
import { updateKdsSettingsSchema } from "./schema";
import { AppError } from "../../middlewares/error.middleware";

/**
 * GET /kds/dashboard
 * Get full KDS dashboard data (orders, counts, settings, server time)
 */
export async function getDashboard(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { tenantId, allowedRestaurantIds } = req.user!;
    const restaurantId = req.restaurantId;

    if (!restaurantId) {
      return next(
        new AppError("VALIDATION_ERROR", "Restaurant ID is required", 400)
      );
    }

    if (!allowedRestaurantIds.includes(restaurantId)) {
      return next(
        new AppError("FORBIDDEN", "Access denied to this restaurant", 403)
      );
    }

    const dashboard = await service.getKdsDashboard(tenantId, restaurantId);

    return res.json({
      success: true,
      data: dashboard,
    });
  } catch (error) {
    return next(error);
  }
}

/**
 * GET /kds/orders
 * Get active orders for KDS display
 */
export async function getOrders(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { tenantId, allowedRestaurantIds } = req.user!;
    const restaurantId = req.restaurantId;

    if (!restaurantId) {
      return next(
        new AppError("VALIDATION_ERROR", "Restaurant ID is required", 400)
      );
    }

    if (!allowedRestaurantIds.includes(restaurantId)) {
      return next(
        new AppError("FORBIDDEN", "Access denied to this restaurant", 403)
      );
    }

    const orders = await service.getActiveOrders(tenantId, restaurantId);

    return res.json({
      success: true,
      data: {
        orders,
        server_time: new Date().toISOString(),
      },
    });
  } catch (error) {
    return next(error);
  }
}

/**
 * GET /kds/orders/:id
 * Get a single order for KDS display
 */
export async function getOrder(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { tenantId, allowedRestaurantIds } = req.user!;
    const restaurantId = req.restaurantId;
    const orderId = req.params.id;

    if (!restaurantId) {
      return next(
        new AppError("VALIDATION_ERROR", "Restaurant ID is required", 400)
      );
    }

    if (!allowedRestaurantIds.includes(restaurantId)) {
      return next(
        new AppError("FORBIDDEN", "Access denied to this restaurant", 403)
      );
    }

    const order = await service.getOrder(tenantId, restaurantId, orderId);

    return res.json({
      success: true,
      data: order,
    });
  } catch (error) {
    return next(error);
  }
}

/**
 * GET /kds/settings
 * Get KDS settings for a restaurant
 */
export async function getSettings(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { allowedRestaurantIds } = req.user!;
    const restaurantId = req.restaurantId;

    if (!restaurantId) {
      return next(
        new AppError("VALIDATION_ERROR", "Restaurant ID is required", 400)
      );
    }

    if (!allowedRestaurantIds.includes(restaurantId)) {
      return next(
        new AppError("FORBIDDEN", "Access denied to this restaurant", 403)
      );
    }

    const settings = await service.getSettings(restaurantId);

    return res.json({
      success: true,
      data: settings,
    });
  } catch (error) {
    return next(error);
  }
}

/**
 * PATCH /kds/settings
 * Update KDS settings for a restaurant
 * Only OWNER and MANAGER can update settings
 */
export async function updateSettings(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { role, allowedRestaurantIds } = req.user!;
    const restaurantId = req.restaurantId;

    if (!restaurantId) {
      return next(
        new AppError("VALIDATION_ERROR", "Restaurant ID is required", 400)
      );
    }

    if (!allowedRestaurantIds.includes(restaurantId)) {
      return next(
        new AppError("FORBIDDEN", "Access denied to this restaurant", 403)
      );
    }

    // Only OWNER and MANAGER can update settings
    if (role !== "OWNER" && role !== "MANAGER") {
      return next(
        new AppError("FORBIDDEN", "Only owners and managers can update KDS settings", 403)
      );
    }

    const parsed = updateKdsSettingsSchema.safeParse(req.body);
    if (!parsed.success) {
      return next(
        new AppError("VALIDATION_ERROR", parsed.error.message, 400)
      );
    }

    const settings = await service.updateSettings(restaurantId, parsed.data);

    return res.json({
      success: true,
      message: "KDS settings updated successfully",
      data: settings,
    });
  } catch (error) {
    return next(error);
  }
}

/**
 * GET /kds/realtime-config
 * Get Supabase Realtime configuration for KDS client
 */
export async function getRealtimeConfig(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { allowedRestaurantIds } = req.user!;
    const restaurantId = req.restaurantId;

    if (!restaurantId) {
      return next(
        new AppError("VALIDATION_ERROR", "Restaurant ID is required", 400)
      );
    }

    if (!allowedRestaurantIds.includes(restaurantId)) {
      return next(
        new AppError("FORBIDDEN", "Access denied to this restaurant", 403)
      );
    }

    const config = service.getRealtimeConfig(restaurantId);

    return res.json({
      success: true,
      data: config,
    });
  } catch (error) {
    return next(error);
  }
}
