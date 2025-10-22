import './globals.css'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'BTG Desk Booker',
  description: 'Mapa visual de mesas e reservas (sem autenticação)',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>
        <div className="w-full py-3">
          {children}
        </div>
      </body>
    </html>
  )
}
