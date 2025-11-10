'use client';

export const dynamic = 'force-dynamic';

import MapWorkspace from './MapWorkspace';

export default function MapPage() {
  return <MapWorkspace mode="view" hideCalendar={false} />;
}


