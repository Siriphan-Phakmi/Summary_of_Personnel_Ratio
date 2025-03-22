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
import Script from 'next/script';

export default function RootLayout({ children }) {
  return (
    <html lang="th" suppressHydrationWarning>
      <head>
        <meta charSet="utf-8" />
        <link
          href="https://fonts.googleapis.com/css2?family=Sarabun:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
        {/* เพิ่ม inline script เพื่อรีเซ็ต loading ค้างเมื่อโหลดหน้า */}
        <Script id="emergency-reset-loading" strategy="beforeInteractive">
          {`
            try {
              // ตรวจสอบและแก้ไขเมื่อหน้าเว็บโหลดเสร็จ
              function emergencyResetAlert() {
                // ลบ loading modal ทั้งหมด
                const sweetAlertContainers = document.querySelectorAll('.swal2-container');
                if (sweetAlertContainers.length > 0) {
                  sweetAlertContainers.forEach(container => container.remove());
                }
                
                // ลบ backdrop ทั้งหมด
                const backdrops = document.querySelectorAll('.swal2-backdrop-show');
                if (backdrops.length > 0) {
                  backdrops.forEach(backdrop => backdrop.remove());
                }
                
                // รีเซ็ต body style
                document.body.classList.remove('swal2-shown', 'swal2-height-auto');
                document.body.style.overflow = '';
                document.body.style.paddingRight = '';
                
                return true;
              }
              
              // ทำทันทีเมื่อ script นี้ทำงาน
              emergencyResetAlert();
              
              // ทำอีกครั้งเมื่อ DOM โหลดเสร็จ
              document.addEventListener('DOMContentLoaded', emergencyResetAlert);
              
              // ทำอีกครั้งเมื่อ window โหลดเสร็จ
              window.addEventListener('load', emergencyResetAlert);
              
              // ตั้งค่าให้สามารถใช้ได้ทั่วโปรแกรม
              window.emergencyResetAlert = emergencyResetAlert;
            } catch (err) {
              console.error('Error in emergency reset script:', err);
            }
          `}
        </Script>
      </head>
      <body>
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  );
}
