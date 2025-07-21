import { kv } from '@vercel/kv';
import { PartListItem, TotalPriceDetails } from '@/types';

export interface SharedConfiguration {
  id: string;
  partsList: PartListItem[];
  totalPriceDetails: TotalPriceDetails | null;
  totalTurnaround: number | null;
  isEngravingEnabled: boolean;
  createdAt: string;
  expiresAt: string;
}

export const shareStorage = {
  save: async (config: SharedConfiguration): Promise<void> => {
    const expiresInSeconds = Math.floor((new Date(config.expiresAt).getTime() - Date.now()) / 1000);
    // Ensure we don't try to set a negative expiration
    if (expiresInSeconds <= 0) {
        console.warn(`Attempted to save an already expired configuration: ${config.id}`);
        return;
    }
    await kv.set(`share:${config.id}`, config, { ex: expiresInSeconds });
    console.log(`Saved shared configuration to Vercel KV: ${config.id}`);
  },

  get: async (id: string): Promise<SharedConfiguration | undefined> => {
    const config = await kv.get<SharedConfiguration>(`share:${id}`);
    
    if (!config) {
        console.log(`Shared configuration not found in Vercel KV: ${id}`);
        return undefined;
    }

    // KV should handle expiration, but as a safeguard:
    if (new Date() > new Date(config.expiresAt)) {
        console.log(`Expired config retrieved from KV, deleting: ${id}`);
        await kv.del(`share:${id}`);
        return undefined;
    }

    return config;
  },

  delete: async (id: string): Promise<boolean> => {
    const result = await kv.del(`share:${id}`);
    const deleted = result > 0;
    if (deleted) {
      console.log(`Deleted shared configuration from Vercel KV: ${id}`);
    }
    return deleted;
  },

  getStats: async () => {
    console.warn("getStats is a potentially slow and expensive operation with Vercel KV. It scans all keys.");
    const keys = [];
    for await (const key of kv.scanIterator({ match: 'share:*' })) {
        keys.push(key);
    }
    const configs = keys.length ? await kv.mget<SharedConfiguration[]>(...keys) : [];

    return {
      totalConfigurations: configs.length,
      configurations: configs.filter(Boolean).map((config: SharedConfiguration) => ({
        id: config.id,
        createdAt: config.createdAt,
        expiresAt: config.expiresAt,
        partsCount: config.partsList.length
      }))
    };
  },

  cleanup: (): number => {
    console.log("Cleanup is handled automatically by Vercel KV's `ex` option. This function is a no-op.");
    return 0;
  }
}; 