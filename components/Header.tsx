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
                        d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.607 2.296.07 2.573-1.065z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
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
