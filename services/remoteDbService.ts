import { 
  collection, 
  addDoc, 
  getDocs, 
  deleteDoc, 
  doc, 
  query,
  where 
} from 'firebase/firestore';
import { db } from './firebaseConfig';

export interface KnowledgeFile {
  id?: string;
  name: string;
  mimeType: string;
  data: string;
  category: 'KB1' | 'KB2';
  addedAt: number;
}

const COLLECTION_NAME = 'knowledgeFiles';

// Lưu file lên Firestore (được chia sẻ cho tất cả người dùng)
export const saveFileToFirestore = async (file: KnowledgeFile): Promise<string> => {
  try {
    const docRef = await addDoc(collection(db, COLLECTION_NAME), {
      name: file.name,
      mimeType: file.mimeType,
      data: file.data,
      category: file.category,
      addedAt: file.addedAt,
      createdAt: new Date().toISOString()
    });
    return docRef.id;
  } catch (error) {
    console.error("Lỗi lưu file lên Firestore:", error);
    throw error;
  }
};

// Lấy tất cả file từ Firestore
export const getAllFilesFromFirestore = async (): Promise<KnowledgeFile[]> => {
  try {
    const querySnapshot = await getDocs(collection(db, COLLECTION_NAME));
    const files: KnowledgeFile[] = [];
    querySnapshot.forEach((doc) => {
      files.push({
        id: doc.id,
        name: doc.data().name,
        mimeType: doc.data().mimeType,
        data: doc.data().data,
        category: doc.data().category,
        addedAt: doc.data().addedAt
      });
    });
    return files;
  } catch (error) {
    console.error("Lỗi lấy file từ Firestore:", error);
    throw error;
  }
};

// Xóa file từ Firestore
export const deleteFileFromFirestore = async (fileId: string): Promise<void> => {
  try {
    await deleteDoc(doc(db, COLLECTION_NAME, fileId));
  } catch (error) {
    console.error("Lỗi xóa file từ Firestore:", error);
    throw error;
  }
};

// Lấy file theo category
export const getFilesByCategory = async (category: 'KB1' | 'KB2'): Promise<KnowledgeFile[]> => {
  try {
    const q = query(collection(db, COLLECTION_NAME), where("category", "==", category));
    const querySnapshot = await getDocs(q);
    const files: KnowledgeFile[] = [];
    querySnapshot.forEach((doc) => {
      files.push({
        id: doc.id,
        name: doc.data().name,
        mimeType: doc.data().mimeType,
        data: doc.data().data,
        category: doc.data().category,
        addedAt: doc.data().addedAt
      });
    });
    return files;
  } catch (error) {
    console.error("Lỗi lấy file theo category:", error);
    throw error;
  }
};
