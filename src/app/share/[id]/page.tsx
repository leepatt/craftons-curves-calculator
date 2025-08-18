'use client';

import { useEffect, useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import CurvesCustomizer from '@/components/curves/CurvesCustomizer';
import { RippingCustomizer } from '@/apps/ripping/RippingCustomizer';
import { RadiusProCustomizer } from '@/apps/radius-pro/RadiusProCustomizer';
import { SharedConfiguration, shareStorage } from '@/lib/shareStorage';

export default function SharedConfigurationPage() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [sharedConfig, setSharedConfig] = useState<SharedConfiguration | null>(null);
  const [appType, setAppType] = useState<string>('curves'); // Default to curves for backward compatibility
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setIsLoading(true);
    
    // Try to get data from URL parameters (new URL-based sharing)
    const dataParam = searchParams.get('data');
    
    if (dataParam) {
      // URL-based sharing - decode the data directly from the URL
      try {
        const decodedConfig = shareStorage.decodeConfigFromUrl(dataParam);
        if (decodedConfig) {
          setSharedConfig(decodedConfig);
          
          // Detect app type from shared data
          const detectedAppType = (decodedConfig as any).appType || 'curves';
          setAppType(detectedAppType);
          
          console.log('✅ Successfully loaded configuration from URL, app type:', detectedAppType);
        } else {
          throw new Error('Failed to decode configuration from URL');
        }
      } catch (err) {
        console.error('Error decoding URL-based configuration:', err);
        setError('Invalid or corrupted share link. The configuration data could not be decoded.');
      } finally {
        setIsLoading(false);
      }
    } else {
      // Legacy support - try to extract share ID for old database-based links
      const shareId = pathname.split('/').pop();
      
      if (shareId && shareId !== 'share') {
        // This is likely an old database-based share link
        setError('This appears to be an old share link. Please generate a new share link from the calculator.');
        setIsLoading(false);
      } else {
        setError('Invalid share link. No configuration data found.');
        setIsLoading(false);
      }
    }
  }, [pathname, searchParams]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-lg text-gray-600">Loading shared configuration...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="text-center max-w-md mx-auto p-6 bg-white rounded-lg shadow-lg">
          <div className="text-red-500 mb-4">
            <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.962-.833-2.732 0L4.082 15.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Share Link Error</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <Link 
            href="/" 
            className="inline-block bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors cursor-pointer"
          >
            Go to Calculator
          </Link>
        </div>
      </div>
    );
  }

  if (!sharedConfig) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="text-center">
          <p className="text-lg text-gray-600">Configuration not found.</p>
          <Link 
            href="/" 
            className="inline-block mt-4 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors cursor-pointer"
          >
            Go to Calculator
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Header showing this is a shared configuration */}
      <div className="bg-[#194431] px-4 py-2">
        <div className="max-w-7xl mx-auto flex items-center">
          {/* Logo */}
          <a 
            href="https://craftons.com.au/" 
            target="_blank" 
            rel="noopener noreferrer" 
            className="h-[200px] w-[200px] -my-16"
          >
            <img 
              src="/images/CRAFTONS LOGO.png" 
              alt="Crafton's Logo" 
              className="w-full h-full object-contain"
            />
          </a>

          {/* Right side with share icon and text */}
          <div className="flex-1 flex justify-end pr-6">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-7 h-7">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
                </svg>
              </div>
              <span className="text-white text-lg font-medium">Shared Configuration</span>
            </div>
          </div>
        </div>
      </div>
      
      {/* Main calculator with shared data - Route to correct app */}
      {appType === 'ripping' ? (
        <RippingCustomizer initialData={sharedConfig} />
      ) : appType === 'radius-pro' ? (
        <RadiusProCustomizer initialData={sharedConfig} />
      ) : (
        <CurvesCustomizer initialData={sharedConfig} />
      )}
    </div>
  );
} 