'use client';
import { Component } from 'react';
import PropTypes from 'prop-types';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { 
      hasError: false,
      error: null,
      isChunkError: false
    };
  }

  static getDerivedStateFromError(error) {
    // เช็คว่าเป็น ChunkLoadError หรือไม่
    const isChunkError = error.name === 'ChunkLoadError' || 
                         (error.message && error.message.includes('Loading chunk') && error.message.includes('failed'));
    
    return {
      hasError: true,
      error: error,
      isChunkError
    };
  }

  componentDidCatch(error, errorInfo) {
    // ส่ง error ไปยัง error tracking service (ถ้ามี)
    console.error('Error caught by ErrorBoundary:', error, errorInfo);
  }

  handleRefresh = () => {
    // รีเฟรชหน้าเพื่อโหลด chunks ใหม่
    window.location.reload();
  }

  render() {
    if (this.state.hasError) {
      // แสดงข้อความข้อผิดพลาดที่เป็นมิตรกับผู้ใช้
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
          <div className="max-w-md w-full space-y-6 bg-white p-6 rounded-xl shadow-lg border border-gray-200">
            <div className="text-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              
              <h2 className="mt-4 text-xl font-bold text-gray-900">เกิดข้อผิดพลาดในระบบ</h2>
              
              {this.state.isChunkError ? (
                <p className="mt-2 text-gray-600">
                  มีการอัพเดทแอพใหม่ หรือมีปัญหาในการโหลดข้อมูล กรุณารีเฟรชหน้าเพื่อแก้ไขปัญหา
                </p>
              ) : (
                <p className="mt-2 text-gray-600">
                  เกิดข้อผิดพลาดที่ไม่คาดคิด กรุณาลองใหม่อีกครั้ง
                </p>
              )}
              
              <div className="mt-6">
                <button
                  onClick={this.handleRefresh}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
                >
                  โหลดหน้าใหม่
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    // แสดงเนื้อหาปกติถ้าไม่มีข้อผิดพลาด
    return this.props.children;
  }
}

ErrorBoundary.propTypes = {
  children: PropTypes.node.isRequired
};

export default ErrorBoundary; 