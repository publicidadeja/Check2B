
import type { Metadata } from 'next';
<<<<<<< HEAD
import { Inter } from 'next/font/google'; // Using Inter as Geist fonts might not be standard
import './globals.css';
import { Toaster } from '@/components/ui/toaster'; // Import Toaster for notifications
import { AuthProvider } from '@/hooks/use-auth'; // Import AuthProvider
=======
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
>>>>>>> db468e262ea80d11ae78a92ebc0d8d79df5809e8

// Using Inter font as a common, well-supported alternative
const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans', // Using a standard variable name
});

export const metadata: Metadata = {
<<<<<<< HEAD
  title: 'Check2B - Sistema de Avaliação Diária', // Updated title
  description: 'Gerencie avaliações diárias de colaboradores com Check2B', // Updated description
=======
  title: 'Check2B', // Updated title
  description: 'Sistema de Avaliação por Checklist Diário',
>>>>>>> db468e262ea80d11ae78a92ebc0d8d79df5809e8
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
<<<<<<< HEAD
    // Add suppressHydrationWarning if necessary for specific cases, but avoid if possible
    <html lang="pt-BR" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased`}>{/* Apply font variable */}
        <AuthProvider> {/* Wrap the entire application with AuthProvider */}
            {children}
            <Toaster /> {/* Add Toaster component here */}
        </AuthProvider>
=======
    <html lang="pt-BR">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <main>{children}</main>
        <Toaster />
>>>>>>> db468e262ea80d11ae78a92ebc0d8d79df5809e8
      </body>
    </html>
  );
}

    