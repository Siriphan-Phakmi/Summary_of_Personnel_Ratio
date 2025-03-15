@echo off
echo Cleaning up npm installation...

echo Clearing npm cache...
npm cache clean --force

echo Removing node_modules folder...
if exist node_modules\ (
  rmdir /s /q node_modules
)

echo Removing package-lock.json...
if exist package-lock.json (
  del package-lock.json
)

echo Installing dependencies...
npm install

echo Done!
