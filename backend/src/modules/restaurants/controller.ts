import type { Request, Response, NextFunction } from 'express';
import { AppError } from '../../middlewares/error.middleware';
import {
  addHall,
  addTable,
  addUser,
  generateTableQrAssets,
  generateAllTableQrAssets,
  getTableQrCodeData,
  setupRestaurant,
  getProfile,
  getSettings,
  getThemeSettings,
  listAllHalls,
  listAllTables,
  listUsers,
  removeHall,
  removeTable,
  removeUser,
  updateHallInfo,
  updateProfile,
  updateSlug,
  updateSettings,
  updateTableInfo,
  updateThemeSettings,
  updateUser,
  getDashboard,
  getUserRestaurantsByTenant,
  uploadRestaurantLogo,
} from './service';
import {
  createHallSchema,
  createRestaurantSchema,
  createRestaurantUserSchema,
  createTableSchema,
  updateHallSchema,
  updateRestaurantProfileSchema,
  updateRestaurantSlugSchema,
  updateRestaurantSettingsSchema,
  updateRestaurantThemeSchema,
  updateRestaurantUserSchema,
  updateTableSchema,
} from './schema';

function requireContext(req: Request) {
  if (!req.user || !req.restaurantId) {
    throw new AppError('FORBIDDEN', 'Restaurant context required', 403);
  }
  return { user: req.user, restaurantId: req.restaurantId };
}

function requireAdmin(req: Request) {
  if (req.user?.restaurantRole !== 'OWNER') {
    throw new AppError('FORBIDDEN', 'Admin role required', 403);
  }
}

function requireAdminOrManager(req: Request) {
  if (req.user?.restaurantRole !== 'OWNER' && req.user?.restaurantRole !== 'MANAGER') {
    throw new AppError('FORBIDDEN', 'Admin or Manager role required', 403);
  }
}

export async function getProfileController(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user) {
      throw new AppError('UNAUTHORIZED', 'Authentication required', 401);
    }

    // If restaurantId is provided in header, use it (multi-restaurant support)
    // Otherwise, fetch the user's primary/first restaurant
    const restaurantId = req.restaurantId;

    if (restaurantId) {
      // Specific restaurant requested
      const profile = await getProfile(req.user.tenantId, req.user.userId, restaurantId);
      return res.json({ data: profile });
    } else {
      // No restaurant ID provided - fetch user's primary restaurant
      const restaurants = await getUserRestaurantsByTenant(req.user.tenantId);

      if (restaurants.length === 0) {
        // No restaurant set up yet - return 404 so frontend can handle setup flow
        return res.status(404).json({
          error: {
            code: 'NOT_FOUND',
            message: 'No restaurant found. Please complete setup.'
          }
        });
      }

      // Return the first restaurant as default
      const firstRestaurant = restaurants[0];
      if (!firstRestaurant) {
        return res.status(404).json({
          error: {
            code: 'NOT_FOUND',
            message: 'No restaurant found. Please complete setup.'
          }
        });
      }
      const profile = await getProfile(req.user.tenantId, req.user.userId, firstRestaurant.id);
      return res.json({ data: profile });
    }
  } catch (error) {
    return next(error as Error);
  }
}

export async function setupRestaurantController(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user) {
      throw new AppError('UNAUTHORIZED', 'Authentication required', 401);
    }

    const parsed = createRestaurantSchema.safeParse(req.body);
    if (!parsed.success) {
      return next(new AppError('VALIDATION_ERROR', parsed.error.message, 400));
    }

    const restaurant = await setupRestaurant(
      req.user.tenantId,
      req.user.userId,
      parsed.data
    );

    return res.status(201).json({ data: restaurant });
  } catch (error) {
    return next(error as Error);
  }
}

export async function updateProfileController(req: Request, res: Response, next: NextFunction) {
  try {
    requireAdminOrManager(req);
    const { user, restaurantId } = requireContext(req);
    const parsed = updateRestaurantProfileSchema.safeParse(req.body);
    if (!parsed.success) {
      return next(new AppError('VALIDATION_ERROR', parsed.error.message, 400));
    }

    const profile = await updateProfile(user.tenantId, user.userId, user.restaurantRole as string, restaurantId, parsed.data);
    return res.json({ data: profile });
  } catch (error) {
    return next(error as Error);
  }
}

export async function updateSlugController(req: Request, res: Response, next: NextFunction) {
  try {
    requireAdmin(req);
    const { user, restaurantId } = requireContext(req);
    const parsed = updateRestaurantSlugSchema.safeParse(req.body);
    if (!parsed.success) {
      return next(new AppError('VALIDATION_ERROR', parsed.error.message, 400));
    }

    const restaurant = await updateSlug(user.tenantId, user.userId, restaurantId, parsed.data.slug);
    return res.json({ data: restaurant, message: 'Slug updated successfully. Note: Existing QR codes and shared links will need to be updated.' });
  } catch (error) {
    return next(error as Error);
  }
}

export async function getSettingsController(req: Request, res: Response, next: NextFunction) {
  try {
    const { restaurantId } = requireContext(req);
    const settings = await getSettings(restaurantId);
    return res.json({ data: settings });
  } catch (error) {
    return next(error as Error);
  }
}

export async function uploadLogoController(req: Request, res: Response, next: NextFunction) {
  try {
    requireAdminOrManager(req);
    const { user, restaurantId } = requireContext(req);

    if (!req.file) {
      throw new AppError('VALIDATION_ERROR', 'No file uploaded', 400);
    }

    const logoUrl = await uploadRestaurantLogo(
      user.tenantId,
      user.userId,
      restaurantId,
      req.file.buffer,
      req.file.mimetype
    );

    return res.json({ data: { logo_url: logoUrl } });
  } catch (error) {
    return next(error as Error);
  }
}

export async function updateSettingsController(req: Request, res: Response, next: NextFunction) {
  try {
    requireAdmin(req);
    const { user, restaurantId } = requireContext(req);
    const parsed = updateRestaurantSettingsSchema.safeParse(req.body);
    if (!parsed.success) {
      return next(new AppError('VALIDATION_ERROR', parsed.error.message, 400));
    }

    const settings = await updateSettings(user.tenantId, user.userId, restaurantId, parsed.data);
    return res.json({ data: settings });
  } catch (error) {
    return next(error as Error);
  }
}

export async function getThemeController(req: Request, res: Response, next: NextFunction) {
  try {
    const { restaurantId } = requireContext(req);
    const theme = await getThemeSettings(restaurantId);
    return res.json({ data: theme });
  } catch (error) {
    return next(error as Error);
  }
}

export async function updateThemeController(req: Request, res: Response, next: NextFunction) {
  try {
    requireAdmin(req);
    const { user, restaurantId } = requireContext(req);
    const parsed = updateRestaurantThemeSchema.safeParse(req.body);
    if (!parsed.success) {
      return next(new AppError('VALIDATION_ERROR', parsed.error.message, 400));
    }

    const theme = await updateThemeSettings(user.tenantId, user.userId, restaurantId, parsed.data);
    return res.json({ data: theme });
  } catch (error) {
    return next(error as Error);
  }
}

export async function listUsersController(req: Request, res: Response, next: NextFunction) {
  try {
    const { restaurantId } = requireContext(req);
    const users = await listUsers(restaurantId);
    return res.json({ data: users });
  } catch (error) {
    return next(error as Error);
  }
}

export async function createUserController(req: Request, res: Response, next: NextFunction) {
  try {
    const restaurantRole = req.user?.restaurantRole;
    if (restaurantRole !== 'OWNER' && restaurantRole !== 'MANAGER') {
      throw new AppError('FORBIDDEN', 'Admin or Manager role required', 403);
    }
    const { user, restaurantId } = requireContext(req);
    const parsed = createRestaurantUserSchema.safeParse(req.body);
    if (!parsed.success) {
      return next(new AppError('VALIDATION_ERROR', parsed.error.message, 400));
    }
    if (restaurantRole === 'MANAGER' && parsed.data.role !== 'WAITER') {
      return next(new AppError('FORBIDDEN', 'Managers can only add waiter-role staff', 403));
    }
    const result = await addUser(user.tenantId, user.userId, restaurantId, parsed.data);
    return res.status(201).json({ data: result });
  } catch (error) {
    return next(error as Error);
  }
}

export async function updateUserController(req: Request, res: Response, next: NextFunction) {
  try {
    requireAdmin(req);
    const { user, restaurantId } = requireContext(req);
    const parsed = updateRestaurantUserSchema.safeParse(req.body);
    if (!parsed.success) {
      return next(new AppError('VALIDATION_ERROR', parsed.error.message, 400));
    }
    const result = await updateUser(
      user.tenantId,
      user.userId,
      restaurantId,
      req.params.id as string,
      parsed.data
    );
    return res.json({ data: result });
  } catch (error) {
    return next(error as Error);
  }
}

export async function deleteUserController(req: Request, res: Response, next: NextFunction) {
  try {
    requireAdmin(req);
    const { user, restaurantId } = requireContext(req);
    const result = await removeUser(
      user.tenantId,
      user.userId,
      restaurantId,
      req.params.id as string
    );
    return res.json(result);
  } catch (error) {
    return next(error as Error);
  }
}

export async function listHallsController(req: Request, res: Response, next: NextFunction) {
  try {
    requireAdminOrManager(req);
    const { restaurantId } = requireContext(req);
    const halls = await listAllHalls(restaurantId);
    return res.json({ data: halls });
  } catch (error) {
    return next(error as Error);
  }
}

export async function createHallController(req: Request, res: Response, next: NextFunction) {
  try {
    requireAdminOrManager(req);
    const { user, restaurantId } = requireContext(req);
    const parsed = createHallSchema.safeParse(req.body);
    if (!parsed.success) {
      return next(new AppError('VALIDATION_ERROR', parsed.error.message, 400));
    }
    const hall = await addHall(user.tenantId, user.userId, restaurantId, parsed.data);
    return res.status(201).json({ data: hall });
  } catch (error) {
    return next(error as Error);
  }
}

export async function updateHallController(req: Request, res: Response, next: NextFunction) {
  try {
    requireAdminOrManager(req);
    const { user } = requireContext(req);
    const parsed = updateHallSchema.safeParse(req.body);
    if (!parsed.success) {
      return next(new AppError('VALIDATION_ERROR', parsed.error.message, 400));
    }
    const hall = await updateHallInfo(user.tenantId, user.userId, req.params.id as string, parsed.data);
    return res.json({ data: hall });
  } catch (error) {
    return next(error as Error);
  }
}

export async function deleteHallController(req: Request, res: Response, next: NextFunction) {
  try {
    requireAdminOrManager(req);
    const { user } = requireContext(req);
    const result = await removeHall(user.tenantId, user.userId, req.params.id as string);
    return res.json(result);
  } catch (error) {
    return next(error as Error);
  }
}

export async function listTablesController(req: Request, res: Response, next: NextFunction) {
  try {
    const role = req.user?.restaurantRole;
    if (role !== 'OWNER' && role !== 'MANAGER' && role !== 'WAITER') {
      throw new AppError('FORBIDDEN', 'Staff role required', 403);
    }
    const { restaurantId } = requireContext(req);
    const tables = await listAllTables(restaurantId);
    return res.json({ data: tables });
  } catch (error) {
    return next(error as Error);
  }
}

export async function createTableController(req: Request, res: Response, next: NextFunction) {
  try {
    requireAdminOrManager(req);
    const { user, restaurantId } = requireContext(req);
    const parsed = createTableSchema.safeParse(req.body);
    if (!parsed.success) {
      return next(new AppError('VALIDATION_ERROR', parsed.error.message, 400));
    }
    const table = await addTable(user.tenantId, user.userId, restaurantId, parsed.data);
    return res.status(201).json({ data: table });
  } catch (error) {
    return next(error as Error);
  }
}

export async function updateTableController(req: Request, res: Response, next: NextFunction) {
  try {
    requireAdminOrManager(req);
    const { user } = requireContext(req);
    const parsed = updateTableSchema.safeParse(req.body);
    if (!parsed.success) {
      return next(new AppError('VALIDATION_ERROR', parsed.error.message, 400));
    }
    const table = await updateTableInfo(user.tenantId, user.userId, req.params.id as string, parsed.data);
    return res.json({ data: table });
  } catch (error) {
    return next(error as Error);
  }
}

export async function deleteTableController(req: Request, res: Response, next: NextFunction) {
  try {
    requireAdminOrManager(req);
    const { user } = requireContext(req);
    const result = await removeTable(user.tenantId, user.userId, req.params.id as string);
    return res.json(result);
  } catch (error) {
    return next(error as Error);
  }
}

export async function generateTableQrController(req: Request, res: Response, next: NextFunction) {
  try {
    requireAdminOrManager(req);
    const { user, restaurantId } = requireContext(req);

    // Try to fetch existing QR code from database first
    try {
      const qrCode = await getTableQrCodeData(
        user.tenantId,
        restaurantId,
        req.params.id as string
      );
      return res.json({ data: qrCode });
    } catch (error: any) {
      // If QR code doesn't exist, generate it
      if (error.code === 'NOT_FOUND') {
        const result = await generateTableQrAssets(
          user.tenantId,
          user.userId,
          restaurantId,
          req.params.id as string
        );
        return res.json({ data: result });
      }
      throw error;
    }
  } catch (error) {
    return next(error as Error);
  }
}

export async function regenerateAllQrController(req: Request, res: Response, next: NextFunction) {
  try {
    requireAdminOrManager(req);
    const { user, restaurantId } = requireContext(req);
    const result = await generateAllTableQrAssets(user.tenantId, user.userId, restaurantId);
    return res.json({ data: result });
  } catch (error) {
    return next(error as Error);
  }
}

// Dashboard Analytics
export async function getDashboardController(req: Request, res: Response, next: NextFunction) {
  try {
    const { user, restaurantId } = requireContext(req);
    const dashboard = await getDashboard(user.tenantId, restaurantId);
    return res.json({ data: dashboard });
  } catch (error) {
    return next(error as Error);
  }
}

// List User's Restaurants (for multi-restaurant switcher)
export async function getRestaurantsController(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user) {
      throw new AppError('UNAUTHORIZED', 'Authentication required', 401);
    }
    const restaurants = await getUserRestaurantsByTenant(req.user.tenantId);
    return res.json({ data: restaurants });
  } catch (error) {
    return next(error as Error);
  }
}
