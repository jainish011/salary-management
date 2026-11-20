import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

@Injectable()
export class CacheService {
  private readonly logger = new Logger(CacheService.name);
  private memoryCache = new Map<string, CacheEntry<any>>();
  private redisClient: any = null;

  constructor(private readonly configService: ConfigService) {
    this.initRedis();
  }

  private async initRedis() {
    const host = this.configService.get<string>('REDIS_HOST');
    const port = parseInt(
      this.configService.get<string>('REDIS_PORT', '6379'),
      10,
    );

    // Only attempt external redis if explicitly configured and not localhost without service
    if (host && host !== 'localhost') {
      try {
        const ioredis = await import('ioredis');
        const RedisConstructor = (ioredis.default || (ioredis as any).Redis || ioredis) as any;
        this.redisClient = new RedisConstructor({
          host,
          port,
          lazyConnect: true,
          maxRetriesPerRequest: 1,
          enableOfflineQueue: false,
        });

        this.redisClient.on('error', (err: any) => {
          this.logger.warn(
            `Redis error, using memory fallback: ${err.message}`,
          );
        });

        await this.redisClient.connect();
        this.logger.log(`Connected to Redis at ${host}:${port}`);
      } catch (e: any) {
        this.logger.warn(
          `Could not connect to Redis: ${e.message}. Using in-memory cache.`,
        );
        this.redisClient = null;
      }
    }
  }

  async get<T>(key: string): Promise<T | null> {
    if (this.redisClient) {
      try {
        const data = await this.redisClient.get(key);
        return data ? JSON.parse(data) : null;
      } catch {
        // fallback
      }
    }

    const entry = this.memoryCache.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expiresAt) {
      this.memoryCache.delete(key);
      return null;
    }

    return entry.value as T;
  }

  async set(key: string, value: any, ttlSeconds = 600): Promise<void> {
    if (this.redisClient) {
      try {
        await this.redisClient.set(key, JSON.stringify(value), 'EX', ttlSeconds);
      } catch {
        // fallback
      }
    }

    this.memoryCache.set(key, {
      value,
      expiresAt: Date.now() + ttlSeconds * 1000,
    });
  }

  async del(key: string): Promise<void> {
    if (this.redisClient) {
      try {
        await this.redisClient.del(key);
      } catch {
        // fallback
      }
    }
    this.memoryCache.delete(key);
  }

  async delPattern(pattern: string): Promise<void> {
    if (this.redisClient) {
      try {
        const keys = await this.redisClient.keys(pattern);
        if (keys.length > 0) {
          await this.redisClient.del(...keys);
        }
      } catch {
        // fallback
      }
    }

    const regex = new RegExp(`^${pattern.replace(/\*/g, '.*')}$`);
    for (const key of this.memoryCache.keys()) {
      if (regex.test(key)) {
        this.memoryCache.delete(key);
      }
    }
  }
}
