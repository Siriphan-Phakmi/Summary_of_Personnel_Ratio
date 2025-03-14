import './globals.css';

export const metadata = {
  title: 'Daily Patient Census and Staffing',
  description: 'ระบบข้อมูลป่วยและตรากำคลากร',
  icons: {
    icon: [
      {
        url: '/images/bpk9.ico',
        type: 'image/x-icon',
        sizes: '16x16'
      }
    ]
  }
};

import ClientLayout from './ClientLayout';

export default function RootLayout({ children }) {
  return (
    <html lang="th" suppressHydrationWarning>
      <head>
        <meta charSet="utf-8" />
        <link
          href="https://fonts.googleapis.com/css2?family=Sarabun:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  );
}
