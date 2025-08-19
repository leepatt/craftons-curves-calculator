import { PartListItem, TotalPriceDetails } from '@/types';

export interface SharedConfiguration {
  id: string;
  partsList: PartListItem[];
  totalPriceDetails: TotalPriceDetails | null;
  totalTurnaround: number | null;
  isEngravingEnabled: boolean;
  isJoinerBlocksEnabled: boolean;
  appType?: string; // Add app type to identify which customizer to use
  createdAt: string;
  expiresAt: string;
}

// Simple URL-based sharing - no database required!
export const shareStorage = {
  save: async (config: SharedConfiguration): Promise<void> => {
    // No-op - we'll generate URLs directly in the API route
    console.log(`URL-based sharing: Config prepared for ${config.id}`);
  },

  get: async (id: string): Promise<SharedConfiguration | undefined> => {
    // No-op - URL decoding happens client-side
    console.log(`URL-based sharing: Would decode ${id}`);
    return undefined;
  },

  delete: async (id: string): Promise<boolean> => {
    // No-op - URLs don't need deletion
    console.log(`URL-based sharing: No deletion needed for ${id}`);
    return true;
  },

  getStats: async () => {
    return {
      totalConfigurations: 0,
      configurations: []
    };
  },

  cleanup: (): number => {
    console.log("URL-based sharing: No cleanup needed");
    return 0;
  },

  // New utility functions for URL-based sharing
  encodeConfigToUrl: (config: SharedConfiguration, baseUrl: string): string => {
    try {
      // Create a minimal data structure for sharing
      const shareData = {
        p: config.partsList,
        t: config.totalPriceDetails,
        d: config.totalTurnaround,
        e: config.isEngravingEnabled,
        j: config.isJoinerBlocksEnabled,
        a: config.appType, // Include app type
        c: config.createdAt
      };

      // Compress and encode the data
      const jsonString = JSON.stringify(shareData);
      const base64Data = btoa(encodeURIComponent(jsonString));
      
      // Create the share URL
      return `${baseUrl}/share/${config.id}?data=${base64Data}`;
    } catch (error) {
      console.error('Error encoding config to URL:', error);
      throw new Error('Failed to create share URL');
    }
  },

  decodeConfigFromUrl: (data: string): SharedConfiguration | null => {
    try {
      // Decode the Base64 data
      const jsonString = decodeURIComponent(atob(data));
      const shareData = JSON.parse(jsonString);

      // Reconstruct the configuration
      return {
        id: 'shared-config',
        partsList: shareData.p || [],
        totalPriceDetails: shareData.t || null,
        totalTurnaround: shareData.d || null,
        isEngravingEnabled: shareData.e ?? true,
        isJoinerBlocksEnabled: shareData.j ?? true,
        appType: shareData.a || 'curves', // Include app type
        createdAt: shareData.c || new Date().toISOString(),
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days
      };
    } catch (error) {
      console.error('Error decoding config from URL:', error);
      return null;
    }
  }
}; 