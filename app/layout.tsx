import type { ReactNode } from 'react';

export const metadata = {
  title: 'mini-order',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ko">
      <body style={{ fontFamily: 'system-ui, sans-serif', padding: 24, maxWidth: 720, margin: '0 auto' }}>
        {children}
      </body>
    </html>
  );
}
