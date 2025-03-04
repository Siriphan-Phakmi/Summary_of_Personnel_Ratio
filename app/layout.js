import './globals.css';
import { Providers } from './context/Providers';
import { APP_VERSION } from './config/version';

export const metadata = {
  title: "Summary of Personnel Ratio and Daily Patient Census",
  description: "ระบบรายงานตรากำคลากรและจำนวน้ป่วยราย",
};

export default function RootLayout({ children }) {
  return (
    <html lang="th" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Prompt:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body className="bg-gradient-to-br from-blue-50 to-teal-50">
        <Providers>
          {children}
          <div className="fixed bottom-4 right-4 text-sm text-gray-500 z-50">
            {APP_VERSION}
          </div>
        </Providers>
      </body>
    </html>
  );
}
