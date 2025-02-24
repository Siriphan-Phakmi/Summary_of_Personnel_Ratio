import './globals.css'

export const metadata = {
  title: 'ระบบรายงานอัตรากำลังและจำนวนผู้ป่วย',
  description: 'ระบบรายงานอัตรากำลังและจำนวนผู้ป่วย',
}

export default function RootLayout({ children }) {
  return (
    <html lang="th" suppressHydrationWarning>
      <body className="bg-gray-50">
        {children}
      </body>
    </html>
  )
}
