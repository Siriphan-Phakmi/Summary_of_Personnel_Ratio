'use client'

import { useEffect } from 'react'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Global error:', error)
  }, [error])

  return (
    <html>
      <body>
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
          <div className="max-w-md w-full space-y-8">
            <div className="text-center">
              <h2 className="mt-6 text-3xl font-extrabold text-gray-900 dark:text-white">
                เกิดข้อผิดพลาดร้าย แรง
              </h2>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                ขออภัย เกิดข้อผิดพลาดร้ายแรงในระบบ
              </p>
            </div>
            <div className="space-y-4">
              <button
                onClick={reset}
                className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              >
                รีเฟรชแอปพลิเคชัน
              </button>
            </div>
          </div>
        </div>
      </body>
    </html>
  )
}