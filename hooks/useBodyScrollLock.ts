import { useEffect } from 'react';

export function useBodyScrollLock(isLocked: boolean) {
  useEffect(() => {
    if (isLocked) {
      // Salvar a posição atual do scroll
      const scrollY = window.scrollY;
      
      // Aplicar estilos para bloquear o scroll
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = '100%';
      document.body.style.overflow = 'hidden';
      
      return () => {
        // Restaurar o scroll quando o modal fechar
        document.body.style.position = '';
        document.body.style.top = '';
        document.body.style.width = '';
        document.body.style.overflow = '';
        
        // Restaurar a posição do scroll
        window.scrollTo(0, scrollY);
      };
    }
  }, [isLocked]);
}
