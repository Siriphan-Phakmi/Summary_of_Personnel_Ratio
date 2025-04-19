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
import Button from '@/app/core/ui/Button';
import Input from '@/app/core/ui/Input';
import { FiPlus, FiSearch, FiRefreshCw, FiTrash2, FiDatabase, FiCheckCircle, FiAlertTriangle, FiInbox, FiChevronLeft, FiLoader, FiX } from 'react-icons/fi';

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
        removeCollectionFromList(collectionId);
        if (selectedCollection === collectionId) {
          setSelectedCollection(null);
        }
        const stillExists = await checkCollectionExists(collectionId);
        if (stillExists) {
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
      const createdCollectionId = await createNewCollection(collectionId, 
        showTemplateSelector && selectedTemplate ? selectedTemplate : undefined);
      
      if (createdCollectionId) {
        setNewCollectionId('');
        setSelectedTemplate('');
        setShowTemplateSelector(false);
        await loadCollections();
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
    const protectedCollections = [
      'users', 'systemLogs', 'sessions', 'wards', 'wardForms',
      'approvals', 'dailySummaries', 'currentSessions'
    ];
    return [...filteredCollections].sort((a, b) => {
      const aIsProtected = protectedCollections.includes(a.id);
      const bIsProtected = protectedCollections.includes(b.id);
      if (aIsProtected && !bIsProtected) return -1;
      if (!aIsProtected && bIsProtected) return 1;
      return a.id.localeCompare(b.id);
    });
  }, [filteredCollections]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mt-4">
      {/* พาเนลด้านซ้าย: จัดการคอลเลกชัน */}
      <div className="md:col-span-2 lg:col-span-1 space-y-5">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 border border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-medium mb-4 text-gray-900 dark:text-gray-100">สร้างคอลเลกชันใหม่</h2>
          
          <div className="mb-4">
            <Input
              type="text"
              placeholder="ชื่อคอลเลกชัน"
              value={newCollectionId}
              onChange={(e) => setNewCollectionId(e.target.value)}
            />
          </div>
          
          <div className="mb-4">
            <label className="flex items-center space-x-2 mb-2 text-sm text-gray-700 dark:text-gray-300">
              <input
                type="checkbox"
                checked={showTemplateSelector}
                onChange={() => setShowTemplateSelector(!showTemplateSelector)}
                className="rounded text-indigo-600 focus:ring-indigo-500 dark:focus:ring-indigo-600 border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:focus:ring-offset-gray-800"
              />
              <span>เลือกเทมเพลต</span>
            </label>
              
            {showTemplateSelector && (
              <select
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white text-sm"
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
            
          <Button
            onClick={handleCreateCollection}
            variant="primary"
            fullWidth
            leftIcon={<FiPlus className="w-4 h-4 mr-1" />}
            disabled={collectionsLoading}
            isLoading={collectionsLoading}
            loadingText="กำลังสร้าง..."
          >
            สร้างคอลเลกชัน
          </Button>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100">คอลเลกชันทั้งหมด</h2>
            
            <Button 
              onClick={handleRefresh}
              disabled={isRefreshing || collectionsLoading}
              isLoading={isRefreshing}
              variant="ghost"
              size="sm"
              className="p-1"
              title="รีเฟรช"
            >
              <FiRefreshCw className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`} />
            </Button>
          </div>
          
          <div className="mb-3">
            <Input
              type="text"
              placeholder="ค้นหาคอลเลกชัน..."
              value={collectionSearchTerm}
              onChange={(e) => setCollectionSearchTerm(e.target.value)}
              inputSize="sm"
            />
          </div>
          
          {collectionsLoading ? (
            <div className="py-4 text-center text-gray-500 dark:text-gray-400">
              <div className="flex justify-center items-center">
                <FiLoader className="w-6 h-6 animate-spin mr-2" />
                กำลังโหลดคอลเลกชัน...
              </div>
            </div>
          ) : collectionsError ? (
            <div className="py-4 text-center text-red-500 dark:text-red-400">
              <FiAlertTriangle className="w-8 h-8 mx-auto mb-2" />
              <p>เกิดข้อผิดพลาดในการโหลดคอลเลกชัน</p>
            </div>
          ) : sortedCollections.length === 0 ? (
            <div className="py-4 text-center text-gray-500 dark:text-gray-400">
              <FiInbox className="w-8 h-8 mx-auto mb-2" />
              <p>{collectionSearchTerm ? 'ไม่พบคอลเลกชันที่ค้นหา' : 'ไม่มีคอลเลกชัน'}</p>
            </div>
          ) : (
            <ul className="space-y-1 max-h-96 overflow-y-auto border-t border-gray-200 dark:border-gray-700 mt-4 pt-2">
              {sortedCollections.map(collection => (
                <li
                  key={collection.id}
                  className={`
                    px-3 py-2 rounded-md cursor-pointer flex items-center justify-between text-sm
                    ${selectedCollection === collection.id ? 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-800 dark:text-indigo-200 font-medium' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'}
                  `}
                  onClick={() => handleSelectCollection(collection.id)}
                >
                  <div className="flex items-center space-x-1.5 truncate">
                    <FiDatabase className="w-4 h-4 flex-shrink-0 text-gray-500 dark:text-gray-400" />
                    <span className="truncate" title={collection.id}>{collection.id}</span>
                  </div>
                  
                  <div className="flex items-center flex-shrink-0">
                    <Button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteCollection(collection.id);
                      }}
                      isLoading={deleteLoading === collection.id}
                      disabled={deleteLoading === collection.id}
                      variant="ghost"
                      size="xs"
                      className="ml-2 p-1 text-red-600 hover:bg-red-100 dark:text-red-400 dark:hover:bg-red-900/50"
                      title="ลบคอลเลกชัน"
                    >
                      <FiTrash2 className="w-4 h-4" />
                    </Button>
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
            key={selectedCollection}
            collectionId={selectedCollection}
            searchTerm={documentSearchTerm}
            onSearchChange={setDocumentSearchTerm}
          />
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 text-center border border-gray-200 dark:border-gray-700">
            <FiChevronLeft className="w-12 h-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">เลือกคอลเลกชัน</h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">เลือกคอลเลกชันจากรายการทางด้านซ้าย</p>
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
    loading: docsLoading,
    error: docsError,
    addDocument,
    loadDocuments,
    addOrUpdateField
  } = useFirestoreDocument(collectionId);
  
  const [newDocumentId, setNewDocumentId] = useState('');
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  useEffect(() => {
    setSelectedDocument(null);
  }, [collectionId, setSelectedDocument]);
  
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
        await loadDocuments();
    } finally {
        setIsRefreshing(false);
    }
  };
  
  const handleCreateDocument = async () => {
    if (!newDocumentId.trim()) {
      toast.error('กรุณาระบุ ID เอกสาร');
      return;
    }
    const documentId = newDocumentId.trim();
    try {
      await addDocument(documentId);
      setNewDocumentId('');
      setSelectedDocument(documentId);
      toast.success(`สร้างเอกสาร "${documentId}" สำเร็จ`);
    } catch (error) {
      console.error('Error creating document:', error);
      toast.error('ไม่สามารถสร้างเอกสารได้');
    }
  };
  
  const handleDeleteDocument = async (documentId: string) => {
    if (!window.confirm(`คุณแน่ใจหรือไม่ว่าต้องการลบเอกสาร "${documentId}"?\nการทำเช่นนี้จะลบข้อมูลทั้งหมดในเอกสารนี้ และไม่สามารถกู้คืนได้`)) {
      return;
    }
    setDeleteLoading(documentId);
    try {
      await deleteDocument(collectionId, documentId);
      toast.success(`ลบเอกสาร "${documentId}" สำเร็จ`);
      if (selectedDocument === documentId) {
        setSelectedDocument(null);
      }
    } catch (error) {
        console.error('Error deleting document:', error);
        toast.error('ไม่สามารถลบเอกสารได้');
    } finally {
      setDeleteLoading(null);
    }
  };
  
  const filteredDocuments = useMemo(() => {
    if (!searchTerm.trim()) {
      return documents;
    }
    return documents.filter(
      doc => doc.id.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [documents, searchTerm]);
  
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700">
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100">
            เอกสารใน <span className='font-semibold text-indigo-600 dark:text-indigo-400'>{collectionId}</span>
            <span className="ml-2 inline-block px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs font-medium rounded-full">
              {filteredDocuments.length}
            </span>
          </h2>
          <Button
            onClick={handleRefresh}
            disabled={isRefreshing || docsLoading}
            isLoading={isRefreshing}
            variant="ghost"
            size="sm"
            className="p-1"
            title="รีเฟรชเอกสาร"
          >
            <FiRefreshCw className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`} />
          </Button>
        </div>
        
        <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
          <Input
            type="text"
            placeholder="ค้นหาเอกสาร..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            inputSize="sm"
            className="flex-1"
          />
          
          <div className="flex">
            <Input
              type="text"
              placeholder="ID เอกสารใหม่"
              value={newDocumentId}
              onChange={(e) => setNewDocumentId(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleCreateDocument()}
              inputSize="sm"
              className="rounded-r-none"
            />
            <Button
              onClick={handleCreateDocument}
              variant="primary"
              size="sm"
              className="rounded-l-none"
            >
              สร้าง
            </Button>
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-12 divide-y md:divide-y-0 md:divide-x divide-gray-200 dark:divide-gray-700">
        {/* รายการเอกสาร */}
        <div className="md:col-span-4 lg:col-span-3 overflow-auto" style={{ maxHeight: '500px' }}>
          {docsLoading ? (
            <div className="py-6 text-center text-gray-500 dark:text-gray-400">
              <div className="flex justify-center">
                <FiLoader className="w-6 h-6 animate-spin" />
              </div>
              <p className="mt-2">กำลังโหลดเอกสาร...</p>
            </div>
          ) : docsError ? (
            <div className="py-6 text-center text-red-500">
              <FiAlertTriangle className="w-8 h-8 mx-auto" />
              <p className="mt-2">เกิดข้อผิดพลาดในการโหลดเอกสาร</p>
            </div>
          ) : filteredDocuments.length === 0 ? (
            <div className="py-6 text-center text-gray-500 dark:text-gray-400">
              <FiInbox className="w-8 h-8 mx-auto" />
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
                      <FiLoader className="w-4 h-4 animate-spin" />
                    ) : (
                      <FiTrash2 className="w-4 h-4 text-red-600" />
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
              loading={docsLoading}
            />
          ) : (
            <div className="text-center py-12">
              <FiDatabase className="w-12 h-12 mx-auto text-gray-400" />
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