import './globals.css'
import Link from 'next/link'

export const metadata = {
  title: 'ระบบรายงานอัตรากำลังและจำนวนผู้ป่วย',
  description: 'ระบบรายงานอัตรากำลังและจำนวนผู้ป่วย',
}

export default function RootLayout({ children }) {
  return (
    <html lang="th" suppressHydrationWarning>
      <body className="bg-gray-50">
        <nav>
          <Link href="/admin/login" className="hover:text-blue-600">
            Supervisor
          </Link>
        </nav>
        {children}
      </body>
    </html>
  )
}
