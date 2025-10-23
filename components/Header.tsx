import Image from 'next/image';

export default function Header() {
  return (
    <header className="bg-white border-b border-gray-200 shadow-sm">
      <div className="px-4 sm:px-6 lg:px-20">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center space-x-2 sm:space-x-4">
            {/* Logo do BTG */}
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
            
            {/* Título da aplicação */}
            <div className="block">
              <h1 className="text-sm sm:text-lg md:text-xl font-semibold text-btg-blue-deep">
                Desk Booker
              </h1>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
