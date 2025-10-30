'use client';
import { useState, useEffect } from 'react';

export default function ProductionWarning() {
  const [isProduction, setIsProduction] = useState(false);

  useEffect(() => {
    // Verificar se está em localhost mas apontando para produção
    const checkLocalhostProduction = async () => {
      try {
        const response = await fetch('/api/debug-env');
        if (response.ok) {
          const data = await response.json();
          console.log('Debug env data:', data); // Debug log
          
          // Mostrar aviso apenas se:
          // 1. Está em desenvolvimento (NODE_ENV !== 'production')
          // 2. E está apontando para banco de produção
          const isLocalhost = data.environment !== 'production';
          const isPointingToProduction = data.isProduction;
          
          setIsProduction(isLocalhost && isPointingToProduction);
        }
      } catch (error) {
        console.error('Error checking production status:', error);
        // Se não conseguir verificar, assumir que não é produção
        setIsProduction(false);
      }
    };

    checkLocalhostProduction();
  }, []);

  console.log('ProductionWarning render - isProduction:', isProduction);

  if (!isProduction) return null;

  return (
    <div className="bg-red-600 text-white text-center py-1 px-4 relative z-50">
      <div className="flex items-center justify-center space-x-2">
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
        </svg>
        <span className="font-bold text-sm">PRODUÇÃO</span>
        <span className="text-xs">Você está executando localhost mas apontando para o banco de PRODUÇÃO!</span>
      </div>
    </div>
  );
}
