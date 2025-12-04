// Root layout for the app — provides required <html> and <body> tags
import './globals.css';
import { Providers } from './providers';

export const metadata = {
  title: 'HRM Portal',
  description: 'Human Resource Management Portal',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
