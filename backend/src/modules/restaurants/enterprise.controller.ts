import type { NextFunction, Request, Response } from 'express';
import { promises as fs } from 'node:fs';
import { AppError } from '../../middlewares/error.middleware';
import {
  createExportJobSchema,
  createOutletSchema,
  generateEInvoiceSchema,
  invoiceQuerySchema,
  listDayEndQuerySchema,
  listExportJobsQuerySchema,
  closeDayEndSchema,
  unlockDayEndSchema,
  updateMyPreferencesSchema,
  updateOutletSchema,
} from './enterprise.schema';
import {
  addRestaurantOutlet,
  closeDayEnd,
  createExportJob,
  editRestaurantOutlet,
  generateEInvoice,
  getDayEndDetails,
  getDayEndList,
  getExportJob,
  getGstInvoice,
  getMyPreferences,
  listExportJobs,
  listRestaurantOutlets,
  resolveExportStoragePath,
  unlockDayEndClosure,
  updateMyPreferences,
  validateGstInvoice,
} from './enterprise.service';

function requireContext(req: Request) {
  if (!req.user || !req.restaurantId) {
    throw new AppError('FORBIDDEN', 'Restaurant context required', 403);
  }
  return { user: req.user, restaurantId: req.restaurantId };
}

function requireRole(req: Request, allowed: Array<'OWNER' | 'MANAGER' | 'WAITER'>) {
  const role = req.user?.restaurantRole;
  if (!role || !allowed.includes(role as any)) {
    throw new AppError('FORBIDDEN', 'Insufficient role for this action', 403);
  }
}

export async function listOutletsController(req: Request, res: Response, next: NextFunction) {
  try {
    requireRole(req, ['OWNER', 'MANAGER', 'WAITER']);
    const { user, restaurantId } = requireContext(req);
    const outlets = await listRestaurantOutlets(user.tenantId, restaurantId);
    return res.json({ data: outlets });
  } catch (error) {
    return next(error as Error);
  }
}

export async function createOutletController(req: Request, res: Response, next: NextFunction) {
  try {
    requireRole(req, ['OWNER', 'MANAGER']);
    const { user, restaurantId } = requireContext(req);
    const parsed = createOutletSchema.safeParse(req.body);
    if (!parsed.success) {
      return next(new AppError('VALIDATION_ERROR', parsed.error.message, 400));
    }
    const outlet = await addRestaurantOutlet(user.tenantId, user.userId, restaurantId, parsed.data);
    return res.status(201).json({ data: outlet });
  } catch (error) {
    return next(error as Error);
  }
}

export async function updateOutletController(req: Request, res: Response, next: NextFunction) {
  try {
    requireRole(req, ['OWNER', 'MANAGER']);
    const { user, restaurantId } = requireContext(req);
    const outletId = req.params.id as string;
    const parsed = updateOutletSchema.safeParse(req.body);
    if (!parsed.success) {
      return next(new AppError('VALIDATION_ERROR', parsed.error.message, 400));
    }
    const outlet = await editRestaurantOutlet(user.tenantId, user.userId, restaurantId, outletId, parsed.data);
    return res.json({ data: outlet });
  } catch (error) {
    return next(error as Error);
  }
}

export async function getMyPreferencesController(req: Request, res: Response, next: NextFunction) {
  try {
    requireRole(req, ['OWNER', 'MANAGER', 'WAITER']);
    const { user, restaurantId } = requireContext(req);
    const preferences = await getMyPreferences(user.tenantId, user.userId, restaurantId);
    return res.json({ data: preferences });
  } catch (error) {
    return next(error as Error);
  }
}

export async function updateMyPreferencesController(req: Request, res: Response, next: NextFunction) {
  try {
    requireRole(req, ['OWNER', 'MANAGER', 'WAITER']);
    const { user, restaurantId } = requireContext(req);
    const parsed = updateMyPreferencesSchema.safeParse(req.body);
    if (!parsed.success) {
      return next(new AppError('VALIDATION_ERROR', parsed.error.message, 400));
    }
    const preferences = await updateMyPreferences(user.tenantId, user.userId, restaurantId, parsed.data);
    return res.json({ data: preferences });
  } catch (error) {
    return next(error as Error);
  }
}

export async function closeDayEndController(req: Request, res: Response, next: NextFunction) {
  try {
    requireRole(req, ['OWNER', 'MANAGER']);
    const { user, restaurantId } = requireContext(req);
    const parsed = closeDayEndSchema.safeParse(req.body);
    if (!parsed.success) {
      return next(new AppError('VALIDATION_ERROR', parsed.error.message, 400));
    }
    const result = await closeDayEnd(user.tenantId, user.userId, restaurantId, parsed.data);
    return res.json({ data: result });
  } catch (error) {
    return next(error as Error);
  }
}

export async function listDayEndController(req: Request, res: Response, next: NextFunction) {
  try {
    requireRole(req, ['OWNER', 'MANAGER']);
    const { restaurantId } = requireContext(req);
    const parsed = listDayEndQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return next(new AppError('VALIDATION_ERROR', parsed.error.message, 400));
    }
    const result = await getDayEndList(restaurantId, parsed.data);
    return res.json({ data: result });
  } catch (error) {
    return next(error as Error);
  }
}

export async function getDayEndController(req: Request, res: Response, next: NextFunction) {
  try {
    requireRole(req, ['OWNER', 'MANAGER']);
    const { restaurantId } = requireContext(req);
    const result = await getDayEndDetails(restaurantId, req.params.id as string);
    return res.json({ data: result });
  } catch (error) {
    return next(error as Error);
  }
}

export async function unlockDayEndController(req: Request, res: Response, next: NextFunction) {
  try {
    requireRole(req, ['OWNER', 'MANAGER']);
    const { user, restaurantId } = requireContext(req);
    const parsed = unlockDayEndSchema.safeParse(req.body);
    if (!parsed.success) {
      return next(new AppError('VALIDATION_ERROR', parsed.error.message, 400));
    }
    const result = await unlockDayEndClosure(
      user.tenantId,
      user.userId,
      restaurantId,
      req.params.id as string,
      parsed.data.reason
    );
    return res.json({ data: result });
  } catch (error) {
    return next(error as Error);
  }
}

export async function createExportJobController(req: Request, res: Response, next: NextFunction) {
  try {
    requireRole(req, ['OWNER', 'MANAGER']);
    const { user, restaurantId } = requireContext(req);
    const parsed = createExportJobSchema.safeParse(req.body);
    if (!parsed.success) {
      return next(new AppError('VALIDATION_ERROR', parsed.error.message, 400));
    }
    const job = await createExportJob(user.tenantId, user.userId, restaurantId, parsed.data);
    return res.status(201).json({ data: job });
  } catch (error) {
    return next(error as Error);
  }
}

export async function listExportJobsController(req: Request, res: Response, next: NextFunction) {
  try {
    requireRole(req, ['OWNER', 'MANAGER']);
    const { restaurantId } = requireContext(req);
    const parsed = listExportJobsQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return next(new AppError('VALIDATION_ERROR', parsed.error.message, 400));
    }
    const jobs = await listExportJobs(restaurantId, parsed.data);
    return res.json({ data: jobs });
  } catch (error) {
    return next(error as Error);
  }
}

export async function getExportJobController(req: Request, res: Response, next: NextFunction) {
  try {
    requireRole(req, ['OWNER', 'MANAGER']);
    const { restaurantId } = requireContext(req);
    const job = await getExportJob(restaurantId, req.params.id as string);
    return res.json({ data: job });
  } catch (error) {
    return next(error as Error);
  }
}

export async function downloadExportJobController(req: Request, res: Response, next: NextFunction) {
  try {
    requireRole(req, ['OWNER', 'MANAGER']);
    const { restaurantId } = requireContext(req);
    const job = await getExportJob(restaurantId, req.params.id as string);
    if (job.status !== 'DONE' || !job.files[0]) {
      throw new AppError('VALIDATION_ERROR', 'Export file is not ready yet', 400);
    }

    const file = job.files[0];
    const absolutePath = resolveExportStoragePath(file.storage_path);
    await fs.access(absolutePath);
    return res.download(absolutePath, file.file_name);
  } catch (error) {
    return next(error as Error);
  }
}

export async function validateGstInvoiceController(req: Request, res: Response, next: NextFunction) {
  try {
    requireRole(req, ['OWNER', 'MANAGER', 'WAITER']);
    const { user, restaurantId } = requireContext(req);
    const parsed = invoiceQuerySchema.safeParse(req.body);
    if (!parsed.success) {
      return next(new AppError('VALIDATION_ERROR', parsed.error.message, 400));
    }
    const result = await validateGstInvoice(user.tenantId, restaurantId, req.params.orderId as string, parsed.data);
    return res.json({ data: result });
  } catch (error) {
    return next(error as Error);
  }
}

export async function getGstInvoiceController(req: Request, res: Response, next: NextFunction) {
  try {
    requireRole(req, ['OWNER', 'MANAGER', 'WAITER']);
    const { user, restaurantId } = requireContext(req);
    const result = await getGstInvoice(user.tenantId, restaurantId, req.params.orderId as string);
    return res.json({ data: result });
  } catch (error) {
    return next(error as Error);
  }
}

export async function generateEInvoiceController(req: Request, res: Response, next: NextFunction) {
  try {
    requireRole(req, ['OWNER', 'MANAGER']);
    const { user, restaurantId } = requireContext(req);
    const parsed = generateEInvoiceSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      return next(new AppError('VALIDATION_ERROR', parsed.error.message, 400));
    }
    const invoice = await generateEInvoice(
      user.tenantId,
      restaurantId,
      req.params.orderId as string,
      parsed.data.provider
    );
    return res.json({ data: invoice });
  } catch (error) {
    return next(error as Error);
  }
}
