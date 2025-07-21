'use client';

import { Suspense } from 'react';
import CurvesCustomizer from './components/curves/CurvesCustomizer';

function HomePageContent() {
  return (
    <CurvesCustomizer 
      defaultMaterial={'form-17'}
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
