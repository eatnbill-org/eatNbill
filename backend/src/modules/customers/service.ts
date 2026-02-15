import { AppError } from '../../middlewares/error.middleware';
import {
  createAuditLog,
  createCustomer,
  getCustomerById,
  listCustomers,
  updateCustomer,
  updateCustomerTags,
  updateCustomerCredit,
  getCustomerAnalytics,
  getCustomerOrders,
  getOrdersByPhone,
  deleteCustomer,
} from './repository';

export async function listRestaurantCustomers(
  tenantId: string,
  restaurantId: string,
  search?: string,
  tags?: string[],
  page?: number,
  limit?: number
) {
  return listCustomers(tenantId, restaurantId, search, tags, page, limit);
}

export async function getRestaurantCustomer(
  tenantId: string,
  restaurantId: string,
  customerId: string
) {
  const customer = await getCustomerById(tenantId, restaurantId, customerId);
  if (!customer) {
    throw new AppError('NOT_FOUND', 'Customer not found', 404);
  }
  return customer;
}

export async function getRestaurantCustomerOrders(
  tenantId: string,
  restaurantId: string,
  customerId: string,
  page?: number,
  limit?: number
) {
  const customer = await getCustomerById(tenantId, restaurantId, customerId);
  if (!customer) {
    throw new AppError('NOT_FOUND', 'Customer not found', 404);
  }
  return getCustomerOrders(customer.phone, restaurantId, page, limit);
}

export async function getRestaurantCustomerAnalytics(
  tenantId: string,
  restaurantId: string,
  customerId: string,
  days?: number
) {
  const analytics = await getCustomerAnalytics(
    tenantId,
    restaurantId,
    customerId,
    days
  );
  if (!analytics) {
    throw new AppError('NOT_FOUND', 'Customer not found', 404);
  }
  return analytics;
}

export async function createRestaurantCustomer(
  tenantId: string,
  userId: string,
  restaurantId: string,
  data: {
    name: string;
    phone: string;
    email?: string;
    tags?: string[];
    notes?: string;
    credit_balance?: number;
  }
) {
  const customer = await createCustomer(tenantId, restaurantId, data);
  await createAuditLog(tenantId, userId, 'CREATE', 'CUSTOMER', customer.id, {
    credit_balance: data.credit_balance,
  });
  return customer;
}

export async function updateRestaurantCustomer(
  tenantId: string,
  userId: string,
  restaurantId: string,
  customerId: string,
  data: { name?: string; phone?: string; email?: string; notes?: string; credit_balance?: number }
) {
  const existing = await getCustomerById(tenantId, restaurantId, customerId);
  if (!existing) {
    throw new AppError('NOT_FOUND', 'Customer not found', 404);
  }

  const customer = await updateCustomer(customerId, data);
  await createAuditLog(tenantId, userId, 'UPDATE', 'CUSTOMER', customerId, data);
  return customer;
}

export async function updateRestaurantCustomerTags(
  tenantId: string,
  userId: string,
  restaurantId: string,
  customerId: string,
  tags: string[]
) {
  const existing = await getCustomerById(tenantId, restaurantId, customerId);
  if (!existing) {
    throw new AppError('NOT_FOUND', 'Customer not found', 404);
  }

  const customer = await updateCustomerTags(customerId, tags);
  await createAuditLog(tenantId, userId, 'UPDATE_TAGS', 'CUSTOMER', customerId, {
    tags,
  });
  return customer;
}

export async function updateRestaurantCustomerCredit(
  tenantId: string,
  userId: string,
  restaurantId: string,
  customerId: string,
  amount: number
) {
  const existing = await getCustomerById(tenantId, restaurantId, customerId);
  if (!existing) {
    throw new AppError('NOT_FOUND', 'Customer not found', 404);
  }

  const customer = await updateCustomerCredit(customerId, amount);
  await createAuditLog(tenantId, userId, 'UPDATE_CREDIT', 'CUSTOMER', customerId, {
    amount,
    new_balance: customer.credit_balance,
  });
  return customer;
}

export async function deleteRestaurantCustomer(
  tenantId: string,
  userId: string,
  restaurantId: string,
  customerId: string
) {
  const existing = await getCustomerById(tenantId, restaurantId, customerId);
  if (!existing) {
    throw new AppError('NOT_FOUND', 'Customer not found', 404);
  }

  await deleteCustomer(customerId);
  await createAuditLog(tenantId, userId, 'DELETE', 'CUSTOMER', customerId, {
    name: existing.name,
    phone: existing.phone,
  });
}

export async function getPublicOrderHistory(
  phone: string,
  page?: number,
  limit?: number
) {
  return getOrdersByPhone(phone, page, limit);
}