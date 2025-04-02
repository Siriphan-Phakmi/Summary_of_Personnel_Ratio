import React, { useState } from 'react';
import { toast } from 'react-hot-toast';

interface FieldManagerProps {
  collectionId: string;
  documentId: string;
  addField: (fieldName: string, fieldType: string, fieldValue: any) => Promise<boolean>;
  loading: boolean;
}

/**
 * คอมโพเนนต์สำหรับเพิ่มและแก้ไขฟิลด์
 */
const FieldManager: React.FC<FieldManagerProps> = ({
  collectionId,
  documentId,
  addField,
  loading
}) => {
  const [fieldName, setFieldName] = useState('');
  const [fieldType, setFieldType] = useState('string');
  const [fieldValue, setFieldValue] = useState('');
  
  // ฟังก์ชันช่วยแปลงค่าตามประเภทข้อมูล
  const parseFieldValue = (value: string, type: string) => {
    switch (type) {
      case 'string':
        return value;
      case 'number':
        return parseFloat(value);
      case 'boolean':
        return value.toLowerCase() === 'true';
      case 'null':
        return null;
      case 'array':
        try {
          return JSON.parse(value);
        } catch {
          return [];
        }
      case 'object':
        try {
          return JSON.parse(value);
        } catch {
          return {};
        }
      default:
        return value;
    }
  };

  // จัดการการส่งฟอร์ม
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!fieldName.trim()) {
      toast.error('กรุณากรอกชื่อฟิลด์');
      return;
    }
    
    if (fieldType === 'number' && isNaN(parseFloat(fieldValue))) {
      toast.error('กรุณากรอกค่าตัวเลขที่ถูกต้อง');
      return;
    }
    
    if ((fieldType === 'array' || fieldType === 'object') && fieldValue.trim()) {
      try {
        JSON.parse(fieldValue);
      } catch {
        toast.error('รูปแบบ JSON ไม่ถูกต้อง');
        return;
      }
    }
    
    const parsedValue = parseFieldValue(fieldValue, fieldType);
    const success = await addField(fieldName, fieldType, parsedValue);
    
    if (success) {
      toast.success(`เพิ่มฟิลด์ "${fieldName}" สำเร็จ`);
      setFieldName('');
      setFieldValue('');
    }
  };

  // ตัวเลือกประเภทข้อมูล
  const fieldTypes = [
    { value: 'string', label: 'ข้อความ (String)', color: 'text-emerald-600 dark:text-emerald-400' },
    { value: 'number', label: 'ตัวเลข (Number)', color: 'text-blue-600 dark:text-blue-400' },
    { value: 'boolean', label: 'ค่าจริง/เท็จ (Boolean)', color: 'text-purple-600 dark:text-purple-400' },
    { value: 'null', label: 'ค่าว่าง (Null)', color: 'text-gray-600 dark:text-gray-400' },
    { value: 'array', label: 'อาร์เรย์ (Array)', color: 'text-amber-600 dark:text-amber-400' },
    { value: 'object', label: 'ออบเจ็กต์ (Object)', color: 'text-indigo-600 dark:text-indigo-400' }
  ];

  // เลือกสีพื้นหลังตามประเภทข้อมูล
  const getTypeBackgroundColor = () => {
    switch (fieldType) {
      case 'string':
        return 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800';
      case 'number':
        return 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800';
      case 'boolean':
        return 'bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800';
      case 'null':
        return 'bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700';
      case 'array':
        return 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800';
      case 'object':
        return 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800';
      default:
        return 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700';
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 p-5">
      <div className="flex items-center space-x-2 mb-4">
        <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100">
          เพิ่มฟิลด์ใหม่
        </h2>
        <div className="px-2 py-1 rounded bg-gray-100 dark:bg-gray-700 text-xs text-gray-600 dark:text-gray-300">
          {documentId}
        </div>
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="fieldName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            ชื่อฟิลด์
          </label>
          <input
            id="fieldName"
            type="text"
            value={fieldName}
            onChange={(e) => setFieldName(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400"
            placeholder="เช่น title, price, isActive"
          />
        </div>
        
        <div>
          <label htmlFor="fieldType" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            ประเภทข้อมูล
          </label>
          <select
            id="fieldType"
            value={fieldType}
            onChange={(e) => setFieldType(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400"
          >
            {fieldTypes.map((type) => (
              <option key={type.value} value={type.value} className={type.color}>
                {type.label}
              </option>
            ))}
          </select>
          <div className="mt-2 grid grid-cols-3 gap-2">
            {fieldTypes.map((type) => (
              <button
                key={type.value}
                type="button"
                onClick={() => setFieldType(type.value)}
                className={`px-3 py-2 rounded-md text-xs text-center transition-colors ${
                  fieldType === type.value 
                  ? `bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-300 dark:border-blue-700` 
                  : `bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-750`
                }`}
              >
                {type.label}
              </button>
            ))}
          </div>
        </div>
        
        <div>
          <label htmlFor="fieldValue" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            ค่าของฟิลด์
          </label>
          <div className={`rounded-md border ${getTypeBackgroundColor()}`}>
            {fieldType === 'boolean' ? (
              <select
                id="fieldValue"
                value={fieldValue}
                onChange={(e) => setFieldValue(e.target.value)}
                className={`w-full px-3 py-2 rounded-md ${getTypeBackgroundColor()} text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400`}
              >
                <option value="true">จริง (true)</option>
                <option value="false">เท็จ (false)</option>
              </select>
            ) : fieldType === 'null' ? (
              <div className={`px-3 py-2 rounded-md ${getTypeBackgroundColor()} text-gray-500 dark:text-gray-400`}>
                null
              </div>
            ) : (
              <textarea
                id="fieldValue"
                value={fieldValue}
                onChange={(e) => setFieldValue(e.target.value)}
                className={`w-full px-3 py-2 rounded-md ${getTypeBackgroundColor()} text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400`}
                placeholder={
                  fieldType === 'array'
                    ? '[1, 2, 3] หรือ ["a", "b", "c"]'
                    : fieldType === 'object'
                    ? '{"key": "value", "number": 123}'
                    : fieldType === 'number'
                    ? '123 หรือ 123.45'
                    : fieldType === 'string'
                    ? 'ข้อความ หรือ ตัวอักษร'
                    : 'ค่าของฟิลด์'
                }
                rows={fieldType === 'array' || fieldType === 'object' ? 4 : 2}
              />
            )}
          </div>
          
          {(fieldType === 'array' || fieldType === 'object') && (
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              กรุณากรอกในรูปแบบ JSON ที่ถูกต้อง
            </p>
          )}
        </div>
        
        <button
          type="submit"
          disabled={loading}
          className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 text-white rounded-md disabled:opacity-50 transition-colors"
        >
          {loading ? 'กำลังเพิ่ม...' : 'เพิ่มฟิลด์'}
        </button>
      </form>
    </div>
  );
};

export default FieldManager; 