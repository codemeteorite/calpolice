@echo off
echo Starting CalPolice...

echo Starting MongoDB Seed...
cd server
call npm install
node seed.js

echo Starting Node.js Server in new window...
start cmd /k "npm run dev"

cd ../calpolice-ai
echo Starting Python AI Service in new window...
start cmd /k "pip install -r requirements.txt && python app.py"

cd ../client
echo Starting React Vite Frontend in new window...
start cmd /k "npm run dev"

echo All services started!
