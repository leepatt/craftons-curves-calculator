'use client';

import { Suspense } from 'react';
import { RippingCustomizer } from './RippingCustomizer';

// This page now renders the fully-featured RippingCustomizer
export default function RippingPage() {
  return (
    <Suspense fallback={<div>Loading Ripping App...</div>}>
      <RippingCustomizer />
    </Suspense>
  );
}
