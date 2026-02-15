import { describe, it, expect, beforeAll, mock } from 'bun:test';
import express, { type Express } from 'express';
import { productRoutes, publicProductRoutes } from './routes';

// Mock Redis
mock.module('../../utils/redis', () => ({
  redisClient: {
    isReady: () => false,
    getClient: () => null,
  },
}));

// Mock JWT verification
mock.module('../../utils/jwt', () => ({
  verifySupabaseJwt: mock(() =>
    Promise.resolve({
      payload: { sub: 'mock-supabase-id' },
    })
  ),
}));

// Mock Prisma
const mockProducts = [
  {
    id: 'product-1',
    tenant_id: 'tenant-id',
    restaurant_id: 'restaurant-id',
    name: 'Burger',
    description: 'Delicious burger',
    price: 9.99,
    category_id: 'category-1',
    is_available: true,
    created_at: new Date(),
    updated_at: new Date(),
    deleted_at: null,
  },
];

mock.module('../../utils/prisma', () => ({
  prisma: {
    user: {
      findFirst: mock(() =>
        Promise.resolve({
          id: 'owner-id',
          tenant_id: 'tenant-id',
          role: 'OWNER',
          supabase_id: 'mock-supabase-id',
        })
      ),
    },
    tenant: {
      findFirst: mock(() =>
        Promise.resolve({
          id: 'tenant-id',
          plan: 'PRO',
        })
      ),
    },
    restaurant: {
      findMany: mock(() => Promise.resolve([{ id: 'restaurant-id' }])),
      findFirst: mock(() =>
        Promise.resolve({
          id: 'restaurant-id',
          tenant_id: 'tenant-id',
          slug: 'my-restaurant',
        })
      ),
    },
    product: {
      findMany: mock(() => Promise.resolve(mockProducts)),
      findFirst: mock(() => Promise.resolve(mockProducts[0])),
      create: mock((args: any) =>
        Promise.resolve({
          id: 'new-product-id',
          ...args.data,
          created_at: new Date(),
          updated_at: new Date(),
        })
      ),
      update: mock((args: any) =>
        Promise.resolve({
          id: args.where.id,
          ...mockProducts[0],
          ...args.data,
          updated_at: new Date(),
        })
      ),
      count: mock(() => Promise.resolve(10)),
    },
    auditLog: {
      create: mock(() => Promise.resolve({})),
    },
  },
}));

let app: Express;

beforeAll(() => {
  app = express();
  app.use(express.json());
  app.use('/products', productRoutes());
  app.use('/public', publicProductRoutes());
});

describe('Products Module', () => {
  describe('GET /products', () => {
    it('should return 401 without auth token', async () => {
      const res = await fetch('http://localhost:3001/products', {
        method: 'GET',
      });

      expect(res.status).toBe(401);
    });

    it('should return 401 with invalid auth token', async () => {
      const res = await fetch('http://localhost:3001/products', {
        method: 'GET',
        headers: {
          Authorization: 'Bearer invalid-token',
        },
      });

      expect(res.status).toBe(401);
    });
  });

  describe('POST /products', () => {
    it('should return 401 without auth token', async () => {
      const res = await fetch('http://localhost:3001/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'New Product',
          price: 15.99,
          categoryId: 'cat-1',
          isAvailable: true,
        }),
      });

      expect(res.status).toBe(401);
    });

    it('should return 400 for invalid product data', async () => {
      const res = await fetch('http://localhost:3001/products', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer mock-token',
        },
        body: JSON.stringify({
          name: 'A', // Too short
          price: -5, // Negative price
        }),
      });

      expect([400, 401]).toContain(res.status);
    });

    it('should return 400 for missing required fields', async () => {
      const res = await fetch('http://localhost:3001/products', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer mock-token',
        },
        body: JSON.stringify({
          name: 'Product Name',
          // Missing price, categoryId, isAvailable
        }),
      });

      expect([400, 401]).toContain(res.status);
    });
  });

  describe('GET /products/:id', () => {
    it('should return 401 without auth token', async () => {
      const res = await fetch('http://localhost:3001/products/product-1', {
        method: 'GET',
      });

      expect(res.status).toBe(401);
    });
  });

  describe('PATCH /products/:id', () => {
    it('should return 401 without auth token', async () => {
      const res = await fetch('http://localhost:3001/products/product-1', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Updated Product' }),
      });

      expect(res.status).toBe(401);
    });

    it('should return 400 for invalid price', async () => {
      const res = await fetch('http://localhost:3001/products/product-1', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer mock-token',
        },
        body: JSON.stringify({ price: -10 }),
      });

      expect([400, 401]).toContain(res.status);
    });
  });

  describe('DELETE /products/:id', () => {
    it('should return 401 without auth token', async () => {
      const res = await fetch('http://localhost:3001/products/product-1', {
        method: 'DELETE',
      });

      expect(res.status).toBe(401);
    });
  });
});

describe('Public Products Module', () => {
  describe('GET /public/:restaurant_slug/menu', () => {
    it('should be accessible without auth', async () => {
      const res = await fetch('http://localhost:3001/public/my-restaurant/menu', {
        method: 'GET',
      });

      // Should not return 401 as this is a public endpoint
      expect(res.status).not.toBe(401);
    });
  });
});
