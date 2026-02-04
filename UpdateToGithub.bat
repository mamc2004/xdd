@echo off
cd /d C:\AppAI
echo Thêm tất cả thay đổi...
"C:\Program Files\Git\cmd\git.exe" add .

echo Commit...
"C:\Program Files\Git\cmd\git.exe" commit -m "Update: Code changes %date% %time%"

echo Đồng bộ...
"C:\Program Files\Git\cmd\git.exe" pull origin main --rebase

echo Push lên GitHub...
"C:\Program Files\Git\cmd\git.exe" push origin main

echo Xong!
pause