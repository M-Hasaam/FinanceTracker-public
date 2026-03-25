import type { Metadata } from 'next';
import localFont from 'next/font/local';
import '@repo/ui/globals.css';
import { AuthProvider } from '@/common/hooks/useAuth';
import { ThemeProvider } from '@/common/components/theme-provider';

const geistSans = localFont({
  src: './fonts/GeistVF.woff',
  variable: '--font-geist-sans',
});
const geistMono = localFont({
  src: './fonts/GeistMonoVF.woff',
  variable: '--font-geist-mono',
});

export const metadata: Metadata = {
  title: 'Finance Tracker',
  description: 'Smart Money Tracking',
  icons: {
    icon: '/wallet-icon.svg',
    shortcut: '/wallet-icon.svg',
    apple: '/wallet-icon.svg',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      {/* ✅ Add <head> with viewport meta */}
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>

      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          disableTransitionOnChange
        >
          <div className="absolute inset-0 -z-10 h-full w-full bg-background">
            <AuthProvider>{children}</AuthProvider>
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
