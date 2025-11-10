'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import Header from '@/components/Header';
import ReportsModal from '@/components/ReportsModal';
import ProductionWarning from '@/components/ProductionWarning';

type LayoutClientProps = {
  children: React.ReactNode;
};

export default function LayoutClient({ children }: LayoutClientProps) {
  const pathname = usePathname();
  const isHome = pathname === '/';
  const isEditMapPage = pathname?.startsWith('/maps/') && pathname?.endsWith('/edit');
  const showReportsItem = !isHome && !isEditMapPage;
  const showManageItem = isHome;

  const [isReportsModalOpen, setIsReportsModalOpen] = useState(false);

  useEffect(() => {
    if (!showReportsItem) {
      setIsReportsModalOpen(false);
    }
  }, [showReportsItem]);

  const handleOpenReports = () => {
    setIsReportsModalOpen(true);
  };

  const handleCloseReports = () => {
    setIsReportsModalOpen(false);
  };

  const handleOpenManageStructure = () => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('open-manage-structure'));
    }
  };

  return (
    <div className="flex flex-col bg-white" style={{ height: '100vh', overflow: 'hidden' }}>
      <ProductionWarning />
      <Header
        onOpenReports={showReportsItem ? handleOpenReports : undefined}
        onOpenManageStructure={showManageItem ? handleOpenManageStructure : undefined}
        showMenu={showReportsItem || showManageItem}
        showReportsItem={showReportsItem}
        showManageItem={showManageItem}
      />
      <div className="flex-1 min-h-0" style={{ overflow: 'hidden' }}>
        {children}
      </div>
      {showReportsItem && (
        <ReportsModal isOpen={isReportsModalOpen} onClose={handleCloseReports} />
      )}
    </div>
  );
}
