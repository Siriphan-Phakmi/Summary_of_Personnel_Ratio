import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/app/lib/firebase/firebase';
import { 
  StandardLog, 
  Actor, 
  Action, 
  Target, 
  ClientInfo, 
  SYSTEM_LOGS_COLLECTION, 
  USER_ACTIVITY_LOGS_COLLECTION 
} from '../types/log';
import { User } from '../types/user';

/**
 * สร้าง Log Entry ลงใน Firebase Collection
 * @param collectionName ชื่อ Collection
 * @param actor ผู้ดำเนินการ
 * @param action การกระทำ
 * @param clientInfo ข้อมูล Client
 * @param target เป้าหมายของการกระทำ
 * @param details รายละเอียดเพิ่มเติม
 */
export const createLogEntry = async (
  collectionName: string,
  actor: Actor,
  action: Action,
  clientInfo?: ClientInfo,
  target?: Target,
  details?: Record<string, any>
): Promise<void> => {
  const logEntry: StandardLog = {
    timestamp: serverTimestamp(),
    actor,
    action,
    ...(target && { target }),
    ...(clientInfo && { clientInfo }),
    ...(details && { details }),
  };

  try {
    const logsRef = collection(db, collectionName);
    await addDoc(logsRef, logEntry);
    
    if (process.env.NODE_ENV === 'development') {
      console.log(`✅ [${collectionName}] Log saved:`, { 
        action: action.type, 
        actor: actor.username,
        timestamp: new Date() 
      });
    }
  } catch (error) {
    console.error(`❌ Failed to save log to ${collectionName}:`, error);
    console.log(`📝 [${collectionName}] FALLBACK LOG:`, { 
      ...logEntry, 
      timestamp: new Date(),
      error: error instanceof Error ? error.message : String(error)
    });
  }
};

/**
 * สร้าง Actor Object จาก User Object อย่างปลอดภัย
 * @param user User object
 * @returns Actor object
 */
export const createActorFromUser = (user: User | null | undefined): Actor => {
  if (!user || !user.uid || !user.username) {
    return { 
      id: 'SYSTEM', 
      username: 'SYSTEM', 
      role: 'SYSTEM', 
      active: true 
    };
  }
  
  const actor: Actor = {
    id: user.uid,
    username: user.username,
    role: user.role,
    active: typeof user.isActive === 'boolean' ? user.isActive : true
  };
  
  // เพิ่ม timestamp เฉพาะเมื่อมีค่าที่ valid เท่านั้น
  if (user.createdAt) {
    actor.createdAt = user.createdAt;
  }
  if (user.updatedAt) {
    actor.updatedAt = user.updatedAt;
  }

  return actor;
};

/**
 * ดึงข้อมูล Client Information อย่างปลอดภัย
 * @param req Request object (optional)
 * @returns ClientInfo object
 */
export const getClientInfo = (req?: Request): ClientInfo => {
  // Client-side
  if (typeof window !== 'undefined') {
    const userAgent = window.navigator.userAgent || 'unknown';
    let deviceType: ClientInfo['deviceType'] = 'desktop';
    
    if (/mobile/i.test(userAgent)) deviceType = 'mobile';
    else if (/tablet/i.test(userAgent)) deviceType = 'tablet';
    
    return { 
      userAgent, 
      deviceType, 
      ipAddress: '127.0.0.1' // Client-side placeholder
    };
  }
  
  // Server-side
  if (req) {
    const userAgent = req.headers.get('user-agent') || 'unknown-server';
    let deviceType: ClientInfo['deviceType'] = 'desktop';
    
    if (/mobile/i.test(userAgent)) deviceType = 'mobile';
    else if (/tablet/i.test(userAgent)) deviceType = 'tablet';
    
    const ip = req.headers.get('x-forwarded-for') ?? 
               req.headers.get('x-real-ip') ?? 
               '127.0.0.1';
    
    return { userAgent, deviceType, ipAddress: ip };
  }

  // Default fallback
  return { 
    userAgent: 'server', 
    deviceType: 'server',
    ipAddress: '127.0.0.1'
  };
};

/**
 * Development logging function
 * @param message ข้อความที่ต้องการ log
 */
export const devLog = (message: string): void => {
  if (process.env.NODE_ENV === 'development') {
    const timestamp = new Date().toLocaleTimeString();
    console.log(`🔍 [AUTH_LOG ${timestamp}] ${message}`);
  }
}; 