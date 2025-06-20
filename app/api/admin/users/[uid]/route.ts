import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/app/features/auth/services/sessionService';
import { UserRole } from '@/app/features/auth/types/user';
import { getUser, updateUser, deleteUser } from '@/app/features/auth/services/userService';
import { logUserManagementAction } from '@/app/features/auth/services/userManagementLogService';

async function handler(req: NextRequest, { params }: { params: { uid: string } }) {
  const session = await getSession();
  if (!session || ![UserRole.ADMIN, UserRole.DEVELOPER].includes(session.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { uid } = params;

  try {
    const targetUser = await getUser(uid);
    if (!targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (req.method === 'PUT') {
      const updateData = await req.json();
      
      await updateUser(uid, updateData);
      
      // Determine log action for more specific auditing
      const isToggleAction = Object.keys(updateData).length === 1 && 'isActive' in updateData;
      
      await logUserManagementAction({
        action: isToggleAction ? 'TOGGLE_STATUS' : 'UPDATE_USER',
        adminUid: session.uid,
        adminUsername: session.username,
        targetUid: uid,
        targetUsername: targetUser.username,
        details: { oldData: targetUser, newData: updateData },
      });

      const updatedUser = await getUser(uid);
      return NextResponse.json({ user: updatedUser });
    }

    if (req.method === 'DELETE') {
      await deleteUser(uid);

      await logUserManagementAction({
        action: 'DELETE_USER',
        adminUid: session.uid,
        adminUsername: session.username,
        targetUid: uid,
        targetUsername: targetUser.username,
        details: { deletedUser: targetUser },
      });

      return NextResponse.json({ message: 'User deleted successfully' });
    }
    
    return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });

  } catch (error) {
    console.error(`[API /admin/users/${uid}]`, error);
    const message = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export { handler as PUT, handler as DELETE };