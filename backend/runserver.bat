@echo off
cd C:\Users\savas\circlar\backend
call .\venv\Scripts\activate
call python manage.py runserver
cd C:\Users\savas\circlar\frontend
call .\venv\Scripts\activate
call npm run install



