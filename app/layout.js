import { IBM_Plex_Sans_Thai } from "next/font/google";
import "./globals.css";

const ibmPlexSansThai = IBM_Plex_Sans_Thai({
  weight: ['400', '500', '600'],
  subsets: ['thai', 'latin'],
  variable: '--font-ibm-plex-sans-thai',
});

export const metadata = {
  title: "สรุปอัตรากำลังและจำนวนผู้ป่วยประจำวัน",
  description: "ระบบสรุปอัตรากำลังและจำนวนผู้ป่วยประจำวัน",
};

export default function RootLayout({ children }) {
  return (
    <html lang="th" suppressHydrationWarning>
      <body className={`${ibmPlexSansThai.variable} font-sans bg-gray-50`}>
        {children}
      </body>
    </html>
  );
}
