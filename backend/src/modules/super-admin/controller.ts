import type { Request, Response, NextFunction } from 'express';
import { logSuperAdminAction } from './middleware';
import * as service from './service';

// ==========================================
// DASHBOARD
// ==========================================

export async function getDashboardOverviewController(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await service.getDashboardOverview();
    return res.json({ success: true, data: result });
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
    return res.json({ success: true, data: result });
  } catch (error) {
    return next(error as Error);
  }
}

export async function getTenantController(req: Request, res: Response, next: NextFunction) {
  try {
    const tenantId = req.params.tenantId as string;
    const result = await service.getTenantById(tenantId);
    return res.json({ success: true, data: result });
  } catch (error) {
    return next(error as Error);
  }
}

export async function createTenantController(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await service.createTenant(req.body);
    
    await logSuperAdminAction(
      req.adminUser!.adminId,
      'CREATE_TENANT',
      'TENANT',
      result.id,
      result.id,
      { name: result.name, plan: result.plan },
      req
    );

    return res.status(201).json({ success: true, data: result });
  } catch (error) {
    return next(error as Error);
  }
}

export async function updateTenantController(req: Request, res: Response, next: NextFunction) {
  try {
    const tenantId = req.params.tenantId as string;
    const result = await service.updateTenant(tenantId, req.body);
    
    await logSuperAdminAction(
      req.adminUser!.adminId,
      'UPDATE_TENANT',
      'TENANT',
      tenantId,
      tenantId,
      req.body,
      req
    );

    return res.json({ success: true, data: result });
  } catch (error) {
    return next(error as Error);
  }
}

export async function suspendTenantController(req: Request, res: Response, next: NextFunction) {
  try {
    const tenantId = req.params.tenantId as string;
    const { reason } = req.body || {};
    const result = await service.suspendTenant(tenantId, reason);
    
    await logSuperAdminAction(
      req.adminUser!.adminId,
      'SUSPEND_TENANT',
      'TENANT',
      tenantId,
      tenantId,
      { reason },
      req
    );

    return res.json({ success: true, data: result });
  } catch (error) {
    return next(error as Error);
  }
}

export async function activateTenantController(req: Request, res: Response, next: NextFunction) {
  try {
    const tenantId = req.params.tenantId as string;
    const result = await service.activateTenant(tenantId);
    
    await logSuperAdminAction(
      req.adminUser!.adminId,
      'ACTIVATE_TENANT',
      'TENANT',
      tenantId,
      tenantId,
      {},
      req
    );

    return res.json({ success: true, data: result });
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
    return res.json({ success: true, data: result });
  } catch (error) {
    return next(error as Error);
  }
}

export async function getRestaurantController(req: Request, res: Response, next: NextFunction) {
  try {
    const restaurantId = req.params.restaurantId as string;
    const result = await service.getRestaurantById(restaurantId);
    return res.json({ success: true, data: result });
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
    return res.json({ success: true, data: result });
  } catch (error) {
    return next(error as Error);
  }
}

export async function getUserController(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.params.userId as string;
    const result = await service.getUserById(userId);
    return res.json({ success: true, data: result });
  } catch (error) {
    return next(error as Error);
  }
}

// ==========================================
// USER ACTIVITY TRACKING
// ==========================================

export async function getUserActivityController(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.params.userId as string;
    const query = req.query as any;
    const result = await service.getUserActivity(userId, query);
    return res.json({ success: true, data: result });
  } catch (error) {
    return next(error as Error);
  }
}

export async function listUserSessionsController(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.params.userId as string;
    const result = await service.listUserSessions(userId);
    return res.json({ success: true, data: result });
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
    return res.json({ success: true, data: result });
  } catch (error) {
    return next(error as Error);
  }
}

// ==========================================
// SYSTEM HEALTH
// ==========================================

export async function getSystemHealthController(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await service.getSystemHealth();
    return res.json({ success: true, data: result });
  } catch (error) {
    return next(error as Error);
  }
}
