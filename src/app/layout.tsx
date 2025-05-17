
import type { Metadata } from 'next';
import { Inter } from 'next/font/google'; // Using Inter as Geist fonts might not be standard
import './globals.css';
import { Toaster } from '@/components/ui/toaster'; // Import Toaster for notifications
import { AuthProvider } from '@/hooks/use-auth'; // Import AuthProvider
import { ConditionalLayout } from '@/components/layout/conditional-layout';

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
    // Add suppressHydrationWarning if necessary for specific cases, but avoid if possible
    <html lang="pt-BR" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased`} suppressHydrationWarning={true}> {/* Apply font variable and suppress hydration warning */}
        <AuthProvider> {/* Wrap the entire application with AuthProvider */}
        <ConditionalLayout> {/* Use ConditionalLayout here */}
            {children}
          </ConditionalLayout>
            <Toaster /> {/* Add Toaster component here */}
        </AuthProvider>
      </body>
    </html>
  );
}

