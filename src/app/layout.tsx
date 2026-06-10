import './globals.css';
import { Outfit, Fira_Code } from 'next/font/google';

const outfit = Outfit({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

const firaCode = Fira_Code({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
});

export const metadata = {
  title: 'NeonCortex // Second Brain',
  description: 'Cybernetic second brain system for cognitive RAM, Cache, and Hard Drive storage.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className={`${outfit.variable} ${firaCode.variable}`}>
      <body>{children}</body>
    </html>
  );
}
