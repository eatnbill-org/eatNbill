import type { Request, Response, NextFunction } from "express";
import * as service from "./service";
import {
  createPublicOrderSchema,
  createInternalOrderSchema,
  updateOrderStatusSchema,
  listOrdersQuerySchema,
  addOrderItemsSchema,
  updateOrderItemSchema,
  billsQuerySchema,
  updatePaymentSchema,
} from "./schema";
import { AppError } from "../../middlewares/error.middleware";

/**
 * POST /public/:restaurant_slug/orders
 * Public order placement (no auth, rate limited)
 */
export async function placePublicOrder(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const restaurant_slug = req.params.restaurant_slug as string | undefined;
    const tableParam = req.query.table;

    if (!restaurant_slug || Array.isArray(restaurant_slug)) {
      return next(
        new AppError("VALIDATION_ERROR", "Restaurant slug is required", 400)
      );
    }

    const parsed = createPublicOrderSchema.safeParse(req.body);
    if (!parsed.success) {
      return next(
        new AppError("VALIDATION_ERROR", parsed.error.message, 400)
      );
    }

    if (tableParam && typeof tableParam !== 'string') {
      return next(
        new AppError("VALIDATION_ERROR", "Invalid table parameter", 400)
      );
    }

    const tableId = typeof tableParam === 'string' ? tableParam : undefined;

    const order = await service.placePublicOrder(restaurant_slug, {
      ...parsed.data,
      table_id: tableId,
    });

    return res.status(201).json({
      success: true,
      message: "Order placed successfully",
      data: order,
    });
  } catch (error) {
    return next(error);
  }
}

/**
 * POST /orders
 * Create internal order (staff only)
 */
export async function createInternalOrder(
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
    // Verify access to restaurant
    if (!allowedRestaurantIds.includes(restaurantId)) {
      return next(
        new AppError("FORBIDDEN", "Access denied to this restaurant", 403)
      );
    }

    const parsed = createInternalOrderSchema.safeParse(req.body);
    if (!parsed.success) {
      return next(
        new AppError("VALIDATION_ERROR", parsed.error.message, 400)
      );
    }

    const order = await service.createInternalOrder(
      tenantId,
      restaurantId,
      parsed.data
    );

    return res.status(201).json({
      success: true,
      message: "Order created successfully",
      data: order,
    });
  } catch (error) {
    return next(error);
  }
}

/**
 * GET /orders
 * List orders for a restaurant (auth required)
 */
export async function listOrders(
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

    const parsed = listOrdersQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return next(
        new AppError("VALIDATION_ERROR", parsed.error.message, 400)
      );
    }

    const result = await service.listOrders(tenantId, restaurantId, parsed.data);

    return res.json({
      success: true,
      data: result.orders,
      pagination: result.pagination,
    });
  } catch (error) {
    return next(error);
  }
}

/**
 * GET /orders/:id
 * Get single order (auth required)
 */
export async function getOrder(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { tenantId, allowedRestaurantIds } = req.user!;
    const id = req.params.id as string | undefined;

    if (!id || Array.isArray(id)) {
      return next(
        new AppError("VALIDATION_ERROR", "Order ID is required", 400)
      );
    }

    const order = await service.getOrder(tenantId, id);

    // Verify access to this order's restaurant
    if (!allowedRestaurantIds.includes(order.restaurant_id)) {
      return next(
        new AppError("FORBIDDEN", "Access denied to this order", 403)
      );
    }

    return res.json({
      success: true,
      data: order,
    });
  } catch (error) {
    return next(error);
  }
}

/**
 * PATCH /orders/:id/status
 * Update order status (auth required)
 */
export async function updateOrderStatus(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { tenantId, allowedRestaurantIds } = req.user!;
    const id = req.params.id as string | undefined;

    if (!id || Array.isArray(id)) {
      return next(
        new AppError("VALIDATION_ERROR", "Order ID is required", 400)
      );
    }

    // First get the order to check restaurant access
    const order = await service.getOrder(tenantId, id);

    if (!allowedRestaurantIds.includes(order.restaurant_id)) {
      return next(
        new AppError("FORBIDDEN", "Access denied to this order", 403)
      );
    }

    const parsed = updateOrderStatusSchema.safeParse(req.body);
    if (!parsed.success) {
      return next(
        new AppError("VALIDATION_ERROR", parsed.error.message, 400)
      );
    }

    const updated = await service.updateOrderStatus(tenantId, id, parsed.data);

    return res.json({
      success: true,
      message: `Order status updated to ${parsed.data.status}`,
      data: updated,
    });
  } catch (error) {
    return next(error);
  }
}

/**
 * GET /orders/stats
 * Get today's order stats for dashboard
 */
export async function getOrderStats(
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

    const stats = await service.getOrderStats(tenantId, restaurantId);

    return res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    return next(error);
  }
}

/**
 * POST /orders/:id/items
 * Add items to an existing order
 */
export async function addOrderItems(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { tenantId, allowedRestaurantIds } = req.user!;
    const id = req.params.id as string | undefined;

    if (!id || Array.isArray(id)) {
      return next(new AppError("VALIDATION_ERROR", "Order ID is required", 400));
    }

    const order = await service.getOrder(tenantId, id);
    if (!allowedRestaurantIds.includes(order.restaurant_id)) {
      return next(new AppError("FORBIDDEN", "Access denied to this order", 403));
    }

    const parsed = addOrderItemsSchema.safeParse(req.body);
    if (!parsed.success) {
      return next(new AppError("VALIDATION_ERROR", parsed.error.message, 400));
    }

    const updated = await service.addItemsToOrder(tenantId, id, parsed.data.items);
    return res.json({ success: true, data: updated });
  } catch (error) {
    return next(error);
  }
}

/**
 * PATCH /orders/:id/items/:itemId
 * Update order item
 */
export async function updateOrderItem(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { tenantId, allowedRestaurantIds } = req.user!;
    const id = req.params.id as string | undefined;
    const itemId = req.params.itemId as string | undefined;

    if (!id || Array.isArray(id)) {
      return next(new AppError("VALIDATION_ERROR", "Order ID is required", 400));
    }
    if (!itemId || Array.isArray(itemId)) {
      return next(new AppError("VALIDATION_ERROR", "Order item ID is required", 400));
    }

    const order = await service.getOrder(tenantId, id);
    if (!allowedRestaurantIds.includes(order.restaurant_id)) {
      return next(new AppError("FORBIDDEN", "Access denied to this order", 403));
    }

    const parsed = updateOrderItemSchema.safeParse(req.body);
    if (!parsed.success) {
      return next(new AppError("VALIDATION_ERROR", parsed.error.message, 400));
    }

    const updated = await service.updateOrderItem(tenantId, id, itemId, parsed.data);
    return res.json({ success: true, data: updated });
  } catch (error) {
    return next(error);
  }
}

/**
 * DELETE /orders/:id/items/:itemId
 * Remove item from order
 */
export async function removeOrderItem(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { tenantId, allowedRestaurantIds } = req.user!;
    const id = req.params.id as string | undefined;
    const itemId = req.params.itemId as string | undefined;

    if (!id || Array.isArray(id)) {
      return next(new AppError("VALIDATION_ERROR", "Order ID is required", 400));
    }
    if (!itemId || Array.isArray(itemId)) {
      return next(new AppError("VALIDATION_ERROR", "Order item ID is required", 400));
    }

    const order = await service.getOrder(tenantId, id);
    if (!allowedRestaurantIds.includes(order.restaurant_id)) {
      return next(new AppError("FORBIDDEN", "Access denied to this order", 403));
    }

    const updated = await service.removeOrderItem(tenantId, id, itemId);
    return res.json({ success: true, data: updated });
  } catch (error) {
    return next(error);
  }
}

/**
 * GET /orders/bills/table/:tableId
 * Final bill for a table (open order)
 */
export async function getTableBill(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { tenantId, allowedRestaurantIds } = req.user!;
    const restaurantId = req.restaurantId;
    const tableId = req.params.tableId as string | undefined;

    if (!restaurantId) {
      return next(new AppError("VALIDATION_ERROR", "Restaurant ID is required", 400));
    }
    if (!tableId || Array.isArray(tableId)) {
      return next(new AppError("VALIDATION_ERROR", "Table ID is required", 400));
    }
    if (!allowedRestaurantIds.includes(restaurantId)) {
      return next(new AppError("FORBIDDEN", "Access denied to this restaurant", 403));
    }

    const bill = await service.getTableBill(tenantId, restaurantId, tableId);
    return res.json({ success: true, data: bill });
  } catch (error) {
    return next(error);
  }
}

/**
 * GET /orders/bills/today
 * All bills for a day (completed orders)
 */
export async function getDailyBills(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { tenantId, allowedRestaurantIds } = req.user!;
    const restaurantId = req.restaurantId;

    if (!restaurantId) {
      return next(new AppError("VALIDATION_ERROR", "Restaurant ID is required", 400));
    }
    if (!allowedRestaurantIds.includes(restaurantId)) {
      return next(new AppError("FORBIDDEN", "Access denied to this restaurant", 403));
    }

    const parsed = billsQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return next(new AppError("VALIDATION_ERROR", parsed.error.message, 400));
    }

    const result = await service.getDailyBills(tenantId, restaurantId, parsed.data.date);
    return res.json({ success: true, data: result });
  } catch (error) {
    return next(error);
  }
}

/**
 * GET /orders/summary
 * Revenue summary for dashboard (day/week/month)
 */
export async function getRevenueSummary(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { tenantId, allowedRestaurantIds } = req.user!;
    const restaurantId = req.restaurantId;

    if (!restaurantId) {
      return next(new AppError("VALIDATION_ERROR", "Restaurant ID is required", 400));
    }
    if (!allowedRestaurantIds.includes(restaurantId)) {
      return next(new AppError("FORBIDDEN", "Access denied to this restaurant", 403));
    }

    const summary = await service.getRevenueDashboard(tenantId, restaurantId);
    return res.json({ success: true, data: summary });
  } catch (error) {
    return next(error);
  }
}

/**
 * PATCH /orders/:id/payment
 * Update payment method/status
 */
export async function updateOrderPayment(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { tenantId, allowedRestaurantIds } = req.user!;
    const id = req.params.id as string | undefined;

    if (!id || Array.isArray(id)) {
      return next(new AppError("VALIDATION_ERROR", "Order ID is required", 400));
    }

    const order = await service.getOrder(tenantId, id);
    if (!allowedRestaurantIds.includes(order.restaurant_id)) {
      return next(new AppError("FORBIDDEN", "Access denied to this order", 403));
    }

    const parsed = updatePaymentSchema.safeParse(req.body);
    if (!parsed.success) {
      return next(new AppError("VALIDATION_ERROR", parsed.error.message, 400));
    }

    const updated = await service.updatePayment(tenantId, id, parsed.data);
    return res.json({ success: true, data: updated });
  } catch (error) {
    return next(error);
  }
}

/**
 * DELETE /orders/:id
 * Delete an order
 */
export async function deleteOrder(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { tenantId, allowedRestaurantIds } = req.user!;
    const id = req.params.id as string | undefined;

    if (!id || Array.isArray(id)) {
      return next(new AppError("VALIDATION_ERROR", "Order ID is required", 400));
    }

    // First get the order to check restaurant access
    const order = await service.getOrder(tenantId, id);

    if (!allowedRestaurantIds.includes(order.restaurant_id)) {
      return next(new AppError("FORBIDDEN", "Access denied to this order", 403));
    }

    await service.deleteOrder(tenantId, id);

    return res.json({
      success: true,
      message: "Order deleted successfully",
    });
  } catch (error) {
    return next(error);
  }
}


export async function getAdvancedAnalytics(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { tenantId, allowedRestaurantIds } = req.user!;
    const restaurantId = req.restaurantId;
    const { view, date } = req.query as { view: 'daily' | 'monthly' | 'yearly'; date: string };

    if (!restaurantId) {
      return next(
        new AppError("VALIDATION_ERROR", "Restaurant ID is required", 400)
      );
    }

    // Validated by tenantMiddleware (which handles cache misses for OWNERs)
    // if (!allowedRestaurantIds.includes(restaurantId)) {
    //   return next(
    //     new AppError("FORBIDDEN", "Access denied to this restaurant", 403)
    //   );
    // }

    const stats = await service.getAdvancedAnalytics(
      tenantId,
      restaurantId,
      view || 'daily',
      date || new Date().toISOString()
    );

    return res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    return next(error);
  }
}

/**
 * GET /orders/analytics/udhaar
 * Get high-debt customers (Udhaar list)
 */
export async function getUdhaarList(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { tenantId, allowedRestaurantIds } = req.user!;
    const restaurantId = req.restaurantId;

    if (!restaurantId) {
      return next(new AppError("VALIDATION_ERROR", "Restaurant ID is required", 400));
    }
    if (!allowedRestaurantIds.includes(restaurantId)) {
      return next(new AppError("FORBIDDEN", "Access denied to this restaurant", 403));
    }

    const customers = await service.getUdhaarList(tenantId, restaurantId);
    return res.json({ success: true, data: customers });
  } catch (error) {
    return next(error);
  }
}

/**
 * POST /orders/analytics/settle
 * Settle customer credit
 */
export async function settleCredit(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { tenantId, allowedRestaurantIds } = req.user!;
    const restaurantId = req.restaurantId;

    if (!restaurantId) {
      return next(new AppError("VALIDATION_ERROR", "Restaurant ID is required", 400));
    }
    if (!allowedRestaurantIds.includes(restaurantId)) {
      return next(new AppError("FORBIDDEN", "Access denied to this restaurant", 403));
    }

    const { customer_id, amount } = req.body;

    if (!customer_id) {
      return next(new AppError("VALIDATION_ERROR", "Customer ID is required", 400));
    }
    if (typeof amount !== 'number' || amount <= 0) {
      return next(new AppError("VALIDATION_ERROR", "Valid amount is required", 400));
    }

    const updatedCustomer = await service.settleCredit(tenantId, restaurantId, customer_id, amount);

    return res.json({
      success: true,
      message: "Credit settled successfully",
      data: updatedCustomer
    });
  } catch (error) {
    return next(error);
  }
}
