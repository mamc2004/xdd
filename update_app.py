import re

# Read the file
with open('c:\\AppAI\\App.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace the import line
old_import = "import { KnowledgeFile, getAllFilesFromDB, saveFileToDB, deleteFileFromDB, addDeletedDefault, getDeletedDefaults, clearDeletedDefaults } from './services/dbService';"
new_import = """import { getAllFilesFromDB, saveFileToDB, deleteFileFromDB, addDeletedDefault, getDeletedDefaults, clearDeletedDefaults } from './services/dbService';
import { getAllFilesFromFirestore, saveFileToFirestore, deleteFileFromFirestore } from './services/remoteDbService';
import type { KnowledgeFile } from './services/remoteDbService';"""

content = content.replace(old_import, new_import)

# Replace the useEffect that loads knowledge
old_useeffect = """  useEffect(() => {
    const loadKnowledge = async () => {
      try {
        const [files, deleted] = await Promise.all([
          getAllFilesFromDB(),
          getDeletedDefaults()
        ]);
        setKnowledgeFiles(files);
        setDeletedDefaults(deleted);
      } catch (e) {
        console.error("Lỗi khởi tạo dữ liệu:", e);
      }
    };
    loadKnowledge();
  }, []);"""

new_useeffect = """  useEffect(() => {
    const loadKnowledge = async () => {
      try {
        const [filesFromFirestore, deleted] = await Promise.all([
          getAllFilesFromFirestore(),
          getDeletedDefaults()
        ]);
        setKnowledgeFiles(filesFromFirestore);
        setDeletedDefaults(deleted);
      } catch (e) {
        console.error("Lỗi khởi tạo dữ liệu:", e);
      }
    };
    loadKnowledge();
  }, []);"""

content = content.replace(old_useeffect, new_useeffect)

# Replace handleFileUpload to save to Firestore
old_save_indexeddb = """      const category = classifyFile(file.name);
      if (category) {
        const fullFile: KnowledgeFile = { ...fileData, category, addedAt: Date.now() };
        await saveFileToDB(fullFile);
        autoAdded.push(fullFile);"""

new_save_firestore = """      const category = classifyFile(file.name);
      if (category) {
        const fullFile: KnowledgeFile = { ...fileData, category, addedAt: Date.now() };
        const fileId = await saveFileToFirestore(fullFile);
        autoAdded.push({ ...fullFile, id: fileId });"""

content = content.replace(old_save_indexeddb, new_save_firestore)

# Replace handleDeleteFile
old_delete = """  const handleDeleteFile = async (name: string) => {
    if (!confirm('Xác nhận xóa tệp tri thức này khỏi hệ thống?')) return;
    await deleteFileFromDB(name);
    setKnowledgeFiles(prev => prev.filter(f => f.name !== name));
    showToast("Đã xóa tệp tri thức", "success");
  };"""

new_delete = """  const handleDeleteFile = async (fileId: string | undefined) => {
    if (!fileId) return;
    if (!confirm('Xác nhận xóa tệp tri thức này khỏi hệ thống?')) return;
    try {
      await deleteFileFromFirestore(fileId);
      setKnowledgeFiles(prev => prev.filter(f => f.id !== fileId));
      showToast("Đã xóa tệp tri thức", "success");
    } catch (e) {
      showToast("Lỗi khi xóa tệp", "error");
    }
  };"""

content = content.replace(old_delete, new_delete)

# Write the file back
with open('c:\\AppAI\\App.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("✅ App.tsx đã được cập nhật thành công!")
