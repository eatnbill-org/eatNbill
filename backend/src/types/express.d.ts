import { Role } from '../middlewares/require-role.middleware';
import type { IntegrationPlatform } from '@prisma/client';

declare global {
  namespace Express {
    interface Request {
      // Tenant-level user context
      user?: {
        userId: string;
        tenantId: string;
        role: Role;
        tenantPlan?: string;
        allowedRestaurantIds: string[];
        restaurantRoles?: Record<string, string>; // Map of restaurantId -> role
        restaurantRole?: Role;
      };
      tenantId?: string;
      restaurantId?: string;
      
      // Platform-level admin context (separate from tenant users)
      adminUser?: {
        adminId: string;
        email: string;
        name?: string | null;
      };
      
      // Impersonation context
      impersonating?: {
        userId: string;
        tenantId: string;
        role: Role;
      };
      
      // Integration webhook context
      integrationConfig?: {
        id: string;
        platform: IntegrationPlatform;
        tenant_id: string;
        restaurant_id: string;
        auto_accept: boolean;
      };
      webhookLogId?: string;
      rawBody?: string;
    }
  }
}

export {};
