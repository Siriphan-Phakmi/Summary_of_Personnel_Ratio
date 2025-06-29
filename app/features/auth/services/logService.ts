import { User } from '../types/user';
import { 
  Action, 
  Target, 
  ActionStatus, 
  SYSTEM_LOGS_COLLECTION, 
  USER_ACTIVITY_LOGS_COLLECTION 
} from '../types/log';
import { createLogEntry, createActorFromUser, getClientInfo, devLog } from './logCore';

/**
 * บันทึกการเข้าสู่ระบบ
 * @param user ข้อมูลผู้ใช้
 * @param req Request object (optional)
 */
export const logLogin = async (
  user: User, 
  req?: Request
): Promise<void> => {
  if (!user?.uid || !user?.username) {
    console.error('❌ Cannot log login: User data is incomplete');
    return;
  }

  try {
    devLog(`Logging login for user: ${user.username}`);
    
    const actor = createActorFromUser(user);
    const action: Action = { type: 'AUTH.LOGIN', status: 'SUCCESS' };
    const clientInfo = getClientInfo(req);
    const details = { role: user.role, success: true };
    
    await createLogEntry(SYSTEM_LOGS_COLLECTION, actor, action, clientInfo, undefined, details);
    devLog(`✅ Login logged successfully for: ${user.username}`);
  } catch (error) {
    console.error('❌ Failed to log login:', error);
  }
};

/**
 * บันทึกการออกจากระบบ
 * @param user ข้อมูลผู้ใช้
 * @param req Request object (optional)
 */
export const logLogout = async (
  user: User, 
  req?: Request
): Promise<void> => {
  if (!user?.uid || !user?.username) {
    console.error('❌ Cannot log logout: User data is incomplete');
    return;
  }

  try {
    devLog(`Logging logout for user: ${user.username}`);
    
    const actor = createActorFromUser(user);
    const action: Action = { type: 'AUTH.LOGOUT', status: 'SUCCESS' };
    const clientInfo = getClientInfo(req);
    const details = { role: user.role };
    
    await createLogEntry(SYSTEM_LOGS_COLLECTION, actor, action, clientInfo, undefined, details);
    devLog(`✅ Logout logged successfully for: ${user.username}`);
  } catch (error) {
    console.error('❌ Failed to log logout:', error);
  }
};

/**
 * บันทึก Authentication Event (LOGIN/LOGOUT)
 * @param user ข้อมูลผู้ใช้
 * @param type ประเภทของ event
 * @param status สถานะของ event
 * @param req Request object (optional)
 */
export const logAuthEvent = async (
  user: User, 
  type: 'LOGIN' | 'LOGOUT', 
  status: ActionStatus, 
  req?: Request
): Promise<void> => {
  if (!user?.uid || !user?.username) {
    console.error('❌ Cannot log auth event: User data is incomplete');
    return;
  }

  try {
    devLog(`Logging auth event: ${type} - ${status} for user: ${user.username}`);
    
    const actor = createActorFromUser(user);
    const action: Action = { type: `AUTH.${type}`, status };
    const clientInfo = getClientInfo(req);
    
    await createLogEntry(SYSTEM_LOGS_COLLECTION, actor, action, clientInfo);
    devLog(`✅ Auth event logged: ${type} - ${status} for: ${user.username}`);
  } catch (error) {
    console.error(`❌ Failed to log auth event (${type}):`, error);
  }
};

/**
 * บันทึกข้อผิดพลาดของระบบ
 * @param error อ็อบเจกต์ข้อผิดพลาด
 * @param context ข้อมูลเพิ่มเติมเกี่ยวกับที่มาของข้อผิดพลาด
 * @param user ข้อมูลผู้ใช้ (ถ้ามี)
 * @param req Request object (optional)
 */
export const logSystemError = async (
  error: any,
  context: string,
  user?: User | null,
  req?: Request
): Promise<void> => {
  try {
    devLog(`Logging system error: ${context}`);
    
    const actor = createActorFromUser(user);
    const action: Action = { type: 'SYSTEM.ERROR', status: 'FAILURE' };
    const clientInfo = getClientInfo(req);

    const details: Record<string, any> = {
      context,
      errorMessage: error instanceof Error ? error.message : String(error),
      errorStack: error instanceof Error ? error.stack : undefined,
    };

    await createLogEntry(SYSTEM_LOGS_COLLECTION, actor, action, clientInfo, undefined, details);
    devLog(`✅ System error logged: ${context}`);
  } catch (logError) {
    console.error('❌ Failed to log system error:', logError);
  }
};

/**
 * บันทึกการกระทำของผู้ใช้
 * @param user ข้อมูลผู้ใช้
 * @param actionType ชื่อการกระทำ
 * @param status สถานะของการกระทำ
 * @param target ข้อมูลเพิ่มเติมเกี่ยวกับการกระทำ
 * @param details รายละเอียดเพิ่มเติม
 * @param req Request object (optional)
 */
export const logUserAction = async (
  user: User,
  actionType: string,
  status: ActionStatus,
  target?: Target,
  details?: Record<string, any>,
  req?: Request
): Promise<void> => {
  if (!user?.uid || !user?.username) {
    console.error('❌ Cannot log user action: User data is incomplete');
    return;
  }

  try {
    devLog(`Logging user action: ${actionType} - ${status} for user: ${user.username}`);
    
    const actor = createActorFromUser(user);
    const action: Action = { type: actionType, status };
    const clientInfo = getClientInfo(req);

    await createLogEntry(USER_ACTIVITY_LOGS_COLLECTION, actor, action, clientInfo, target, details);
    devLog(`✅ User action logged: ${actionType} for: ${user.username}`);
  } catch (error) {
    console.error(`❌ Failed to log user action (${actionType}):`, error);
  }
};

/**
 * บันทึกการเข้าถึงหน้าที่ต้องตรวจสอบสิทธิ์
 * @param user ข้อมูลผู้ใช้
 * @param page ชื่อหน้าที่เข้าถึง
 * @param req Request object (optional)
 */
export const logPageAccess = async (
  user: User,
  page: string,
  req?: Request
): Promise<void> => {
  if (!user?.uid || !user?.username) {
    console.error('❌ Cannot log page access: User data is incomplete');
    return;
  }

  try {
    devLog(`Logging page access: ${page} for user: ${user.username}`);
    
    const actor = createActorFromUser(user);
    const action: Action = { type: 'NAVIGATION.PAGE_VIEW', status: 'SUCCESS' };
    const clientInfo = getClientInfo(req);
    const details = { page };

    await createLogEntry(SYSTEM_LOGS_COLLECTION, actor, action, clientInfo, undefined, details);
    devLog(`✅ Page access logged: ${page} for: ${user.username}`);
  } catch (error) {
    console.error(`❌ Failed to log page access (${page}):`, error);
  }
}; 