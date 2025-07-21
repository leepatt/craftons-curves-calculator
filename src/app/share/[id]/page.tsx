'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import CurvesCustomizer from '@/components/curves/CurvesCustomizer';
import { SharedConfiguration } from '@/lib/shareStorage';

// Helper function to extract ID from URL
const getShareIdFromUrl = (path: string) => {
  const parts = path.split('/');
  if (parts.length > 2 && parts[1] === 'share') {
    return parts[2];
  }
  return null;
};

export default function SharedConfigurationPage() {
  const pathname = usePathname();
  const [sharedConfig, setSharedConfig] = useState<SharedConfiguration | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const shareId = getShareIdFromUrl(pathname);

    if (shareId) {
      const fetchConfig = async () => {
        setIsLoading(true);
        try {
          const response = await fetch(`/api/share/${shareId}`);
          
          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to load configuration');
          }
          
          const data = await response.json();
          setSharedConfig(data.sharedConfig);
        } catch (err: any) {
          setError(err.message);
        } finally {
          setIsLoading(false);
        }
      };
      
      fetchConfig();
    } else {
      setError('Invalid share link.');
      setIsLoading(false);
    }
  }, [pathname]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-lg text-gray-600">Loading shared configuration...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-lg text-red-600">Error: {error}</p>
      </div>
    );
  }

  if (!sharedConfig) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-lg text-gray-600">Configuration not found.</p>
      </div>
    );
  }

  return (
    <CurvesCustomizer
      onBack={() => { window.location.href = '/'; }}
      initialData={sharedConfig} 
    />
  );
} 