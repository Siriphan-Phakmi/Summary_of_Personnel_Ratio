/**
 * Emergency Modal Close Script
 * 
 * คำแนะนำ:
 * 1. เปิด Console ของเบราวเซอร์โดยกด F12 หรือคลิกขวาและเลือก "ตรวจสอบ" (Inspect)
 * 2. ไปที่แท็บ "Console"
 * 3. คัดลอกและวางคำสั่งด้านล่างลงใน console และกด Enter
 * 
 * Instructions:
 * 1. Open the browser console by pressing F12 or right-clicking and selecting "Inspect"
 * 2. Go to the "Console" tab
 * 3. Copy and paste any of the commands below into the console and press Enter
 */

// วิธีที่ 1: ใช้ฟังก์ชันปิดฉุกเฉินสำหรับ DataComparisonModal โดยเฉพาะ
console.log('Trying data comparison modal emergency close...');
if (window.__closeDataComparisonModal) {
  window.__closeDataComparisonModal();
  console.log('Data comparison modal emergency close triggered');
} else {
  console.log('Data comparison modal emergency close function not found');
}

// วิธีที่ 2: ใช้ฟังก์ชันปิดฉุกเฉินทั่วไป
console.log('Trying general modal emergency close...');
if (window.__closeCurrentModal) {
  window.__closeCurrentModal();
  console.log('General modal emergency close triggered');
} else {
  console.log('General modal emergency close function not found');
}

// วิธีที่ 3: ลบองค์ประกอบ modal โดยตรง
console.log('Trying to remove modal elements directly...');
let removedElements = 0;
document.querySelectorAll('.custom-component-container, .fixed.inset-0, [role="dialog"], .backdrop-blur-sm').forEach(el => {
  console.log('Removing modal element', el);
  el.remove();
  removedElements++;
});
console.log(`Removed ${removedElements} potential modal elements`);

// วิธีที่ 4: ลบ container ที่อาจจะมี modal
console.log('Trying to remove potential modal containers...');
let removedContainers = 0;
document.querySelectorAll('body > div:not([id])').forEach(el => {
  console.log('Removing potential modal container', el);
  el.remove();
  removedContainers++;
});
console.log(`Removed ${removedContainers} potential modal containers`);

// วิธีที่ 5: รีเฟรชเพจในกรณีฉุกเฉินสุดๆ (ไม่แนะนำเว้นแต่วิธีอื่นๆ ล้มเหลว)
// console.log('EMERGENCY REFRESH - This will reload the page and lose unsaved changes!');
// window.location.reload();

console.log('ได้พยายามปิด modal ฉุกเฉินแล้ว ถ้าไม่ได้ผล ลองรีเฟรชหน้าเว็บโดยเอาเครื่องหมาย // ออกจากบรรทัดสุดท้าย');
console.log('Emergency close attempted. If this did not work, try uncommenting and running the refresh command (Method 5).');
