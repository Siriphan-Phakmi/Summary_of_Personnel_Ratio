'use client';
import { Component } from 'react';
import PropTypes from 'prop-types';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // ส่ง error ไปยัง logging service หรือ analytics ได้ที่นี่
    console.error('Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center p-8 bg-white rounded-lg shadow-md">
            <h2 className="text-2xl font-semibold text-red-600 mb-4">
              เกิดข้อผิดพลาดบางอย่าง
            </h2>
            <p className="text-gray-600 mb-4">
              กรุณาลองโหลดหน้าใหม่อีกครั้ง หรือติดต่อผู้ดูแลระบบ
            </p>
            <button
              onClick={() => window.location.reload()}
              className="bg-[#0ab4ab] text-white px-4 py-2 rounded-lg hover:bg-[#0ab4ab]/80"
            >
              โหลดหน้าใหม่
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

ErrorBoundary.propTypes = {
  children: PropTypes.node.isRequired
};

export default ErrorBoundary; 