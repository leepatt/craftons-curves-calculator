'use client';

import React, { Suspense } from 'react';
import { BoxBuilderCustomizer } from './BoxBuilderCustomizer';

export default function BoxBuilderPage() {
  return (
    <Suspense fallback={<div>Loading Box Builder...</div>}>
      <BoxBuilderCustomizer />
    </Suspense>
  );
}
