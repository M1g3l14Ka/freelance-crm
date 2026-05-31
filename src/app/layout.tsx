
import './globals.css';
import { SessionProvider } from 'next-auth/react';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <body className='bg-[#050505]'>
        <SessionProvider>
          {children}
        </SessionProvider>
      </body>
    </html>
  )
}
