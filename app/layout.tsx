import './globals.css'
import type { Metadata } from 'next'
import Header from '@/components/Header'

export const metadata: Metadata = {
  title: 'BTG Desk Booker',
  description: 'Mapa visual de mesas e reservas (sem autenticação)',
  icons: {
    icon: [
      { url: '/desk-favicon.svg', type: 'image/svg+xml' },
      { url: '/favicon.ico' }
    ],
    shortcut: '/desk-favicon.svg',
    apple: '/desk-favicon.svg',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>
        <Header />
        <div className="w-full py-3">
          {children}
        </div>
      </body>
    </html>
  )
}
