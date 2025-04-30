
import type { Metadata } from 'next';
import { Inter } from 'next/font/google'; // Using Inter as Geist fonts might not be standard
import './globals.css';
// Removed MainLayout import - it will be applied conditionally
import { Toaster } from '@/components/ui/toaster'; // Import Toaster for notifications

// Using Inter font as a common, well-supported alternative
const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans', // Using a standard variable name
});

export const metadata: Metadata = {
  title: 'Check2B - Sistema de Avaliação Diária', // Updated title
  description: 'Gerencie avaliações diárias de colaboradores com Check2B', // Updated description
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className={`${inter.variable} font-sans antialiased`}>{/* Apply font variable */}
        {/* MainLayout removed - children will now include layout based on route */}
        {children}
        <Toaster /> {/* Add Toaster component here */}
      </body>
    </html>
  );
}
