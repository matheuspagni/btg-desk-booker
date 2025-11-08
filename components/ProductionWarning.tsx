'use client';
import { useState, useEffect } from 'react';

export default function ProductionWarning() {
  const [isProduction, setIsProduction] = useState(false);
  const [isRelease, setIsRelease] = useState(false);

  useEffect(() => {
    const checkDatabaseTarget = async () => {
      try {
        const response = await fetch('/api/debug-env');
        if (!response.ok) return;

        const data = await response.json();
        const environment = data.environment;
        const schema = data.database?.schema ?? 'public';

        const runningLocally = environment !== 'production';
        const pointingToProdSchema = schema.toLowerCase() === 'prod';
        const pointingToDevSchema = schema.toLowerCase() === 'dev';

        setIsProduction(runningLocally && pointingToProdSchema);
        setIsRelease(runningLocally && pointingToDevSchema);
      } catch (error) {
        console.error('Error checking database target:', error);
        setIsProduction(false);
        setIsRelease(false);
      }
    };

    checkDatabaseTarget();
  }, []);

  if (isProduction) {
    return (
      <div className="bg-red-600 text-white text-center py-1 px-4 relative z-50">
        <div className="flex items-center justify-center space-x-2">
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          <span className="font-bold text-sm">PRODUÇÃO</span>
          <span className="text-xs">Você está executando localhost mas apontando para o schema de PRODUÇÃO!</span>
        </div>
      </div>
    );
  }

  if (isRelease) {
    return (
      <div className="bg-blue-600 text-white text-center py-1 px-4 relative z-50">
        <div className="flex items-center justify-center space-x-2">
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 2a1 1 0 01.894.553l1.618 3.277 3.62.526a1 1 0 01.554 1.706l-2.619 2.553.619 3.607a1 1 0 01-1.451 1.054L10 13.347l-3.235 1.706a1 1 0 01-1.451-1.054l.619-3.607L3.314 8.062a1 1 0 01.554-1.706l3.62-.526L9.106 2.553A1 1 0 0110 2z" clipRule="evenodd" />
          </svg>
          <span className="font-bold text-sm">RELEASE</span>
        </div>
      </div>
    );
  }

  return null;
}
