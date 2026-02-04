
const DB_NAME = 'NiemSonPartyDB';
const STORE_NAME = 'knowledgeFiles';
const DELETED_DEFAULTS_STORE = 'deletedDefaults';
const DB_VERSION = 2; // Nâng cấp version để thêm store mới

export interface KnowledgeFile {
  name: string;
  mimeType: string;
  data: string;
  category: 'KB1' | 'KB2';
  addedAt: number;
}

export const initDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject('Lỗi mở cơ sở dữ liệu');
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event: any) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'name' });
      }
      if (!db.objectStoreNames.contains(DELETED_DEFAULTS_STORE)) {
        db.createObjectStore(DELETED_DEFAULTS_STORE, { keyPath: 'name' });
      }
    };
  });
};

export const saveFileToDB = async (file: KnowledgeFile): Promise<void> => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.put(file);

    request.onsuccess = () => resolve();
    request.onerror = () => reject('Lỗi lưu tệp vào DB');
  });
};

export const getAllFilesFromDB = async (): Promise<KnowledgeFile[]> => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject('Lỗi lấy dữ liệu từ DB');
  });
};

export const deleteFileFromDB = async (name: string): Promise<void> => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.delete(name);

    request.onsuccess = () => resolve();
    request.onerror = () => reject('Lỗi xóa tệp khỏi DB');
  });
};

// Quản lý các văn bản mặc định bị xóa
export const addDeletedDefault = async (name: string): Promise<void> => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(DELETED_DEFAULTS_STORE, 'readwrite');
    const store = transaction.objectStore(DELETED_DEFAULTS_STORE);
    store.put({ name });
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject('Lỗi lưu danh sách đen');
  });
};

export const getDeletedDefaults = async (): Promise<string[]> => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(DELETED_DEFAULTS_STORE, 'readonly');
    const store = transaction.objectStore(DELETED_DEFAULTS_STORE);
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result.map((item: any) => item.name));
    request.onerror = () => reject('Lỗi lấy danh sách đen');
  });
};

export const clearDeletedDefaults = async (): Promise<void> => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(DELETED_DEFAULTS_STORE, 'readwrite');
    const store = transaction.objectStore(DELETED_DEFAULTS_STORE);
    store.clear();
    transaction.oncomplete = () => resolve();
  });
};
