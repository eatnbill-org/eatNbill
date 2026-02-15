import type { Request, Response, NextFunction } from 'express';
import { AppError } from '../../middlewares/error.middleware';
import {
  createRestaurantCustomer,
  getRestaurantCustomer,
  listRestaurantCustomers,
  updateRestaurantCustomer,
  updateRestaurantCustomerTags,
  updateRestaurantCustomerCredit,
  getRestaurantCustomerAnalytics,
  getRestaurantCustomerOrders,
  getPublicOrderHistory,
  deleteRestaurantCustomer,
} from './service';
import {
  createCustomerSchema,
  listCustomersQuerySchema,
  updateCustomerSchema,
  updateCustomerTagsSchema,
  customerAnalyticsQuerySchema,
  publicOrderHistorySchema,
  updateCustomerCreditSchema,
} from './schema';

function requireContext(req: Request) {
  if (!req.user || !req.restaurantId) {
    throw new AppError('FORBIDDEN', 'Restaurant context required', 403);
  }
  return { user: req.user, restaurantId: req.restaurantId };
}

export async function listCustomersController(req: Request, res: Response, next: NextFunction) {
  try {
    const { user, restaurantId } = requireContext(req);
    const parsed = listCustomersQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return next(new AppError('VALIDATION_ERROR', parsed.error.message, 400));
    }

    const tags = parsed.data.tags ? parsed.data.tags.split(',') : undefined;
    const result = await listRestaurantCustomers(
      user.tenantId,
      restaurantId,
      parsed.data.search,
      tags,
      parsed.data.page,
      parsed.data.limit
    );
    return res.json(result);
  } catch (error) {
    return next(error as Error);
  }
}

export async function getCustomerController(req: Request, res: Response, next: NextFunction) {
  try {
    const { user, restaurantId } = requireContext(req);
    const customer = await getRestaurantCustomer(
      user.tenantId,
      restaurantId,
      req.params.id as string
    );
    return res.json({ data: customer });
  } catch (error) {
    return next(error as Error);
  }
}

export async function getCustomerOrdersController(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { user, restaurantId } = requireContext(req);
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;

    const result = await getRestaurantCustomerOrders(
      user.tenantId,
      restaurantId,
      req.params.id as string,
      page,
      limit
    );
    return res.json(result);
  } catch (error) {
    return next(error as Error);
  }
}

export async function getCustomerAnalyticsController(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { user, restaurantId } = requireContext(req);
    const parsed = customerAnalyticsQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return next(new AppError('VALIDATION_ERROR', parsed.error.message, 400));
    }

    const analytics = await getRestaurantCustomerAnalytics(
      user.tenantId,
      restaurantId,
      req.params.id as string,
      parsed.data.days
    );
    return res.json({ data: analytics });
  } catch (error) {
    return next(error as Error);
  }
}

export async function createCustomerController(req: Request, res: Response, next: NextFunction) {
  try {
    const { user, restaurantId } = requireContext(req);
    const parsed = createCustomerSchema.safeParse(req.body);
    if (!parsed.success) {
      return next(new AppError('VALIDATION_ERROR', parsed.error.message, 400));
    }

    const customer = await createRestaurantCustomer(
      user.tenantId,
      user.userId,
      restaurantId,
      parsed.data
    );
    return res.status(201).json({ data: customer });
  } catch (error) {
    return next(error as Error);
  }
}

export async function updateCustomerController(req: Request, res: Response, next: NextFunction) {
  try {
    const { user, restaurantId } = requireContext(req);
    const parsed = updateCustomerSchema.safeParse(req.body);
    if (!parsed.success) {
      return next(new AppError('VALIDATION_ERROR', parsed.error.message, 400));
    }

    const customer = await updateRestaurantCustomer(
      user.tenantId,
      user.userId,
      restaurantId,
      req.params.id as string,
      parsed.data
    );
    return res.json({ data: customer });
  } catch (error) {
    return next(error as Error);
  }
}

export async function updateCustomerTagsController(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { user, restaurantId } = requireContext(req);
    const parsed = updateCustomerTagsSchema.safeParse(req.body);
    if (!parsed.success) {
      return next(new AppError('VALIDATION_ERROR', parsed.error.message, 400));
    }

    const customer = await updateRestaurantCustomerTags(
      user.tenantId,
      user.userId,
      restaurantId,
      req.params.id as string,
      parsed.data.tags
    );
    return res.json({ data: customer });
  } catch (error) {
    return next(error as Error);
  }
}

export async function updateCustomerCreditController(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { user, restaurantId } = requireContext(req);
    const parsed = updateCustomerCreditSchema.safeParse(req.body);
    if (!parsed.success) {
      return next(new AppError('VALIDATION_ERROR', parsed.error.message, 400));
    }

    const customer = await updateRestaurantCustomerCredit(
      user.tenantId,
      user.userId,
      restaurantId,
      req.params.id as string,
      parsed.data.amount
    );
    return res.json({ data: customer });
  } catch (error) {
    return next(error as Error);
  }
}

export async function deleteCustomerController(req: Request, res: Response, next: NextFunction) {
  try {
    const { user, restaurantId } = requireContext(req);
    await deleteRestaurantCustomer(
      user.tenantId,
      user.userId,
      restaurantId,
      req.params.id as string
    );
    return res.status(204).send();
  } catch (error) {
    return next(error as Error);
  }
}

// Public endpoint - no authentication required
export async function publicOrderHistoryController(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const parsed = publicOrderHistorySchema.safeParse(req.body);
    if (!parsed.success) {
      return next(new AppError('VALIDATION_ERROR', parsed.error.message, 400));
    }

    const result = await getPublicOrderHistory(
      parsed.data.phone,
      parsed.data.page,
      parsed.data.limit
    );
    return res.json(result);
  } catch (error) {
    return next(error as Error);
  }
}