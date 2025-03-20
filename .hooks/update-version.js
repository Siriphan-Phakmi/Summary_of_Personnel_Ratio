const fs = require('fs');
const path = require('path');

// อ่านวันที่ปัจจุบัน
const now = new Date();
const day = now.getDate();
const month = now.getMonth() + 1; // เดือนเริ่มจาก 0
const year = now.getFullYear();

// อ่านเวอร์ชันเดิมจาก package.json
const packageJsonPath = path.join(__dirname, '../package.json');
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
const versionParts = packageJson.version.split('.');
const majorVersion = versionParts[0]; // เอาเฉพาะเลขเวอร์ชันตัวแรก

// สร้างเวอร์ชันใหม่ (v.X.DAY.MONTH.YEAR)
const newDateVersion = `v.${majorVersion}.${day}.${month}.${year}`;

// อัปเดตไฟล์ version.js ในแอพ
const versionFilePath = path.join(__dirname, '../app/config/version.js');
const versionFileContent = `// อัพเดทอัตโนมัติเมื่อ: ${new Date().toLocaleString('th-TH')}
export const APP_VERSION = '${newDateVersion}';

export const VERSION_INFO = {
  version: '${packageJson.version}',
  releaseDate: '${now.toISOString().split('T')[0]}',
  environment: process.env.NODE_ENV
};
`;

fs.writeFileSync(versionFilePath, versionFileContent);

console.log(`อัปเดตเวอร์ชันในแอพเป็น ${newDateVersion}`);
console.log(`อัปเดตเวอร์ชันใน package.json เป็น ${packageJson.version}`);

// ส่งออกเวอร์ชันใหม่เพื่อใช้ในสคริปต์อื่น
module.exports = newDateVersion; 