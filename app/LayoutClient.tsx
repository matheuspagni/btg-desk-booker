'use client';
import { useState } from 'react';
import Header from '@/components/Header';
import ReportsModal from '@/components/ReportsModal';
import ProductionWarning from '@/components/ProductionWarning';

type LayoutClientProps = {
  children: React.ReactNode;
};

export default function LayoutClient({ children }: LayoutClientProps) {
  const [isReportsModalOpen, setIsReportsModalOpen] = useState(false);

  const handleOpenReports = () => {
    setIsReportsModalOpen(true);
  };

  const handleCloseReports = () => {
    setIsReportsModalOpen(false);
  };

  return (
    <div className="flex flex-col bg-white" style={{ height: '100vh', overflow: 'hidden' }}>
      <ProductionWarning />
      <Header onOpenReports={handleOpenReports} />
      <div className="flex-1 min-h-0" style={{ overflow: 'hidden' }}>
        {children}
      </div>
      <ReportsModal 
        isOpen={isReportsModalOpen} 
        onClose={handleCloseReports} 
      />
    </div>
  );
}
