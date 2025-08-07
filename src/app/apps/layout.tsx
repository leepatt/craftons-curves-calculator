'use client';

import { Suspense } from 'react';

// Layout for all apps in the /apps directory
// This allows each app to have its own dedicated route
export default function AppsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="apps-layout">
      <Suspense fallback={<div>Loading App...</div>}>
        {children}
      </Suspense>
    </div>
  );
}
