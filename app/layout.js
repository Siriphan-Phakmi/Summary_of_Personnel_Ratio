import './globals.css'

export const metadata = {
  title: 'ระบบรายงานอัตรากำลัง',
  description: 'ระบบรายงานอัตรากำลังและจำนวนผู้ป่วย',
}

export default function RootLayout({ children }) {
  return (
    <html lang="th">
      <body className="bg-gray-50">
        {children}
      </body>
    </html>
  )
}
