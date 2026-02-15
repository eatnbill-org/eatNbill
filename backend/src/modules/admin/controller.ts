import type { Request, Response, NextFunction } from 'express';
import { logAdminAction } from '../../middlewares/admin.middleware';
import * as service from './service';

// ==========================================
// DASHBOARD
// ==========================================

export async function getDashboardOverviewController(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await service.getDashboardOverview();
    return res.json(result);
  } catch (error) {
    return next(error as Error);
  }
}

// ==========================================
// TENANT MANAGEMENT
// ==========================================

export async function listTenantsController(req: Request, res: Response, next: NextFunction) {
  try {
    const query = req.query as any;
    const result = await service.listTenants(query);
    return res.json(result);
  } catch (error) {
    return next(error as Error);
  }
}

export async function getTenantController(req: Request, res: Response, next: NextFunction) {
  try {
    const tenantId = req.params.tenantId as string;
    const result = await service.getTenantById(tenantId);
    return res.json(result);
  } catch (error) {
    return next(error as Error);
  }
}

export async function createTenantController(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await service.createTenant(req.body);
    
    await logAdminAction(
      req.adminUser!.adminId,
      'CREATE_TENANT',
      'TENANT',
      result.id,
      result.id,
      { name: result.name, plan: result.plan },
      req
    );

    return res.status(201).json(result);
  } catch (error) {
    return next(error as Error);
  }
}

export async function updateTenantController(req: Request, res: Response, next: NextFunction) {
  try {
    const tenantId = req.params.tenantId as string;
    const result = await service.updateTenant(tenantId, req.body);
    
    await logAdminAction(
      req.adminUser!.adminId,
      'UPDATE_TENANT',
      'TENANT',
      tenantId,
      tenantId,
      req.body,
      req
    );

    return res.json(result);
  } catch (error) {
    return next(error as Error);
  }
}

export async function suspendTenantController(req: Request, res: Response, next: NextFunction) {
  try {
    const tenantId = req.params.tenantId as string;
    const { reason } = req.body || {};
    const result = await service.suspendTenant(tenantId, reason);
    
    await logAdminAction(
      req.adminUser!.adminId,
      'SUSPEND_TENANT',
      'TENANT',
      tenantId,
      tenantId,
      { reason },
      req
    );

    return res.json(result);
  } catch (error) {
    return next(error as Error);
  }
}

export async function activateTenantController(req: Request, res: Response, next: NextFunction) {
  try {
    const tenantId = req.params.tenantId as string;
    const result = await service.activateTenant(tenantId);
    
    await logAdminAction(
      req.adminUser!.adminId,
      'ACTIVATE_TENANT',
      'TENANT',
      tenantId,
      tenantId,
      {},
      req
    );

    return res.json(result);
  } catch (error) {
    return next(error as Error);
  }
}

// ==========================================
// RESTAURANT MANAGEMENT
// ==========================================

export async function listRestaurantsController(req: Request, res: Response, next: NextFunction) {
  try {
    const query = req.query as any;
    const result = await service.listRestaurants(query);
    return res.json(result);
  } catch (error) {
    return next(error as Error);
  }
}

export async function getRestaurantController(req: Request, res: Response, next: NextFunction) {
  try {
    const restaurantId = req.params.restaurantId as string;
    const result = await service.getRestaurantById(restaurantId);
    return res.json(result);
  } catch (error) {
    return next(error as Error);
  }
}

export async function createRestaurantController(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await service.createRestaurant(req.body);
    
    await logAdminAction(
      req.adminUser!.adminId,
      'CREATE_RESTAURANT',
      'RESTAURANT',
      result.id,
      req.body.tenantId,
      { name: result.name, slug: result.slug },
      req
    );

    return res.status(201).json(result);
  } catch (error) {
    return next(error as Error);
  }
}

export async function updateRestaurantController(req: Request, res: Response, next: NextFunction) {
  try {
    const restaurantId = req.params.restaurantId as string;
    const result = await service.updateRestaurant(restaurantId, req.body);
    
    await logAdminAction(
      req.adminUser!.adminId,
      'UPDATE_RESTAURANT',
      'RESTAURANT',
      restaurantId,
      result.tenant_id,
      req.body,
      req
    );

    return res.json(result);
  } catch (error) {
    return next(error as Error);
  }
}

export async function deleteRestaurantController(req: Request, res: Response, next: NextFunction) {
  try {
    const restaurantId = req.params.restaurantId as string;
    const restaurant = await service.getRestaurantById(restaurantId);
    await service.deleteRestaurant(restaurantId);
    
    await logAdminAction(
      req.adminUser!.adminId,
      'DELETE_RESTAURANT',
      'RESTAURANT',
      restaurantId,
      restaurant.tenant_id,
      {},
      req
    );

    return res.json({ success: true, message: 'Restaurant deleted' });
  } catch (error) {
    return next(error as Error);
  }
}

// ==========================================
// USER MANAGEMENT
// ==========================================

export async function listUsersController(req: Request, res: Response, next: NextFunction) {
  try {
    const query = req.query as any;
    const result = await service.listUsers(query);
    return res.json(result);
  } catch (error) {
    return next(error as Error);
  }
}

export async function getUserController(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.params.userId as string;
    const result = await service.getUserById(userId);
    return res.json(result);
  } catch (error) {
    return next(error as Error);
  }
}

export async function createOwnerController(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await service.createOwner(req.body);
    
    await logAdminAction(
      req.adminUser!.adminId,
      'CREATE_OWNER',
      'USER',
      result.id,
      req.body.tenantId,
      { email: req.body.email },
      req
    );

    return res.status(201).json(result);
  } catch (error) {
    return next(error as Error);
  }
}

// ==========================================
// SUBSCRIPTION MANAGEMENT
// ==========================================

export async function listSubscriptionsController(req: Request, res: Response, next: NextFunction) {
  try {
    const query = req.query as any;
    const result = await service.listSubscriptions(query);
    return res.json(result);
  } catch (error) {
    return next(error as Error);
  }
}

export async function updateSubscriptionController(req: Request, res: Response, next: NextFunction) {
  try {
    const tenantId = req.params.tenantId as string;
    const result = await service.updateSubscription(tenantId, req.body);
    
    await logAdminAction(
      req.adminUser!.adminId,
      'UPDATE_SUBSCRIPTION',
      'TENANT',
      tenantId,
      tenantId,
      req.body,
      req
    );

    return res.json(result);
  } catch (error) {
    return next(error as Error);
  }
}

// ==========================================
// IMPERSONATION
// ==========================================

export async function impersonateController(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await service.impersonate(req.body);
    
    await logAdminAction(
      req.adminUser!.adminId,
      'IMPERSONATE',
      'USER',
      req.body.userId,
      req.body.tenantId,
      { impersonating: req.body.userId },
      req
    );

    return res.json(result);
  } catch (error) {
    return next(error as Error);
  }
}

// ==========================================
// AUDIT LOGS
// ==========================================

export async function listAuditLogsController(req: Request, res: Response, next: NextFunction) {
  try {
    const query = req.query as any;
    const result = await service.listAuditLogs(query);
    return res.json(result);
  } catch (error) {
    return next(error as Error);
  }
}

// ==========================================
// SYSTEM HEALTH
// ==========================================

export async function getHealthController(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await service.getSystemHealth();
    return res.json(result);
  } catch (error) {
    return next(error as Error);
  }
}

// ==========================================
// INTEGRATION WEBHOOK MANAGEMENT
// ==========================================

export async function listAllWebhookLogsController(req: Request, res: Response, next: NextFunction) {
  try {
    const query = req.query as any;
    const result = await service.listAllWebhookLogs(query);
    return res.json(result);
  } catch (error) {
    return next(error as Error);
  }
}

export async function replayWebhookController(req: Request, res: Response, next: NextFunction) {
  try {
    const logId = req.params.logId as string;
    const adminId = req.adminUser!.adminId;
    
    const result = await service.replayWebhook(logId, adminId);
    
    await logAdminAction(
      adminId,
      'REPLAY_WEBHOOK',
      'WEBHOOK_LOG',
      logId,
      undefined, // tenant_id not needed for replay audit
      { 
        success: result.success, 
        order_id: result.order_id,
        is_duplicate: result.is_duplicate 
      },
      req
    );

    return res.json({
      success: result.success,
      message: result.success
        ? result.is_duplicate
          ? 'Order already exists (idempotent)'
          : 'Webhook replayed successfully'
        : 'Replay failed',
      data: {
        order_id: result.order_id,
        order_number: result.order_number,
        is_duplicate: result.is_duplicate,
        error: result.error,
      },
    });
  } catch (error) {
    return next(error as Error);
  }
}
