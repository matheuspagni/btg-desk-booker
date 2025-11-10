'use client';
import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';

type HeaderProps = {
  onOpenReports?: () => void;
  onOpenManageStructure?: () => void;
  showMenu?: boolean;
  showReportsItem?: boolean;
  showManageItem?: boolean;
};

export default function Header({
  onOpenReports,
  onOpenManageStructure,
  showMenu = true,
  showReportsItem = true,
  showManageItem = false,
}: HeaderProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    if (!showMenu) setIsMenuOpen(false);
  }, [showMenu]);

  return (
    <header className="bg-white border-b border-gray-200 shadow-sm">
      <div className="px-2 sm:px-3 lg:px-4">
        <div className="flex items-center justify-between h-10">
          <Link href="/" className="flex items-center space-x-2 sm:space-x-4 focus:outline-none focus-visible:ring-2 focus-visible:ring-btg-blue-bright focus-visible:ring-offset-2 rounded-md">
            <div className="flex-shrink-0">
              <Image
                src="/images/btg-logo.png"
                alt="BTG Logo"
                width={120}
                height={40}
                className="h-6 sm:h-8 w-auto"
                priority
              />
            </div>
            <div className="block">
              <h1 className="text-xs sm:text-sm md:text-base font-semibold text-btg-blue-deep">
                Desk Booker
              </h1>
            </div>
          </Link>

          {showMenu && (showReportsItem || showManageItem) && (
            <div className="block relative">
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="flex items-center space-x-1 sm:space-x-2 px-2 sm:px-3 py-2 text-sm font-medium text-gray-700 hover:text-btg-blue-deep hover:bg-gray-50 rounded-md transition-colors"
              >
                <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
                <span className="hidden xs:inline">Menu</span>
              </button>

              {isMenuOpen && (
                       <div className="absolute right-0 mt-2 w-56 bg-white rounded-md shadow-lg border border-gray-200 z-50">
                  <div className="py-1">
                    {showReportsItem && (
                      <button
                        onClick={() => {
                          onOpenReports?.();
                          setIsMenuOpen(false);
                        }}
                        className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-btg-blue-deep transition-colors"
                      >
                        <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                        Relatórios
                      </button>
                    )}
                    {showManageItem && (
                      <button
                        onClick={() => {
                          if (onOpenManageStructure) {
                            onOpenManageStructure();
                          } else {
                            window.dispatchEvent(new CustomEvent('open-manage-structure'));
                          }
                          setIsMenuOpen(false);
                        }}
                        className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-btg-blue-deep transition-colors"
                      >
                    <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M11.25 3l.917 1.835a1 1 0 00.832.55l2.018.292a1 1 0 01.554 1.705l-1.46 1.423a1 1 0 000 1.45l1.46 1.423a1 1 0 01-.554 1.705l-2.018.292a1 1 0 00-.832.55L11.25 21a1 1 0 01-1.8 0l-.917-1.835a1 1 0 00-.832-.55l-2.018-.292a1 1 0 01-.554-1.705l1.46-1.423a1 1 0 000-1.45l-1.46-1.423a1 1 0 01.554-1.705l2.018-.292a1 1 0 00.832-.55L9.45 3a1 1 0 011.8 0z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 9.75a2.25 2.25 0 110 4.5 2.25 2.25 0 010-4.5z"
                      />
                        </svg>
                    Gerenciar empresa
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {showMenu && isMenuOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsMenuOpen(false)}
        />
      )}
    </header>
  );
}
