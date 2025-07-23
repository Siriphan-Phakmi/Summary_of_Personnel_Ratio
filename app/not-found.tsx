import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900 dark:text-white">
            404 - ไม่พบหน้าที่ต้องการ
          </h2>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            ขออภัย ไม่สามารถค้นหาหน้าที่คุณต้องการได้
          </p>
        </div>
        <div className="text-center">
          <Link
            href="/"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            กลับหน้าหลัก
          </Link>
        </div>
      </div>
    </div>
  )
}