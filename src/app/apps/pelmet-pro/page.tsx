'use client';

import React, { Suspense } from 'react';
import { PelmetProCustomizer } from './PelmetProCustomizer';

export default function PelmetProPage() {
  return (
    <Suspense fallback={<div>Loading Pelmet Pro...</div>}>
      <PelmetProCustomizer />
    </Suspense>
  );
}
