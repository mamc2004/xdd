
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

// Seed dữ liệu mặc định vào IndexedDB
export const seedDefaultKnowledge = async (): Promise<void> => {
  const existingFiles = await getAllFilesFromDB();
  
  // Nếu đã có dữ liệu, không seed lại
  if (existingFiles.length > 0) {
    return;
  }

  const defaultFiles: KnowledgeFile[] = [
    // KB1 - Tổ chức - Xây dựng Đảng
    {
      name: "Kết luận 228-KL/TW (31/12/2025) - Bộ máy & Chính quyền 2 cấp.txt",
      mimeType: "text/plain",
      data: btoa("KẾT LUẬN 228-KL/TW\nNgày: 31/12/2025\n\nNội dung: Quy định về bộ máy và chính quyền 2 cấp\n\nCác điểm chính:\n- Cơ cấu tổ chức\n- Chức năng, nhiệm vụ\n- Quy trình làm việc"),
      category: 'KB1',
      addedAt: Date.now() - 86400000 * 7
    },
    {
      name: "Báo cáo 613-BC/BTCTW (29/12/2025) - Hoạt động hệ thống chính trị.txt",
      mimeType: "text/plain",
      data: btoa("BÁO CÁO 613-BC/BTCTW\nNgày: 29/12/2025\n\nNội dung: Báo cáo hoạt động của hệ thống chính trị\n\nCác điểm chính:\n- Kết quả hoạt động\n- Những vấn đề tồn tại\n- Phương hướng cải thiện"),
      category: 'KB1',
      addedAt: Date.now() - 86400000 * 6
    },
    {
      name: "Quyết định 368-QĐ/TW (08/9/2025) - Chức danh lãnh đạo.txt",
      mimeType: "text/plain",
      data: btoa("QUYẾT ĐỊNH 368-QĐ/TW\nNgày: 08/9/2025\n\nNội dung: Về chức danh lãnh đạo\n\nCác điểm chính:\n- Danh sách chức danh\n- Tiêu chuẩn, điều kiện\n- Quy trình bổ nhiệm"),
      category: 'KB1',
      addedAt: Date.now() - 86400000 * 5
    },
    {
      name: "Kết luận 195-KL/TW (26/9/2025) - Chính quyền 2 cấp.txt",
      mimeType: "text/plain",
      data: btoa("KẾT LUẬN 195-KL/TW\nNgày: 26/9/2025\n\nNội dung: Về chính quyền 2 cấp\n\nCác điểm chính:\n- Cơ cấu tổ chức\n- Quy trình hoạt động\n- Trách nhiệm của từng cấp"),
      category: 'KB1',
      addedAt: Date.now() - 86400000 * 4
    },

    // KB2 - Tuyên giáo - Dân vận
    {
      name: "Chỉ thị 50-CT/TW (23/7/2025) - Sinh hoạt chi bộ.txt",
      mimeType: "text/plain",
      data: btoa("CHỈ THỊ 50-CT/TW\nNgày: 23/7/2025\n\nNội dung: Về sinh hoạt chi bộ\n\nCác điểm chính:\n- Hình thức sinh hoạt\n- Nội dung thảo luận\n- Tần suất họp\n- Quy trình ghi biên bản"),
      category: 'KB2',
      addedAt: Date.now() - 86400000 * 3
    },
    {
      name: "Chỉ thị 51-CT/TW (08/8/2025) - Thẻ Đảng viên.txt",
      mimeType: "text/plain",
      data: btoa("CHỈ THỊ 51-CT/TW\nNgày: 08/8/2025\n\nNội dung: Về thẻ Đảng viên\n\nCác điểm chính:\n- Mẫu thẻ Đảng viên\n- Cách cấp thẻ\n- Quản lý thẻ\n- Quy trình cấp lại"),
      category: 'KB2',
      addedAt: Date.now() - 86400000 * 2
    },
    {
      name: "Hướng dẫn 31-HD/VPTW - Danh mục hồ sơ nghiệp vụ.txt",
      mimeType: "text/plain",
      data: btoa("HƯỚNG DẪN 31-HD/VPTW\n\nNội dung: Danh mục hồ sơ nghiệp vụ\n\nCác điểm chính:\n- Danh mục hồ sơ\n- Yêu cầu về trình bày\n- Bảo quản hồ sơ\n- Quy trình lưu trữ"),
      category: 'KB2',
      addedAt: Date.now() - 86400000 * 1
    }
  ];

  // Lưu tất cả file mặc định vào DB
  for (const file of defaultFiles) {
    try {
      await saveFileToDB(file);
    } catch (e) {
      console.error(`Lỗi seed file ${file.name}:`, e);
    }
  }

  console.log("✅ Đã seed dữ liệu mặc định vào IndexedDB");
};
