import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CacheService } from './cache.service.js';

describe('CacheService', () => {
  let service: CacheService;
  let mockConfigService: any;

  beforeEach(() => {
    mockConfigService = {
      get: vi.fn().mockReturnValue(null),
    };
    service = new CacheService(mockConfigService);
  });

  it('should store and retrieve value from cache', async () => {
    await service.set('test:key', { foo: 'bar' }, 60);
    const result = await service.get<{ foo: string }>('test:key');
    expect(result).toEqual({ foo: 'bar' });
  });

  it('should return null for expired key', async () => {
    await service.set('test:expired', { foo: 'bar' }, -1); // already expired
    const result = await service.get('test:expired');
    expect(result).toBeNull();
  });

  it('should delete key', async () => {
    await service.set('test:delete', 'val', 60);
    await service.del('test:delete');
    const result = await service.get('test:delete');
    expect(result).toBeNull();
  });

  it('should delete by wildcard pattern', async () => {
    await service.set('reports:kpis', 'data1', 60);
    await service.set('reports:dept', 'data2', 60);
    await service.set('other:data', 'data3', 60);

    await service.delPattern('reports:*');

    expect(await service.get('reports:kpis')).toBeNull();
    expect(await service.get('reports:dept')).toBeNull();
    expect(await service.get('other:data')).toBe('data3');
  });
});
