'use client';

import { useEffect, useState } from 'react';
import CurvesCustomizer from './components/curves/CurvesCustomizer';
import { ProductContext } from './types/productContext';
import { Suspense } from 'react';

function HomePageContent() {
  const [productContext, setProductContext] = useState<ProductContext | null>(null);

  useEffect(() => {
    // Try to read product context from parent window if in iframe
    if (window.parent !== window) {
      try {
        const parentContext = window.parent.productContext;
        if (parentContext) {
          console.log('Found product context:', parentContext);
          setProductContext(parentContext);
        } else {
          console.log('No product context found in parent window');
        }
      } catch (e) {
        console.warn('Unable to access parent context:', e);
      }
    } else {
      console.log('Not in iframe context');
    }
  }, []);

  return (
    <CurvesCustomizer 
      onBack={() => {}} 
      defaultMaterial={productContext?.material || 'form-17'}
      productContext={productContext}
    />
  );
}

export default function Home() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <HomePageContent />
    </Suspense>
  );
}
