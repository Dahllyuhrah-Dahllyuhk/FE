// FE/app/layout.tsx
import type React from 'react';
import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import { Analytics } from '@vercel/analytics/next';
import { ThemeProvider } from '@/components/theme-provider';
import { AuthProvider } from '@/context/auth-context';
import { EventRefreshProvider } from '@/hooks/useEventRefresh';
import './globals.css';

const _geist = Geist({ subsets: ['latin'] });
const _geistMono = Geist_Mono({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: '맞춰봄 캘린더',
  description: '맞춰봄 캘린더',
  generator: 'v0.app',
  // ... (기존 메타데이터 그대로 두면 됨)
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <body className="font-sans antialiased">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <AuthProvider>
            <EventRefreshProvider>
              {children}
              {/* <Analytics /> 필요하면 다시 켜기 */}
            </EventRefreshProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
