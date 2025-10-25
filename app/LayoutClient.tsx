'use client';
import { useState } from 'react';
import Header from '@/components/Header';
import ReportsModal from '@/components/ReportsModal';

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
    <>
      <Header onOpenReports={handleOpenReports} />
      <div className="w-full py-2 sm:py-3">
        {children}
      </div>
      <ReportsModal 
        isOpen={isReportsModalOpen} 
        onClose={handleCloseReports} 
      />
    </>
  );
}
