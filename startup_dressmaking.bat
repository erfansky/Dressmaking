@echo off
cd /d "E:\workspace\dressmaking"
start cmd /k "python manage.py runserver 0.0.0.0:8000"

timeout /t 5 /nobreak

cd /d "E:\workspace\dressmaking\dressmaking-pwa"
start cmd /k "npm run dev -- --host"

timeout /t 10 /nobreak

exit