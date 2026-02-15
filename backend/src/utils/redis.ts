import Redis from 'ioredis';
import { env } from '../env';

export class RedisClient {
  private client: Redis | null = null;
  private isConnected = false;

  constructor(private url?: string) {}

  async connect(): Promise<void> {
    if (!this.url) {
      console.warn('Redis URL not configured. Redis features will be disabled.');
      return;
    }

    if (this.isConnected && this.client) {
      return;
    }

    try {
      this.client = new Redis(this.url, {
        maxRetriesPerRequest: 3,
        enableReadyCheck: true,
        retryStrategy: (times) => {
          const delay = Math.min(times * 150, 2000);
          return delay;
        },
        lazyConnect: true,
      });

      this.client.on('error', (err) => {
        console.error('Redis error:', err.message);
      });

      // Wait for connection and mark as ready
      await this.client.connect();
      this.isConnected = true;
    } catch (error) {
      console.error('Failed to connect to Redis:', error instanceof Error ? error.message : error);
      this.client = null;
      this.isConnected = false;
    }
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.quit();
      this.client = null;
      this.isConnected = false;
    }
  }

  getClient(): Redis | null {
    return this.client;
  }

  isReady(): boolean {
    return this.isConnected && this.client !== null;
  }

  async ping(): Promise<string> {
    if (!this.client) {
      throw new Error('Redis client not connected');
    }
    return this.client.ping();
  }

  async get(key: string): Promise<string | null> {
    if (!this.client) {
      return null;
    }
    return this.client.get(key);
  }

  async set(key: string, value: string, expirySeconds?: number): Promise<'OK' | null> {
    if (!this.client) {
      return null;
    }
    if (expirySeconds) {
      return this.client.set(key, value, 'EX', expirySeconds);
    }
    return this.client.set(key, value);
  }

  async setex(key: string, seconds: number, value: string): Promise<'OK' | null> {
    if (!this.client) {
      return null;
    }
    return this.client.setex(key, seconds, value);
  }

  async delete(key: string): Promise<number> {
    if (!this.client) {
      return 0;
    }
    return this.client.del(key);
  }

  async exists(key: string): Promise<number> {
    if (!this.client) {
      return 0;
    }
    return this.client.exists(key);
  }

  async expire(key: string, seconds: number): Promise<number> {
    if (!this.client) {
      return 0;
    }
    return this.client.expire(key, seconds);
  }

  async ttl(key: string): Promise<number> {
    if (!this.client) {
      return -2;
    }
    return this.client.ttl(key);
  }

  async incr(key: string): Promise<number> {
    if (!this.client) {
      return 0;
    }
    return this.client.incr(key);
  }

  async decr(key: string): Promise<number> {
    if (!this.client) {
      return 0;
    }
    return this.client.decr(key);
  }

  async hget(key: string, field: string): Promise<string | null> {
    if (!this.client) {
      return null;
    }
    return this.client.hget(key, field);
  }

  async hset(key: string, field: string, value: string): Promise<number> {
    if (!this.client) {
      return 0;
    }
    return this.client.hset(key, field, value);
  }

  async hgetall(key: string): Promise<Record<string, string>> {
    if (!this.client) {
      return {};
    }
    return this.client.hgetall(key);
  }

  async hdel(key: string, ...fields: string[]): Promise<number> {
    if (!this.client) {
      return 0;
    }
    return this.client.hdel(key, ...fields);
  }

  async lpush(key: string, ...values: string[]): Promise<number> {
    if (!this.client) {
      return 0;
    }
    return this.client.lpush(key, ...values);
  }

  async rpush(key: string, ...values: string[]): Promise<number> {
    if (!this.client) {
      return 0;
    }
    return this.client.rpush(key, ...values);
  }

  async lpop(key: string): Promise<string | null> {
    if (!this.client) {
      return null;
    }
    return this.client.lpop(key);
  }

  async rpop(key: string): Promise<string | null> {
    if (!this.client) {
      return null;
    }
    return this.client.rpop(key);
  }

  async lrange(key: string, start: number, stop: number): Promise<string[]> {
    if (!this.client) {
      return [];
    }
    return this.client.lrange(key, start, stop);
  }

  async sadd(key: string, ...members: string[]): Promise<number> {
    if (!this.client) {
      return 0;
    }
    return this.client.sadd(key, ...members);
  }

  async smembers(key: string): Promise<string[]> {
    if (!this.client) {
      return [];
    }
    return this.client.smembers(key);
  }

  async sismember(key: string, member: string): Promise<number> {
    if (!this.client) {
      return 0;
    }
    return this.client.sismember(key, member);
  }

  async srem(key: string, ...members: string[]): Promise<number> {
    if (!this.client) {
      return 0;
    }
    return this.client.srem(key, ...members);
  }

  async keys(pattern: string): Promise<string[]> {
    if (!this.client) {
      return [];
    }
    return this.client.keys(pattern);
  }

  async flushdb(): Promise<'OK'> {
    if (!this.client) {
      throw new Error('Redis client not connected');
    }
    return this.client.flushdb();
  }

  /**
   * Execute a raw Redis command (for rate-limit-redis compatibility)
   */
  async call(...args: string[]): Promise<unknown> {
    if (!this.client) {
      throw new Error('Redis client not connected');
    }
    return this.client.call(...(args as [string, ...string[]]));
  }
}

// Global singleton instance
const globalForRedis = globalThis as unknown as { redisClient?: RedisClient };

export const redisClient =
  globalForRedis.redisClient || new RedisClient(env.REDIS_URL);

if (env.NODE_ENV !== 'production') {
  globalForRedis.redisClient = redisClient;
}

// Backwards compatibility - export the raw client
export const redis = redisClient.getClient();

export async function connectRedis() {
  await redisClient.connect();
}

export async function shutdownRedis() {
  await redisClient.disconnect();
}
