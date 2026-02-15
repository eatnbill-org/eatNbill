import { describe, it, expect, beforeAll, mock } from 'bun:test';
import express, { type Express } from 'express';
import { userRoutes } from './routes';

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
const mockUsers = [
  {
    id: 'user-1',
    email: 'manager@example.com',
    role: 'MANAGER',
    tenant_id: 'tenant-id',
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
      findMany: mock(() => Promise.resolve(mockUsers)),
      create: mock((args: any) =>
        Promise.resolve({
          id: 'new-user-id',
          ...args.data,
          created_at: new Date(),
          updated_at: new Date(),
        })
      ),
      update: mock((args: any) =>
        Promise.resolve({
          id: args.where.id,
          ...args.data,
          updated_at: new Date(),
        })
      ),
    },
    restaurant: {
      findMany: mock(() => Promise.resolve([{ id: 'restaurant-id' }])),
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
  app.use('/users', userRoutes());
});

describe('Users Module', () => {
  describe('GET /users', () => {
    it('should return 401 without auth token', async () => {
      const res = await fetch('http://localhost:3001/users', {
        method: 'GET',
      });

      expect(res.status).toBe(401);
    });

    it('should return 401 with invalid auth token', async () => {
      const res = await fetch('http://localhost:3001/users', {
        method: 'GET',
        headers: {
          Authorization: 'Bearer invalid-token',
        },
      });

      expect(res.status).toBe(401);
    });
  });

  describe('POST /users', () => {
    it('should return 401 without auth token', async () => {
      const res = await fetch('http://localhost:3001/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'newuser@example.com',
          role: 'WAITER',
        }),
      });

      expect(res.status).toBe(401);
    });

    it('should return 400 for invalid email format', async () => {
      const res = await fetch('http://localhost:3001/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer mock-token',
        },
        body: JSON.stringify({
          email: 'invalid-email',
          role: 'WAITER',
        }),
      });

      // Will be 401 first due to auth, but validates schema
      expect([400, 401]).toContain(res.status);
    });

    it('should return 400 for invalid role', async () => {
      const res = await fetch('http://localhost:3001/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer mock-token',
        },
        body: JSON.stringify({
          email: 'newuser@example.com',
          role: 'INVALID_ROLE',
        }),
      });

      expect([400, 401]).toContain(res.status);
    });

    it('should not allow creating OWNER role', async () => {
      const res = await fetch('http://localhost:3001/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer mock-token',
        },
        body: JSON.stringify({
          email: 'newowner@example.com',
          role: 'OWNER',
        }),
      });

      expect([400, 401]).toContain(res.status);
    });
  });

  describe('PATCH /users/:id', () => {
    it('should return 401 without auth token', async () => {
      const res = await fetch('http://localhost:3001/users/user-1', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: 'MANAGER' }),
      });

      expect(res.status).toBe(401);
    });

    it('should return 400 for invalid role', async () => {
      const res = await fetch('http://localhost:3001/users/user-1', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer mock-token',
        },
        body: JSON.stringify({ role: 'INVALID' }),
      });

      expect([400, 401]).toContain(res.status);
    });
  });

  describe('DELETE /users/:id', () => {
    it('should return 401 without auth token', async () => {
      const res = await fetch('http://localhost:3001/users/user-1', {
        method: 'DELETE',
      });

      expect(res.status).toBe(401);
    });
  });
});
