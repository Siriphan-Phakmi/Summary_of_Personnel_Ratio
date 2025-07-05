import { NextRequest, NextResponse } from 'next/server';
import { UserRole } from '@/app/features/auth/types/user';
import { getUser, updateUser, deleteUser } from '@/app/features/auth/services/userService';
import { logUserManagementAction } from '@/app/features/auth/services/userManagementLogService';
import { 
  validateName,
  validateUserRole,
  sanitizeInput,
  rateLimiter,
  applySecurityHeaders 
} from '@/app/lib/utils/security';

// ✅ Force runtime execution to prevent static generation issues
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function handler(req: NextRequest, { params }: { params: Promise<{ uid: string }> }) {
  // Rate limiting check
  const clientIp = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
  const maxAttempts = parseInt(process.env.RATE_LIMIT_USER_UPDATE_MAX_ATTEMPTS || '10');
  const windowMs = parseInt(process.env.RATE_LIMIT_USER_UPDATE_WINDOW_MS || '900000');
  const rateLimitResult = rateLimiter.check(`user-update:${clientIp}`, maxAttempts, windowMs);
  
  if (!rateLimitResult.success) {
    const response = NextResponse.json(
      { error: 'Too many requests. Please try again later.' }, 
      { status: 429 }
    );
    return applySecurityHeaders(response);
  }

  // ✅ Dynamic import sessionService to prevent webpack issues
  let session = null;
  try {
    const { getSession } = await import('@/app/features/auth/services/sessionService');
    session = await getSession();
  } catch (error) {
    console.error('[API Route] Error loading session service:', error);
    const response = NextResponse.json({ error: 'Authentication service unavailable' }, { status: 500 });
    return applySecurityHeaders(response);
  }

  if (!session || ![UserRole.ADMIN, UserRole.DEVELOPER].includes(session.role)) {
    const response = NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    return applySecurityHeaders(response);
  }

  const { uid } = await params;

  // Validate UID format (basic validation)
  if (!uid || typeof uid !== 'string' || uid.trim().length === 0) {
    const response = NextResponse.json({ error: 'Invalid user ID' }, { status: 400 });
    return applySecurityHeaders(response);
  }

  try {
    const targetUser = await getUser(uid);
    if (!targetUser) {
      const response = NextResponse.json({ error: 'User not found' }, { status: 404 });
      return applySecurityHeaders(response);
    }

    if (req.method === 'PUT') {
      const updateData = await req.json();

      // Validate and sanitize update data
      const validatedData: any = {};
      
      if (updateData.firstName !== undefined) {
        if (updateData.firstName === '') {
          validatedData.firstName = undefined;
        } else {
          const firstNameValidation = validateName(updateData.firstName, 'First name');
          if (!firstNameValidation.isValid) {
            const response = NextResponse.json({ error: firstNameValidation.error }, { status: 400 });
            return applySecurityHeaders(response);
          }
          validatedData.firstName = firstNameValidation.sanitized;
        }
      }

      if (updateData.lastName !== undefined) {
        if (updateData.lastName === '') {
          validatedData.lastName = undefined;
        } else {
          const lastNameValidation = validateName(updateData.lastName, 'Last name');
          if (!lastNameValidation.isValid) {
            const response = NextResponse.json({ error: lastNameValidation.error }, { status: 400 });
            return applySecurityHeaders(response);
          }
          validatedData.lastName = lastNameValidation.sanitized;
        }
      }

      if (updateData.role !== undefined) {
        const roleValidation = validateUserRole(updateData.role);
        if (!roleValidation.isValid) {
          const response = NextResponse.json({ error: roleValidation.error }, { status: 400 });
          return applySecurityHeaders(response);
        }
        validatedData.role = updateData.role;
      }

      if (updateData.isActive !== undefined) {
        if (typeof updateData.isActive !== 'boolean') {
          const response = NextResponse.json({ error: 'isActive must be a boolean value' }, { status: 400 });
          return applySecurityHeaders(response);
        }
        validatedData.isActive = updateData.isActive;
      }

      if (updateData.assignedWardId !== undefined) {
        validatedData.assignedWardId = updateData.assignedWardId;
      }

      if (updateData.approveWardIds !== undefined) {
        if (!Array.isArray(updateData.approveWardIds)) {
          const response = NextResponse.json({ error: 'approveWardIds must be an array' }, { status: 400 });
          return applySecurityHeaders(response);
        }
        validatedData.approveWardIds = updateData.approveWardIds;
      }
      
      await updateUser(uid, validatedData);
      
      // Determine log action for more specific auditing
      const isToggleAction = Object.keys(validatedData).length === 1 && 'isActive' in validatedData;
      
      await logUserManagementAction({
        action: isToggleAction ? 'TOGGLE_STATUS' : 'UPDATE_USER',
        adminUid: session.uid,
        adminUsername: session.username,
        targetUid: uid,
        targetUsername: targetUser.username,
        details: { oldData: targetUser, newData: validatedData },
      });

      const updatedUser = await getUser(uid);
      const response = NextResponse.json({ user: updatedUser });
      return applySecurityHeaders(response);
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

      const response = NextResponse.json({ message: 'User deleted successfully' });
      return applySecurityHeaders(response);
    }
    
    const response = NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
    return applySecurityHeaders(response);

  } catch (error) {
    console.error(`[API /admin/users/${uid}]`, error);
    // Don't expose detailed error messages in production
    const message = process.env.NODE_ENV === 'development' 
      ? (error instanceof Error ? error.message : 'An unknown error occurred')
      : 'Internal server error';
    
    const response = NextResponse.json({ error: message }, { status: 500 });
    return applySecurityHeaders(response);
  }
}

export { handler as PUT, handler as DELETE };