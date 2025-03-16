// ตรวจสอบว่าไฟล์นี้มีอยู่และมีชื่อถูกต้องไม่มีช่องว่าง

export async function POST(request) {
  try {
    const data = await request.json();
    
    // แสดง log ใน server console
    console.log(`[SERVER LOG] ${data.event || 'unknown_event'}:`, JSON.stringify(data.properties || {}));
    
    return Response.json({ success: true });
  } catch (error) {
    console.error('Error processing log:', error);
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
}