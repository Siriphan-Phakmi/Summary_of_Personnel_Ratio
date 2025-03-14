import * as Sentry from '@sentry/nextjs';

export const initSentry = () => {
  if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
    Sentry.init({
      dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
      environment: process.env.NODE_ENV,
      tracesSampleRate: 1.0,
      integrations: [
        new Sentry.BrowserTracing({
          tracePropagationTargets: ['localhost', /^https:\/\/yourapp\.com/],
        }),
      ],
    });
  }
};

export const captureException = (error, context = {}) => {
  Sentry.withScope((scope) => {
    Object.entries(context).forEach(([key, value]) => {
      scope.setExtra(key, value);
    });
    Sentry.captureException(error);
  });
};

export const captureMessage = (message, level = 'info') => {
  Sentry.captureMessage(message, level);
};

export const setUserContext = (user) => {
  Sentry.setUser(user);
};

// Performance monitoring
export const startTransaction = (name, op) => {
  return Sentry.startTransaction({
    name,
    op,
  });
};

// Custom error boundary component with Sentry
export const withErrorBoundary = (Component) => {
  return Sentry.withErrorBoundary(Component, {
    fallback: (error) => (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center p-8 bg-white rounded-lg shadow-md">
          <h2 className="text-2xl font-semibold text-red-600 mb-4">
            เกิดข้อผิดพลาดบางอย่าง
          </h2>
          <p className="text-gray-600 mb-4">
            ระบบได้บันทึกข้อผิดพลาดแล้ว ทีมงานจะรีบดำเนินการแก้ไขโดยเร็วที่สุด
          </p>
          <button
            onClick={() => window.location.reload()}
            className="bg-[#0ab4ab] text-white px-4 py-2 rounded-lg hover:bg-[#0ab4ab]/80"
          >
            ลองใหม่อีกครั้ง
          </button>
        </div>
      </div>
    ),
  });
}; 