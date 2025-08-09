'use client';

import React, { Suspense } from 'react';
import { RadiusProCustomizer } from './RadiusProCustomizer';

export default function RadiusProPage() {
  return (
    <Suspense fallback={<div>Loading Radius Pro...</div>}>
      <RadiusProCustomizer />
    </Suspense>
  );
}
