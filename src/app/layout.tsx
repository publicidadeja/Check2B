import type { Metadata } from 'next';
import { Inter } from 'next/font/google'; // Using Inter as Geist fonts might not be standard
import './globals.css';
import { MainLayout } from '@/components/layout/main-layout'; // Import the MainLayout
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
    <html lang="pt-BR">{/* Set language to Portuguese */}
      <body className={`${inter.variable} font-sans antialiased`}> {/* Apply font variable */}
        <MainLayout>{children}</MainLayout>
        <Toaster /> {/* Add Toaster component here */}
      </body>
    </html>
  );
}
