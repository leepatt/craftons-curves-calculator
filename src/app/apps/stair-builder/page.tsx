'use client';

import React, { Suspense } from 'react';
import { StairCustomizer } from './StairCustomizer';

export default function StairBuilderPage() {
  return (
    <Suspense fallback={<div>Loading Stair Builder...</div>}>
      <StairCustomizer />
    </Suspense>
  );
}
