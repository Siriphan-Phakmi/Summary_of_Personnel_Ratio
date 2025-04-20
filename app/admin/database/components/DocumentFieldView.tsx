import React, { useState, useMemo } from 'react';
import { Field } from '../hooks/useFirestoreDocument';
import { deleteDocumentField } from '../services/databaseService';
import { toast } from 'react-hot-toast';
import { useAuth } from '@/app/features/auth';

// ส่วนแสดงค่าเพื่อแสดงค่าในแต่ละประเภทข้อมูล
const FieldValueDisplay: React.FC<{ field: Field }> = ({ field }) => {
  // ข้อมูลที่แสดงขึ้นอยู่กับประเภทข้อมูล
  switch (field.type) {
    case 'string':
      return (
        <div className="overflow-hidden text-ellipsis whitespace-nowrap text-green-600 dark:text-green-400 max-w-sm font-mono">
          "{field.value}"
        </div>
      );
    case 'number':
      return (
        <div className="text-blue-600 dark:text-blue-400 font-mono">
          {field.value}
        </div>
      );
    case 'boolean':
      return (
        <div className={`font-medium font-mono ${field.value ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
          {String(field.value)}
        </div>
      );
    case 'array':
      return (
        <div className="text-yellow-600 dark:text-yellow-400 font-mono">
          [Array:{Array.isArray(field.value) ? field.value.length : 0}]
        </div>
      );
    case 'object':
      return (
        <div className="text-purple-600 dark:text-purple-400 font-mono">
          {`Object: ${typeof field.value === 'object' && field.value !== null ? Object.keys(field.value).length : 0} keys`}
        </div>
      );
    case 'null':
      return <div className="text-gray-400 italic font-mono">null</div>;
    case 'timestamp':
      return (
        <div className="text-orange-600 dark:text-orange-400 font-mono">
          {field.value instanceof Date ? field.value.toISOString() : String(field.value)}
        </div>
      );
    default:
      return <div className="text-gray-600 dark:text-gray-400 font-mono">{String(field.value)}</div>;
  }
};

// ส่วนแสดงรายละเอียดเมื่อคลิกที่ฟิลด์
const FieldDetailsView: React.FC<{ field: Field }> = ({ field }) => {
  // แสดงค่าแบบพรีวิวตามประเภทข้อมูล
  const getFormattedValue = () => {
    switch (field.type) {
      case 'string':
        return `"${field.value}"`;
      case 'object':
      case 'array':
        try {
          return JSON.stringify(field.value, null, 2);
        } catch (e) {
          return String(field.value);
        }
      case 'timestamp':
        if (field.value instanceof Date) {
          return field.value.toISOString();
        }
        return String(field.value);
      default:
        return String(field.value);
    }
  };

  return (
    <div className="p-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-750 text-sm">
      <div className="mb-2">
        <span className="font-medium text-gray-700 dark:text-gray-300">ประเภทข้อมูล: </span>
        <span className={`px-2 py-1 text-xs rounded-full ${getTypeColor(field.type)}`}>
          {field.type}
        </span>
      </div>
      
      <div className="mb-2">
        <span className="font-medium text-gray-700 dark:text-gray-300">ค่า:</span>
      </div>
      
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md p-3 overflow-x-auto max-h-36 font-mono text-xs">
        <pre className="whitespace-pre-wrap break-all text-gray-800 dark:text-gray-200">
          {getFormattedValue()}
        </pre>
      </div>
    </div>
  );
};

// สีตามประเภทข้อมูล
const getTypeColor = (type: string): string => {
  switch (type) {
    case 'string':
      return 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300';
    case 'number':
      return 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300';
    case 'boolean':
      return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300';
    case 'array':
      return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300';
    case 'object':
      return 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300';
    case 'null':
      return 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300';
    case 'timestamp':
      return 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300';
    default:
      return 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300';
  }
};

interface DocumentFieldViewProps {
  fields: Field[];
  loading: boolean;
  collectionId: string;
  documentId: string;
  onFieldUpdate: (fieldName: string, value: any, type: string) => Promise<boolean>;
}

const DocumentFieldView: React.FC<DocumentFieldViewProps> = ({
  fields,
  loading,
  collectionId,
  documentId,
  onFieldUpdate
}) => {
  // State เพื่อติดตามว่าฟิลด์ใดที่กำลังแสดงรายละเอียด
  const [expandedField, setExpandedField] = useState<string | null>(null);
  // State สำหรับค้นหาฟิลด์
  const [searchTerm, setSearchTerm] = useState('');
  // State สำหรับการเรียงลำดับ
  const [sortType, setSortType] = useState<'name-asc' | 'name-desc' | 'type'>('name-asc');
  // State สำหรับการลบฟิลด์
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null);
  // State สำหรับการแก้ไขฟิลด์
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<any>('');
  const { user: currentUser } = useAuth();

  // กรองและเรียงลำดับฟิลด์
  const filteredAndSortedFields = useMemo(() => {
    // กรองตามคำค้นหา
    const sanitizedSearchTerm = searchTerm.trim().toLowerCase();
    
    let filtered = fields;
    if (sanitizedSearchTerm) {
      filtered = fields.filter(field => 
        field.name.toLowerCase().includes(sanitizedSearchTerm) || 
        String(field.value).toLowerCase().includes(sanitizedSearchTerm)
      );
    }
    
    // เรียงลำดับตามที่เลือก
    return [...filtered].sort((a, b) => {
      if (sortType === 'name-asc') {
        return a.name.localeCompare(b.name);
      } else if (sortType === 'name-desc') {
        return b.name.localeCompare(a.name);
      } else if (sortType === 'type') {
        return a.type.localeCompare(b.type);
      }
      return 0;
    });
  }, [fields, searchTerm, sortType]);

  // สลับรายละเอียดของฟิลด์
  const toggleFieldDetails = (fieldName: string) => {
    setExpandedField(expandedField === fieldName ? null : fieldName);
  };

  // ดำเนินการลบฟิลด์
  const handleDeleteField = async (fieldName: string) => {
    if (!confirm(`คุณต้องการลบฟิลด์ "${fieldName}" ใช่หรือไม่?`)) {
      return;
    }

    try {
      setDeleteLoading(fieldName);
      const success = await deleteDocumentField(`${collectionId}/${documentId}`, fieldName, currentUser);
      
      if (success) {
        toast.success(`ลบฟิลด์ "${fieldName}" สำเร็จ`);
        if (expandedField === fieldName) {
          setExpandedField(null);
        }
      } else {
        toast.error('เกิดข้อผิดพลาดในการลบฟิลด์');
      }
    } catch (error) {
      console.error('Error deleting field:', error);
      toast.error('เกิดข้อผิดพลาดในการลบฟิลด์');
    } finally {
      setDeleteLoading(null);
    }
  };

  // เข้าสู่โหมดแก้ไขฟิลด์
  const startEditField = (field: Field) => {
    setEditingField(field.name);
    setEditValue(field.value);
  };

  // บันทึกการแก้ไขฟิลด์
  const saveFieldEdit = async (field: Field) => {
    try {
      const success = await onFieldUpdate(field.name, editValue, field.type);
      if (success) {
        toast.success(`แก้ไขฟิลด์ "${field.name}" สำเร็จ`);
        setEditingField(null);
      }
    } catch (error) {
      console.error('Error updating field:', error);
      toast.error('เกิดข้อผิดพลาดในการแก้ไขฟิลด์');
    }
  };

  // ยกเลิกการแก้ไขฟิลด์
  const cancelFieldEdit = () => {
    setEditingField(null);
  };

  // แสดงฟอร์มแก้ไขตามประเภทข้อมูล
  const renderEditForm = (field: Field) => {
    switch (field.type) {
      case 'string':
        return (
          <input
            type="text"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            className="w-full px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            autoFocus
          />
        );
      case 'number':
        return (
          <input
            type="number"
            value={editValue}
            onChange={(e) => setEditValue(Number(e.target.value))}
            className="w-full px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            autoFocus
          />
        );
      case 'boolean':
        return (
          <select
            value={String(editValue)}
            onChange={(e) => setEditValue(e.target.value === 'true')}
            className="w-full px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            autoFocus
          >
            <option value="true">true</option>
            <option value="false">false</option>
          </select>
        );
      default:
        return (
          <div className="text-sm text-gray-500 dark:text-gray-400 italic">
            การแก้ไขประเภทข้อมูลนี้ยังไม่รองรับในหน้าจอนี้
          </div>
        );
    }
  };

  // แสดงหน้าแสดงผลกำลังโหลด
  if (loading) {
    return (
      <div className="p-6 text-center">
        <div className="inline-block animate-pulse bg-gray-200 dark:bg-gray-700 h-5 w-36 rounded-md mb-2"></div>
        <div className="space-y-3">
          {[1, 2, 3].map((item) => (
            <div key={item} className="bg-gray-100 dark:bg-gray-750 rounded-md p-4">
              <div className="animate-pulse bg-gray-200 dark:bg-gray-700 h-4 w-1/3 rounded-md mb-3"></div>
              <div className="animate-pulse bg-gray-200 dark:bg-gray-700 h-3 w-2/3 rounded-md"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // แสดงข้อความว่าไม่มีฟิลด์ถ้าไม่พบข้อมูล
  if (!fields.length) {
    return (
      <div className="p-6 text-center text-gray-500 dark:text-gray-400">
        ยังไม่มีฟิลด์ในเอกสารนี้ กรุณาเพิ่มฟิลด์ด้านบน
      </div>
    );
  }

  return (
    <div className="p-4">
      <div className="mb-4 space-y-2">
        {/* ตัวกรองและค้นหาฟิลด์ */}
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="ค้นหาฟิลด์..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 pl-10 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            />
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 absolute left-3 top-2.5 text-gray-400 dark:text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            {searchTerm && (
              <button
                className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
                onClick={() => setSearchTerm('')}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
          
          <select
            value={sortType}
            onChange={(e) => setSortType(e.target.value as any)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          >
            <option value="name-asc">เรียงตามชื่อ (ก-ฮ)</option>
            <option value="name-desc">เรียงตามชื่อ (ฮ-ก)</option>
            <option value="type">เรียงตามประเภทข้อมูล</option>
          </select>
        </div>
        
        {filteredAndSortedFields.length === 0 && (
          <div className="text-center py-4 text-gray-500 dark:text-gray-400">
            ไม่พบฟิลด์ที่ตรงกับคำค้นหา
          </div>
        )}
      </div>

      <div className="space-y-2">
        {filteredAndSortedFields.map((field) => (
          <div key={field.name} className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden transition-shadow hover:shadow-md">
            <div className="p-3 bg-white dark:bg-gray-800 flex items-center justify-between gap-2">
              <div 
                className="flex-1 truncate cursor-pointer" 
                onClick={() => toggleFieldDetails(field.name)}
              >
                <div className="flex items-center gap-2">
                  <span className={`inline-block w-2 h-2 rounded-full ${getTypeIndicatorColor(field.type)}`}></span>
                  <span className="font-medium text-gray-900 dark:text-gray-100">{field.name}</span>
                </div>
              </div>
              
              {editingField === field.name ? (
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => saveFieldEdit(field)}
                    className="text-green-600 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300"
                    title="บันทึก"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </button>
                  <button
                    onClick={cancelFieldEdit}
                    className="text-gray-600 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                    title="ยกเลิก"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ) : (
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => startEditField(field)}
                    className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                    title="แก้ไข"
                    disabled={!['string', 'number', 'boolean'].includes(field.type)}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => handleDeleteField(field.name)}
                    className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                    title="ลบฟิลด์"
                    disabled={deleteLoading === field.name}
                  >
                    {deleteLoading === field.name ? (
                      <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    )}
                  </button>
                  <button
                    onClick={() => toggleFieldDetails(field.name)}
                    className="text-gray-600 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                    title={expandedField === field.name ? "ซ่อนรายละเอียด" : "แสดงรายละเอียด"}
                  >
                    {expandedField === field.name ? (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                      </svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    )}
                  </button>
                </div>
              )}
            </div>
            
            {editingField === field.name ? (
              <div className="p-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-750">
                {renderEditForm(field)}
              </div>
            ) : (
              <>
                <div className="px-3 pb-3 pt-0 bg-white dark:bg-gray-800">
                  <FieldValueDisplay field={field} />
                </div>
                
                {expandedField === field.name && (
                  <FieldDetailsView field={field} />
                )}
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

// สีสำหรับตัวแสดงประเภทข้อมูล
const getTypeIndicatorColor = (type: string): string => {
  switch (type) {
    case 'string':
      return 'bg-green-500';
    case 'number':
      return 'bg-blue-500';
    case 'boolean':
      return 'bg-yellow-500';
    case 'array':
      return 'bg-yellow-500';
    case 'object':
      return 'bg-purple-500';
    case 'null':
      return 'bg-gray-500';
    case 'timestamp':
      return 'bg-orange-500';
    default:
      return 'bg-gray-500';
  }
};

export default DocumentFieldView; 