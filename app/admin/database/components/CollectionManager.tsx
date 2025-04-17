import React, { useState, useEffect, useMemo } from 'react';
import { useFirestoreCollection } from '../hooks/useFirestoreCollection';
import { useFirestoreDocument } from '../hooks/useFirestoreDocument';
import { toast } from 'react-hot-toast';
import { collectionTemplates } from '../services/databaseService';
import FieldManager from './FieldManager';
import DocumentFieldView from './DocumentFieldView';
import { 
  deleteCollectionV2 as deleteCollection, 
  deleteDocument, 
  createNewCollection, 
  addRecentCollection 
} from '../services/databaseService';
import { Button, Input, Select, Card, Divider, Badge, Spin } from 'antd';
import { PlusOutlined, SearchOutlined, SyncOutlined, DeleteOutlined, HistoryOutlined } from '@ant-design/icons';
import styles from '../styles/CollectionManager.module.css';

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
    loadCollections,
    removeCollectionFromList,
    checkCollectionExists
  } = useFirestoreCollection();
  
  // State สำหรับฟอร์มสร้างคอลเลกชันใหม่
  const [newCollectionId, setNewCollectionId] = useState('');
  const [selectedCollection, setSelectedCollection] = useState<string | null>(null);
  const [showTemplateSelector, setShowTemplateSelector] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null);
  
  // State สำหรับการค้นหา
  const [collectionSearchTerm, setCollectionSearchTerm] = useState('');
  const [documentSearchTerm, setDocumentSearchTerm] = useState('');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // ตัวเลือกเทมเพลตที่มี
  const templateOptions = useMemo(() => Object.keys(collectionTemplates), []);

  // เมื่อเลือกคอลเลกชัน
  const handleSelectCollection = (collectionId: string) => {
    setSelectedCollection(collectionId);
    setDocumentSearchTerm('');
  };

  // เมื่อต้องการลบคอลเลกชัน
  const handleDeleteCollection = async (collectionId: string) => {
    // ป้องกันการลบคอลเลกชันหลักของระบบ
    const protectedCollections = [
      'users', 'systemLogs', 'sessions', 'wards', 'wardForms',
      'approvals', 'dailySummaries', 'currentSessions'
    ];
    
    if (protectedCollections.includes(collectionId)) {
      toast.error(`ไม่สามารถลบคอลเลกชัน "${collectionId}" ได้เนื่องจากเป็นคอลเลกชันหลักของระบบ`);
      return;
    }

    if (!window.confirm(`คุณแน่ใจหรือไม่ว่าต้องการลบคอลเลกชัน "${collectionId}"?\nการทำเช่นนี้จะลบข้อมูลทั้งหมดในคอลเลกชันนี้ และไม่สามารถกู้คืนได้`)) {
      return;
    }

    setDeleteLoading(collectionId);
    try {
      const success = await deleteCollection(collectionId);
      if (success) {
        // ลบคอลเลกชันออกจากรายการทันที โดยไม่ต้องรอโหลดคอลเลกชันใหม่ทั้งหมด
        removeCollectionFromList(collectionId);
        
        // อัปเดต UI หากคอลเลกชันที่ถูกลบคือคอลเลกชันที่กำลังเลือกอยู่
        if (selectedCollection === collectionId) {
          setSelectedCollection(null);
        }
        
        // ตรวจสอบว่าคอลเลกชันยังมีอยู่จริงหรือไม่
        const stillExists = await checkCollectionExists(collectionId);
        if (stillExists) {
          // ถ้ายังมีอยู่ ให้โหลดคอลเลกชันใหม่ทั้งหมดเพื่ออัปเดตสถานะล่าสุด
          await loadCollections();
        }
      }
    } finally {
      setDeleteLoading(null);
    }
  };

  // เมื่อต้องการสร้างคอลเลกชันใหม่
  const handleCreateCollection = async () => {
    if (!newCollectionId.trim()) {
      toast.error('กรุณาระบุชื่อคอลเลกชัน');
      return;
    }
    
    const collectionId = newCollectionId.trim();
    
    try {
      // ใช้ฟังก์ชัน createNewCollection แทน
      const createdCollectionId = await createNewCollection(collectionId, 
        showTemplateSelector && selectedTemplate ? selectedTemplate : undefined);
      
      if (createdCollectionId) {
        // คอลเลกชันถูกสร้างเรียบร้อยแล้ว
        setNewCollectionId('');
        setSelectedTemplate('');
        setShowTemplateSelector(false);
        
        // รีเฟรชข้อมูลคอลเลกชัน
        await loadCollections();
        
        // เลือกคอลเลกชันที่สร้างใหม่ทันที
        setSelectedCollection(createdCollectionId);
      }
    } catch (error) {
      console.error('Error creating collection:', error);
    }
  };

  // เมื่อต้องการรีเฟรชข้อมูล
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await loadCollections();
    } finally {
      setIsRefreshing(false);
    }
  };

  // กรองคอลเลกชันตามคำค้นหา
  const filteredCollections = useMemo(() => {
    if (!collectionSearchTerm.trim()) {
      return collections;
    }
    
    return collections.filter(
      col => col.id.toLowerCase().includes(collectionSearchTerm.toLowerCase())
    );
  }, [collections, collectionSearchTerm]);

  // เรียงลำดับคอลเลกชัน
  const sortedCollections = useMemo(() => {
    // แสดงคอลเลกชันหลักของระบบก่อน
    const protectedCollections = [
      'users', 'systemLogs', 'sessions', 'wards', 'wardForms',
      'approvals', 'dailySummaries', 'currentSessions'
    ];
    
    return [...filteredCollections].sort((a, b) => {
      // จัดอันดับตามความสำคัญ
      const aIsProtected = protectedCollections.includes(a.id);
      const bIsProtected = protectedCollections.includes(b.id);
      
      if (aIsProtected && !bIsProtected) return -1;
      if (!aIsProtected && bIsProtected) return 1;
      
      // ถ้าทั้งคู่เป็นคอลเลกชันหลักหรือไม่ใช่ทั้งคู่ ให้เรียงตามชื่อ
      if (sortOrder === 'asc') {
        return a.id.localeCompare(b.id);
      } else {
        return b.id.localeCompare(a.id);
      }
    });
  }, [filteredCollections, sortOrder]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mt-4">
      {/* พาเนลด้านซ้าย: จัดการคอลเลกชัน */}
      <div className="md:col-span-2 lg:col-span-1 space-y-5">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <h2 className="text-lg font-medium mb-4">สร้างคอลเลกชันใหม่</h2>
          
          <div className="mb-4">
                <input
                  type="text"
                  placeholder="ชื่อคอลเลกชัน"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
                  value={newCollectionId}
                  onChange={(e) => setNewCollectionId(e.target.value)}
            />
              </div>
          
          <div className="mb-4">
            <label className="flex items-center space-x-2 mb-2">
              <input
                type="checkbox"
                checked={showTemplateSelector}
                onChange={() => setShowTemplateSelector(!showTemplateSelector)}
                className="rounded text-indigo-600 focus:ring-indigo-500"
              />
              <span className="text-sm">เลือกเทมเพลต</span>
            </label>
              
              {showTemplateSelector && (
              <select
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
                value={selectedTemplate}
                onChange={(e) => setSelectedTemplate(e.target.value)}
              >
                <option value="">-- เลือกเทมเพลต --</option>
                {templateOptions.map(template => (
                  <option key={template} value={template}>{template}</option>
                ))}
              </select>
              )}
            </div>
            
            <button
            onClick={handleCreateCollection}
            className="w-full px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
            สร้างคอลเลกชัน
            </button>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-medium">คอลเลกชันทั้งหมด</h2>
            
              <button 
                onClick={handleRefresh}
                disabled={isRefreshing}
              className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
              title="รีเฟรช"
            >
              {isRefreshing ? (
                <svg className="w-5 h-5 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              )}
              </button>
            </div>
            
          <div className="mb-3">
              <input
                type="text"
                placeholder="ค้นหาคอลเลกชัน..."
              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-700 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
                value={collectionSearchTerm}
                onChange={(e) => setCollectionSearchTerm(e.target.value)}
            />
          </div>
          
          {collectionsLoading ? (
            <div className="py-4 text-center text-gray-500 dark:text-gray-400">
              <div className="flex justify-center">
                <svg className="w-6 h-6 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              </div>
              <p className="mt-2">กำลังโหลดคอลเลกชัน...</p>
            </div>
          ) : collectionsError ? (
            <div className="py-4 text-center text-red-500">
              <svg className="w-8 h-8 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="mt-2">เกิดข้อผิดพลาดในการโหลดคอลเลกชัน</p>
            </div>
          ) : sortedCollections.length === 0 ? (
            <div className="py-4 text-center text-gray-500 dark:text-gray-400">
              <svg className="w-8 h-8 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
              </svg>
              <p className="mt-2">{collectionSearchTerm ? 'ไม่พบคอลเลกชันที่ค้นหา' : 'ไม่มีคอลเลกชัน'}</p>
            </div>
          ) : (
            <ul className="space-y-1 max-h-96 overflow-y-auto">
              {sortedCollections.map(collection => (
                <li
                  key={collection.id}
                  className={`
                    px-3 py-2 rounded-md cursor-pointer flex items-center justify-between
                    ${selectedCollection === collection.id ? 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-800 dark:text-indigo-200' : 'hover:bg-gray-100 dark:hover:bg-gray-700'}
                  `}
                  onClick={() => handleSelectCollection(collection.id)}
                >
                  <div className="flex items-center space-x-1.5 truncate">
                    <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="truncate" title={`คอลเลกชัน ${collection.id} (ใช้งานได้)`}>{collection.id}</span>
                  </div>
                  
                  <div className="flex items-center">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteCollection(collection.id);
                      }}
                      disabled={deleteLoading === collection.id}
                      className="ml-2 p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/50"
                      title="ลบคอลเลกชัน"
                    >
                      {deleteLoading === collection.id ? (
                        <svg className="w-4 h-4 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                      ) : (
                        <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      )}
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* พาเนลด้านขวา: จัดการเอกสารในคอลเลกชัน */}
      <div className="md:col-span-3 lg:col-span-4">
        {selectedCollection ? (
          <DocumentManager 
            collectionId={selectedCollection}
            searchTerm={documentSearchTerm}
            onSearchChange={setDocumentSearchTerm}
          />
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 text-center">
            <svg className="w-12 h-12 mx-auto text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
            </svg>
            <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-gray-100">เลือกคอลเลกชันเพื่อจัดการเอกสาร</h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">เลือกคอลเลกชันจากรายการทางด้านซ้ายเพื่อดูและจัดการเอกสาร</p>
          </div>
        )}
      </div>
    </div>
  );
};

// คอมโพเนนต์สำหรับจัดการเอกสารในคอลเลกชัน
interface DocumentManagerProps {
  collectionId: string;
  searchTerm: string;
  onSearchChange: (value: string) => void;
}

const DocumentManager: React.FC<DocumentManagerProps> = ({ 
  collectionId,
  searchTerm,
  onSearchChange
}) => {
  const { 
    documents, 
    fields, 
    selectedDocument,
    setSelectedDocument,
    loading, 
    error, 
    addDocument,
    loadDocuments,
    addOrUpdateField
  } = useFirestoreDocument(collectionId);
  
  const [newDocumentId, setNewDocumentId] = useState('');
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null);
  
  useEffect(() => {
    setSelectedDocument(null);
  }, [collectionId]);
  
  // รีเฟรชข้อมูลเอกสาร
  const handleRefresh = () => {
    loadDocuments();
  };
  
  // สร้างเอกสารใหม่
  const handleCreateDocument = async () => {
    if (!newDocumentId.trim()) {
      toast.error('กรุณาระบุ ID เอกสาร');
      return;
    }
    
    const documentId = newDocumentId.trim();
    
    try {
      await addDocument(documentId);
      setNewDocumentId('');
      loadDocuments();
    } catch (error) {
      console.error('Error creating document:', error);
    }
  };
  
  // ลบเอกสาร
  const handleDeleteDocument = async (documentId: string) => {
    if (!window.confirm(`คุณแน่ใจหรือไม่ว่าต้องการลบเอกสาร "${documentId}"?\nการทำเช่นนี้จะลบข้อมูลทั้งหมดในเอกสารนี้ และไม่สามารถกู้คืนได้`)) {
      return;
    }
    
    setDeleteLoading(documentId);
    try {
      await deleteDocument(collectionId, documentId);
      if (selectedDocument === documentId) {
        setSelectedDocument(null);
      }
      loadDocuments();
    } finally {
      setDeleteLoading(null);
    }
  };
  
  // กรองเอกสารตามคำค้นหา
  const filteredDocuments = useMemo(() => {
    if (!searchTerm.trim()) {
      return documents;
    }
    
    return documents.filter(
      doc => doc.id.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [documents, searchTerm]);
  
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
      <div className="p-4 border-b dark:border-gray-700">
              <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-medium">
            เอกสารใน {collectionId}
            {filteredDocuments.length !== undefined && (
              <span className="text-sm text-gray-500 dark:text-gray-400 ml-2">
                ({filteredDocuments.length})
                    </span>
                  )}
                </h2>
          
                  <button
            onClick={handleRefresh}
            className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
            title="รีเฟรช"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                  </button>
                </div>
        
        <div className="flex space-x-2">
          <input
            type="text"
            placeholder="ค้นหาเอกสาร..."
            className="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-gray-700 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
          />
          
          <div className="flex border border-gray-300 dark:border-gray-700 rounded-md overflow-hidden">
                <input
                  type="text"
              placeholder="ID เอกสารใหม่"
              className="px-3 py-2 text-sm border-r border-gray-300 dark:border-gray-700 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
                  value={newDocumentId}
                  onChange={(e) => setNewDocumentId(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleCreateDocument()}
                />
                <button
              onClick={handleCreateDocument}
              className="px-3 py-2 bg-indigo-600 text-white hover:bg-indigo-700 focus:outline-none"
                >
              สร้าง
                </button>
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-12 divide-y md:divide-y-0 md:divide-x divide-gray-200 dark:divide-gray-700">
        {/* รายการเอกสาร */}
        <div className="md:col-span-4 lg:col-span-3 overflow-auto" style={{ maxHeight: '500px' }}>
          {loading ? (
            <div className="py-6 text-center text-gray-500 dark:text-gray-400">
              <div className="flex justify-center">
                <svg className="w-6 h-6 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              </div>
              <p className="mt-2">กำลังโหลดเอกสาร...</p>
                </div>
          ) : error ? (
            <div className="py-6 text-center text-red-500">
              <svg className="w-8 h-8 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="mt-2">เกิดข้อผิดพลาดในการโหลดเอกสาร</p>
                </div>
              ) : filteredDocuments.length === 0 ? (
            <div className="py-6 text-center text-gray-500 dark:text-gray-400">
              <svg className="w-8 h-8 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="mt-2">{searchTerm ? 'ไม่พบเอกสารที่ค้นหา' : 'ไม่มีเอกสาร'}</p>
                </div>
              ) : (
            <ul className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredDocuments.map(document => (
                <li 
                  key={document.id}
                  className={`
                    px-4 py-3 flex items-center justify-between cursor-pointer
                    ${selectedDocument === document.id ? 'bg-indigo-50 dark:bg-indigo-900/20' : 'hover:bg-gray-50 dark:hover:bg-gray-750'}
                  `}
                  onClick={() => setSelectedDocument(document.id)}
                >
                  <div className="truncate flex-1">
                    <div className="font-medium text-sm">{document.id}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                      {Object.keys(document.data).length} fields
                    </div>
                        </div>
                  
                      <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteDocument(document.id);
                    }}
                    disabled={deleteLoading === document.id}
                    className="ml-2 p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/30"
                        title="ลบเอกสาร"
                      >
                    {deleteLoading === document.id ? (
                      <svg className="w-4 h-4 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    ) : (
                      <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        )}
                      </button>
                </li>
                  ))}
            </ul>
              )}
            </div>

        {/* รายละเอียดเอกสาร */}
        <div className="md:col-span-8 lg:col-span-9 p-4">
          {selectedDocument ? (
                <FieldManager
              collectionId={collectionId}
                  documentId={selectedDocument}
                  addField={addOrUpdateField}
                  loading={loading}
                />
          ) : (
            <div className="text-center py-12">
              <svg className="w-12 h-12 mx-auto text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-gray-100">เลือกเอกสารเพื่อจัดการฟิลด์</h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">เลือกเอกสารจากรายการทางด้านซ้ายเพื่อดูและจัดการฟิลด์</p>
              </div>
            )}
          </div>
      </div>
    </div>
  );
};

export default CollectionManager; 