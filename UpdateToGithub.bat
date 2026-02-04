@echo off
cd /d C:\AppAI
echo Them tat ca thay doi...
"C:\Program Files\Git\cmd\git.exe" add .

echo Commit...
"C:\Program Files\Git\cmd\git.exe" commit -m "Update: Code changes %date% %time%"

echo Dong bo...
"C:\Program Files\Git\cmd\git.exe" pull origin main --rebase

echo Push len GitHub...
"C:\Program Files\Git\cmd\git.exe" push origin main

echo Xong!
pause