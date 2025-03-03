import './globals.css';
import { Providers } from './context/Providers';

export const metadata = {
  title: "Summary of Personnel Ratio and Daily Patient Census",
  description: "ระบบรายงานสรุปอัตรากำลังบุคลากรและจำนวนผู้ป่วยรายวัน",
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
        </Providers>
      </body>
    </html>
  );
}
