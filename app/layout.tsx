import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';
import BrowserCompatibilityWarning from '@/components/BrowserCompatibilityWarning';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Avatar Client - Conversational AI Interface',
  description:
    'A 3D animated avatar interface for conversational AI interactions with synchronized lip movements.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <BrowserCompatibilityWarning />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
