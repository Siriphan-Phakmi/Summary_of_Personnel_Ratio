'use client';
import { Component } from 'react';
import PropTypes from 'prop-types';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    // อัปเดต state เพื่อให้แสดง fallback UI ในการเรนเดอร์ถัดไป
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // ส่ง error ไปยัง logging service หรือ analytics ได้ที่นี่
    console.error('Error caught by ErrorBoundary:', error);
    console.error('Component stack:', errorInfo.componentStack);
    
    // บันทึก error info ใน state
    this.setState({ errorInfo });
    
    // ส่งข้อมูล error ไปยัง service อื่นๆ (ถ้ามี)
    if (typeof window !== 'undefined') {
      // ตัวอย่างการบันทึกไปยัง localStorage เพื่อการ debug
      try {
        localStorage.setItem('lastError', JSON.stringify({
          message: error.message,
          stack: error.stack,
          componentStack: errorInfo.componentStack,
          time: new Date().toISOString()
        }));
      } catch (e) {
        console.warn('Failed to save error to localStorage', e);
      }
    }
  }

  handleRefresh = () => {
    window.location.reload();
  }

  render() {
    if (this.state.hasError) {
      const isDev = process.env.NODE_ENV === 'development';
      
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
          <div className="text-center p-8 bg-white rounded-lg shadow-md max-w-md w-full">
            <h2 className="text-2xl font-semibold text-red-600 mb-4">
              เกิดข้อผิดพลาดบางอย่าง
            </h2>
            <p className="text-gray-600 mb-4">
              กรุณาลองโหลดหน้าใหม่อีกครั้ง หรือติดต่อผู้ดูแลระบบ
            </p>
            
            {/* แสดงรายละเอียดข้อผิดพลาดเฉพาะในโหมด development */}
            {isDev && this.state.error && (
              <div className="my-4 p-3 bg-gray-100 rounded text-left overflow-auto max-h-40">
                <p className="font-mono text-sm text-red-700">{this.state.error.toString()}</p>
                {this.state.errorInfo && (
                  <details className="mt-2">
                    <summary className="cursor-pointer text-sm text-gray-700 font-medium">
                      Stack Trace
                    </summary>
                    <pre className="mt-2 text-xs overflow-auto whitespace-pre-wrap">
                      {this.state.errorInfo.componentStack}
                    </pre>
                  </details>
                )}
              </div>
            )}
            
            <div className="mt-6 flex justify-center">
              <button
                onClick={this.handleRefresh}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition"
              >
                โหลดหน้าใหม่
              </button>
              {this.props.onReset && (
                <button
                  onClick={this.props.onReset}
                  className="ml-3 px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 transition"
                >
                  กลับไปหน้าหลัก
                </button>
              )}
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

ErrorBoundary.propTypes = {
  children: PropTypes.node.isRequired,
  onReset: PropTypes.func
};

export default ErrorBoundary; 