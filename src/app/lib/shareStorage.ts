// Shared in-memory storage for shared configurations
// In production, this would be replaced with a database

export interface SharedConfiguration {
  id: string;
  partsList: any[];
  totalPriceDetails: any;
  totalTurnaround: number | null;
  isEngravingEnabled: boolean;
  createdAt: string;
  expiresAt: string;
}

// Global storage map
const sharedConfigurations = new Map<string, SharedConfiguration>();

export const shareStorage = {
  // Save a new shared configuration
  save: (config: SharedConfiguration): void => {
    sharedConfigurations.set(config.id, config);
    console.log(`Saved shared configuration: ${config.id}`);
  },

  // Get a shared configuration by ID
  get: (id: string): SharedConfiguration | undefined => {
    const config = sharedConfigurations.get(id);
    
    if (config) {
      // Check if configuration has expired
      const now = new Date();
      const expiresAt = new Date(config.expiresAt);
      
      if (now > expiresAt) {
        // Remove expired configuration
        sharedConfigurations.delete(id);
        console.log(`Removed expired shared configuration: ${id}`);
        return undefined;
      }
    }
    
    return config;
  },

  // Delete a shared configuration
  delete: (id: string): boolean => {
    const deleted = sharedConfigurations.delete(id);
    if (deleted) {
      console.log(`Deleted shared configuration: ${id}`);
    }
    return deleted;
  },

  // Get statistics
  getStats: () => {
    return {
      totalConfigurations: sharedConfigurations.size,
      configurations: Array.from(sharedConfigurations.values()).map(config => ({
        id: config.id,
        createdAt: config.createdAt,
        expiresAt: config.expiresAt,
        partsCount: config.partsList.length
      }))
    };
  },

  // Clean up expired configurations
  cleanup: (): number => {
    const now = new Date();
    let cleaned = 0;
    
    for (const [id, config] of sharedConfigurations.entries()) {
      const expiresAt = new Date(config.expiresAt);
      if (now > expiresAt) {
        sharedConfigurations.delete(id);
        cleaned++;
      }
    }
    
    if (cleaned > 0) {
      console.log(`Cleaned up ${cleaned} expired configurations`);
    }
    
    return cleaned;
  }
};

// Auto-cleanup expired configurations every hour
setInterval(() => {
  shareStorage.cleanup();
}, 60 * 60 * 1000); // 1 hour in milliseconds 