'use client';

import React, { Suspense } from 'react';
import { CutStudioCustomizer } from './CutStudioCustomizer';

export default function CutStudioPage() {
  return (
    <Suspense fallback={<div>Loading Cut Studio...</div>}>
      <CutStudioCustomizer />
    </Suspense>
  );
}




