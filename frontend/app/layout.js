import { Inter, Outfit } from 'next/font/google';
import './globals.css';

const outfit = Outfit({ subsets: ['latin'], variable: '--font-outfit', display: 'swap' });
const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' });

export const metadata = {
  // The page <title> is rendered per URL by AppRoot (see lib/routes.js → titleFor).
  description: 'Turn your audience from followers into collaborators. FanOS organises communities, ideas, talent and opportunities with AI — then helps creators turn the best of them into action.',
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#f6f5f2',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${outfit.variable} ${inter.variable}`}>
      <body className="min-h-screen antialiased selection:bg-accent/20">{children}</body>
    </html>
  );
}
