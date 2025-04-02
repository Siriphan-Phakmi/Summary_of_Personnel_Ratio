import React, { useState, useEffect, useMemo } from 'react';
import { useFirestoreCollection } from '../hooks/useFirestoreCollection';
import { useFirestoreDocument } from '../hooks/useFirestoreDocument';
import { toast } from 'react-hot-toast';
import { collectionTemplates } from '../services/databaseService';
import FieldManager from './FieldManager';
import DocumentFieldView from './DocumentFieldView';
import { deleteCollectionV2 as deleteCollection, deleteDocument } from '../services/databaseService';

/**
 * คอมโพเนนต์สำหรับจัดการคอลเลกชันและเอกสารใน Firestore
 */
const CollectionManager: React.FC = () => {
  // Custom hooks
  const { 
    collections, 
    loading: collectionsLoading, 
    error: collectionsError, 
    addCollection,
    loadCollections
  } = useFirestoreCollection();
  
  // State สำหรับฟอร์มสร้างคอลเลกชันใหม่
  const [newCollectionId, setNewCollectionId] = useState('');
  const [selectedCollection, setSelectedCollection] = useState<string | null>(null);
  const [showTemplateSelector, setShowTemplateSelector] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null);
  
  // State สำหรับการค้นหา
  const [collectionSearchTerm, setCollectionSearchTerm] = useState('');
  const [documentSearchTerm, setDocumentSearchTerm] = useState('');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // ตัวเลือกเทมเพลตที่มี
  const templateOptions = Object.keys(collectionTemplates);
  
  // ใช้ custom hook สำหรับจัดการเอกสารเมื่อเลือกคอลเลกชัน
  const { 
    documents,
    selectedDocument,
    fields,
    loading: documentsLoading,
    error: documentsError,
    setSelectedDocument,
    addDocument,
    addOrUpdateField,
    loadDocuments
  } = useFirestoreDocument(selectedCollection || '');

  // กรองและเรียงลำดับคอลเลกชัน
  const filteredCollections = useMemo(() => {
    // ป้องกัน XSS ด้วยการกรองคำค้นหา
    const sanitizedSearchTerm = collectionSearchTerm.trim().toLowerCase().replace(/[^\w\s]/gi, '');
    
    if (!sanitizedSearchTerm) return collections;
    
    return collections.filter(collection => 
      collection.id.toLowerCase().includes(sanitizedSearchTerm)
    );
  }, [collections, collectionSearchTerm]);

  // กรองและเรียงลำดับเอกสาร
  const filteredDocuments = useMemo(() => {
    // ป้องกัน XSS ด้วยการกรองคำค้นหา
    const sanitizedSearchTerm = documentSearchTerm.trim().toLowerCase().replace(/[^\w\s]/gi, '');
    
    let filtered = documents;
    
    if (sanitizedSearchTerm) {
      filtered = documents.filter(doc => 
        doc.id.toLowerCase().includes(sanitizedSearchTerm)
      );
    }
    
    // เรียงลำดับตาม id
    return [...filtered].sort((a, b) => {
      if (sortOrder === 'asc') {
        return a.id.localeCompare(b.id);
      } else {
        return b.id.localeCompare(a.id);
      }
    });
  }, [documents, documentSearchTerm, sortOrder]);

  // เลือกคอลเลกชันที่ใช้งาน
  const handleSelectCollection = (collectionId: string) => {
    setSelectedCollection(collectionId);
    setDocumentSearchTerm('');
  };

  // ป้องกัน XSS ใน input
  const sanitizeInput = (input: string): string => {
    return input.replace(/[<>]/g, '');
  };

  // จัดการสร้างคอลเลกชันใหม่
  const handleCreateCollection = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // ป้องกัน XSS และตรวจสอบค่าว่างเป็น
    const sanitizedCollectionId = sanitizeInput(newCollectionId.trim());
    if (!sanitizedCollectionId) {
      toast.error('กรุณากรอกไอดีของคอลเลกชัน');
      return;
    }
    
    // ตรวจสอบชื่อคอลเลกชันให้ถูกต้อง (a-z, A-Z, 0-9, _)
    if (!/^[a-zA-Z0-9_]+$/.test(sanitizedCollectionId)) {
      toast.error('ไอดีคอลเลกชันต้องประกอบด้วยตัวอักษรภาษาอังกฤษ ตัวเลข หรือขีดล่างเท่านั้น');
      return;
    }
    
    // ตรวจสอบว่าเป็นการสร้างจากเทมเพลตหรือไม่
    const isTemplateCollection = templateOptions.includes(sanitizedCollectionId);
    
    const success = await addCollection(sanitizedCollectionId);
    
    if (success) {
      if (isTemplateCollection) {
        toast.success(`สร้างคอลเลกชันจากเทมเพลต "${sanitizedCollectionId}" สำเร็จ`);
      } else {
        toast.success(`สร้างคอลเลกชันใหม่ "${sanitizedCollectionId}" สำเร็จ`);
      }
      
      setNewCollectionId('');
      setShowTemplateSelector(false);
      setSelectedCollection(sanitizedCollectionId);
    }
  };

  // รีเฟรชข้อมูล
  const handleRefresh = async () => {
    setIsRefreshing(true);
    
    try {
      await loadCollections();
      if (selectedCollection) {
        await loadDocuments();
      }
      toast.success('รีเฟรชข้อมูลสำเร็จ');
    } catch (error) {
      console.error('Error refreshing data:', error);
      toast.error('เกิดข้อผิดพลาดในการรีเฟรชข้อมูล');
    } finally {
      setIsRefreshing(false);
    }
  };

  // ลบคอลเลกชัน
  const handleDeleteCollection = async (collectionId: string) => {
    if (!confirm(`ยืนยันการลบคอลเลกชัน "${collectionId}"? การดำเนินการนี้ไม่สามารถย้อนกลับได้และข้อมูลทั้งหมดจะถูกลบ`)) {
      return;
    }

    try {
      setDeleteLoading(collectionId);
      const success = await deleteCollection(collectionId);
      
      if (success) {
        toast.success(`ลบคอลเลกชัน "${collectionId}" สำเร็จ`);
        if (selectedCollection === collectionId) {
          setSelectedCollection(null);
        }
        await loadCollections();
      } else {
        toast.error('เกิดข้อผิดพลาดในการลบคอลเลกชัน');
      }
    } catch (error) {
      console.error('Error deleting collection:', error);
      toast.error('เกิดข้อผิดพลาดในการลบคอลเลกชัน');
    } finally {
      setDeleteLoading(null);
    }
  };

  // ลบเอกสาร
  const handleDeleteDocument = async (documentId: string) => {
    if (!selectedCollection) return;
    
    if (!confirm(`ยืนยันการลบเอกสาร "${documentId}"? การดำเนินการนี้ไม่สามารถย้อนกลับได้และข้อมูลทั้งหมดจะถูกลบ`)) {
      return;
    }

    try {
      setDeleteLoading(documentId);
      const success = await deleteDocument(selectedCollection, documentId);
      
      if (success) {
        toast.success(`ลบเอกสาร "${documentId}" สำเร็จ`);
        if (selectedDocument === documentId) {
          setSelectedDocument(null);
        }
        await loadDocuments();
      } else {
        toast.error('เกิดข้อผิดพลาดในการลบเอกสาร');
      }
    } catch (error) {
      console.error('Error deleting document:', error);
      toast.error('เกิดข้อผิดพลาดในการลบเอกสาร');
    } finally {
      setDeleteLoading(null);
    }
  };

  // แสดงหรือซ่อนตัวเลือกเทมเพลต
  const toggleTemplateSelector = () => {
    setShowTemplateSelector(!showTemplateSelector);
  };

  // เลือกเทมเพลตสำหรับสร้างคอลเลกชัน
  const handleSelectTemplate = (templateName: string) => {
    setNewCollectionId(templateName);
    setShowTemplateSelector(false);
  };

  // สลับการเรียงลำดับเอกสาร
  const toggleSortOrder = () => {
    setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
  };

  // สร้างเอกสารใหม่
  const [newDocumentId, setNewDocumentId] = useState('');
  
  const handleCreateDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedCollection) {
      toast.error('กรุณาเลือกคอลเลกชันก่อน');
      return;
    }
    
    // ป้องกัน XSS และตรวจสอบค่าว่างเป็น
    const sanitizedDocumentId = sanitizeInput(newDocumentId.trim());
    if (!sanitizedDocumentId) {
      toast.error('กรุณากรอกไอดีของเอกสาร');
      return;
    }
    
    // ตรวจสอบชื่อเอกสารให้ถูกต้อง (ไม่ควรมีอักขระพิเศษบางตัว)
    if (!/^[a-zA-Z0-9_\-]+$/.test(sanitizedDocumentId)) {
      toast.error('ไอดีเอกสารต้องประกอบด้วยตัวอักษรภาษาอังกฤษ ตัวเลข ขีดล่าง หรือขีดกลางเท่านั้น');
      return;
    }
    
    const success = await addDocument(sanitizedDocumentId);
    
    if (success) {
      toast.success(`สร้างเอกสารใหม่ "${sanitizedDocumentId}" สำเร็จ`);
      setNewDocumentId('');
    }
  };

  // แสดงข้อความ error ถ้ามี
  if (collectionsError) {
    return (
      <div className="p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-md mb-4">
        <p>{collectionsError}</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* ส่วนซ้าย: จัดการคอลเลกชัน */}
      <div className="lg:col-span-1 space-y-6">
        {/* ฟอร์มสร้างคอลเลกชันใหม่ */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">สร้างคอลเลกชันใหม่</h2>
          
          <form onSubmit={handleCreateCollection} className="space-y-4">
            <div className="flex flex-col space-y-2">
              <div className="flex gap-3">
                <input
                  type="text"
                  placeholder="ชื่อคอลเลกชัน"
                  value={newCollectionId}
                  onChange={(e) => setNewCollectionId(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400"
                />
                <button
                  type="button"
                  onClick={toggleTemplateSelector}
                  className="px-3 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-md transition-colors"
                >
                  เทมเพลต
                </button>
              </div>
              
              {showTemplateSelector && (
                <div className="mt-2 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-md shadow-sm p-2">
                  <div className="text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                    เลือกเทมเพลต:
                  </div>
                  <div className="grid grid-cols-1 gap-1">
                    {templateOptions.map((template) => (
                      <button
                        key={template}
                        type="button"
                        onClick={() => handleSelectTemplate(template)}
                        className="text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-600 rounded-md transition-colors text-gray-800 dark:text-gray-200"
                      >
                        {template}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
            
            <button
              type="submit"
              disabled={collectionsLoading}
              className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md disabled:opacity-50 transition-colors focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800"
            >
              {collectionsLoading ? 'กำลังสร้าง...' : 'สร้างคอลเลกชัน'}
            </button>
          </form>
        </div>

        {/* ค้นหาและรายการคอลเลกชัน */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                คอลเลกชันทั้งหมด
                {collections.length > 0 && (
                  <span className="ml-2 text-sm text-gray-500 dark:text-gray-400">
                    ({filteredCollections.length}/{collections.length})
                  </span>
                )}
              </h2>
              <button 
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 transition-colors"
                title="รีเฟรชข้อมูล"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 ${isRefreshing ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
            </div>
            
            <div className="relative">
              <input
                type="text"
                placeholder="ค้นหาคอลเลกชัน..."
                value={collectionSearchTerm}
                onChange={(e) => setCollectionSearchTerm(e.target.value)}
                className="w-full px-3 py-2 pl-10 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400"
              />
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 absolute left-3 top-2.5 text-gray-400 dark:text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              {collectionSearchTerm && (
                <button
                  className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
                  onClick={() => setCollectionSearchTerm('')}
                  title="ล้างการค้นหา"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          </div>
          
          {collectionsLoading && !collections.length ? (
            <div className="p-4 text-center text-gray-500 dark:text-gray-400">
              <div className="animate-pulse">กำลังโหลด...</div>
            </div>
          ) : !collections.length ? (
            <div className="p-4 text-center text-gray-500 dark:text-gray-400">
              ไม่พบข้อมูลคอลเลกชัน
            </div>
          ) : filteredCollections.length === 0 ? (
            <div className="p-4 text-center text-gray-500 dark:text-gray-400">
              ไม่พบคอลเลกชันที่ตรงกับคำค้นหา
            </div>
          ) : (
            <ul className="divide-y divide-gray-200 dark:divide-gray-700 max-h-96 overflow-y-auto">
              {filteredCollections.map((collection) => (
                <li
                  key={collection.id}
                  className={`px-4 py-3 transition-colors group relative cursor-pointer ${
                    selectedCollection === collection.id
                    ? 'bg-blue-50 dark:bg-blue-900/20'
                    : 'hover:bg-gray-50 dark:hover:bg-red-950'
                  }`}
                  onClick={() => handleSelectCollection(collection.id)}
                >
                  <div className="flex justify-between items-center">
                    <div
                      className={`font-medium ${
                        selectedCollection === collection.id
                        ? 'border-l-4 border-blue-500 pl-3 text-blue-600 dark:text-blue-400'
                        : 'text-gray-900 dark:text-gray-100 hover:text-gray-700 dark:hover:text-gray-300'
                      }`}
                    >
                      {collection.id}
                    </div>
                    <div className="flex space-x-1">
                      <button
                        className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 transition-colors p-1 opacity-0 group-hover:opacity-100 focus:opacity-100"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteCollection(collection.id);
                        }}
                        disabled={deleteLoading === collection.id}
                        title="ลบคอลเลกชัน"
                      >
                        {deleteLoading === collection.id ? (
                          <span className="text-sm">กำลังลบ...</span>
                        ) : (
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        )}
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* ส่วนขวา: จัดการเอกสารและฟิลด์ */}
      <div className="lg:col-span-2 space-y-6">
        {selectedCollection ? (
          <>
            {/* ส่วนจัดการเอกสาร */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                  เอกสารใน {selectedCollection}
                  {documents.length > 0 && (
                    <span className="ml-2 text-sm text-gray-500 dark:text-gray-400">
                      ({filteredDocuments.length}/{documents.length})
                    </span>
                  )}
                </h2>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={toggleSortOrder}
                    className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 transition-colors"
                    title={sortOrder === 'asc' ? 'เรียงจาก ก-ฮ' : 'เรียงจาก ฮ-ก'}
                  >
                    {sortOrder === 'asc' ? (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
                      </svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h9m5-4v12m0 0l-4-4m4 4l4-4" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
              
              <form onSubmit={handleCreateDocument} className="flex gap-3 mb-4">
                <input
                  type="text"
                  placeholder="ไอดีเอกสาร"
                  value={newDocumentId}
                  onChange={(e) => setNewDocumentId(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400"
                />
                <button
                  type="submit"
                  disabled={documentsLoading}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md disabled:opacity-50 transition-colors focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800"
                >
                  {documentsLoading ? 'กำลังสร้าง...' : 'สร้างเอกสาร'}
                </button>
              </form>

              {/* ค้นหาเอกสาร */}
              <div className="relative mb-4">
                <input
                  type="text"
                  placeholder="ค้นหาเอกสาร..."
                  value={documentSearchTerm}
                  onChange={(e) => setDocumentSearchTerm(e.target.value)}
                  className="w-full px-3 py-2 pl-10 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400"
                />
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 absolute left-3 top-2.5 text-gray-400 dark:text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                {documentSearchTerm && (
                  <button
                    className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
                    onClick={() => setDocumentSearchTerm('')}
                    title="ล้างการค้นหา"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>

              {documentsLoading && !documents.length ? (
                <div className="py-4 text-center text-gray-500 dark:text-gray-400">
                  <div className="animate-pulse">กำลังโหลด...</div>
                </div>
              ) : !documents.length ? (
                <div className="py-4 text-center text-gray-500 dark:text-gray-400">
                  ไม่พบข้อมูลเอกสาร
                </div>
              ) : filteredDocuments.length === 0 ? (
                <div className="py-4 text-center text-gray-500 dark:text-gray-400">
                  ไม่พบเอกสารที่ตรงกับคำค้นหา
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-72 overflow-y-auto">
                  {filteredDocuments.map((doc) => (
                    <div 
                      key={doc.id}
                      className={`relative group ${
                        selectedDocument === doc.id
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                          : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-750'
                      } rounded-md border p-3 transition-colors`}
                    >
                      <button
                        className="w-full h-full text-left"
                        onClick={() => setSelectedDocument(doc.id)}
                      >
                        {/* Apply text color directly here */}
                        <div className="font-medium text-gray-900 dark:text-gray-100">{doc.id}</div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {Object.keys(doc.data).length} ฟิลด์
                        </div>
                      </button>
                      <button
                        className="absolute top-2 right-2 text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 transition-colors p-1 opacity-0 group-hover:opacity-100 focus:opacity-100"
                        onClick={() => handleDeleteDocument(doc.id)}
                        disabled={deleteLoading === doc.id}
                        title="ลบเอกสาร"
                      >
                        {deleteLoading === doc.id ? (
                          <span className="text-sm">กำลังลบ...</span>
                        ) : (
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        )}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* แสดงฟิลด์และฟอร์มเพิ่มฟิลด์ */}
            {selectedDocument && (
              <div className="space-y-6">
                {/* ฟอร์มเพิ่มฟิลด์ */}
                <FieldManager
                  collectionId={selectedCollection}
                  documentId={selectedDocument}
                  addField={addOrUpdateField}
                  loading={documentsLoading}
                />
                
                {/* แสดงฟิลด์ของเอกสารที่เลือก */}
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700">
                  <h2 className="text-lg font-medium p-4 border-b border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100">
                    ฟิลด์ใน {selectedDocument}
                    {fields.length > 0 && (
                      <span className="ml-2 text-sm text-gray-500 dark:text-gray-400">
                        ({fields.length} ฟิลด์)
                      </span>
                    )}
                  </h2>
                  
                  <DocumentFieldView 
                    fields={fields}
                    loading={documentsLoading}
                    collectionId={selectedCollection}
                    documentId={selectedDocument}
                    onFieldUpdate={addOrUpdateField}
                  />
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 p-6 text-center">
            <p className="text-gray-500 dark:text-gray-400">
              กรุณาเลือกคอลเลกชันเพื่อจัดการเอกสารและฟิลด์
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default CollectionManager; 