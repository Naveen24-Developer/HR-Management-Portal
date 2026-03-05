// Root layout for the app — provides required <html> and <body> tags
import './globals.css';
import { Providers } from './providers';

export const metadata = {
  title: 'HRM Portal',
  description: 'Human Resource Management Portal',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning={true}>
      {/* early script removes attributes injected by browser extensions (bis_skin_checked, etc.)
          before React hydrates.  This prevents hydration-mismatch warnings that are caused
          by extensions like Bitwarden/Bitdefender modifying the DOM. */}
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function removeExtensionAttrs() {
                // remove attributes added by extensions or other runtime scripts
                // common prefixes: bis_ and __processed_
                const prefixRegex = /^(bis_|__processed_)/;
                function clean() {
                  document.querySelectorAll('*').forEach(el => {
                    [...el.attributes].forEach(attr => {
                      if (prefixRegex.test(attr.name)) {
                        el.removeAttribute(attr.name);
                      }
                    });
                  });
                }
                // run as soon as possible (script is in head)
                try { clean(); } catch (e) {}
                if (document.readyState === 'loading') {
                  document.addEventListener('DOMContentLoaded', clean);
                }
                new MutationObserver(clean).observe(document.documentElement, {
                  attributes: true,
                  childList: true,
                  subtree: true,
                });
              })();
            `,
          }}
        />
      </head>
      <body>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
