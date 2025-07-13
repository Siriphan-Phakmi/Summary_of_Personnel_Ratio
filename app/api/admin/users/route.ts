import { NextRequest, NextResponse } from 'next/server';
import { doc, setDoc, collection, serverTimestamp, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/app/lib/firebase/firebase';
import bcrypt from 'bcryptjs';
import { User, UserRole } from '@/app/features/auth/types/user';
import { getSession } from '@/app/features/auth/services/sessionService';
import { logUserManagementAction } from '@/app/features/auth/services/userManagementLogService';
import { 
  validatePasswordStrength, 
  validateUsername, 
  validateName,
  validateUserRole,
  sanitizeInput,
  rateLimiter,
  applySecurityHeaders 
} from '@/app/lib/utils/security';

export async function POST(req: NextRequest) {
  // Rate limiting check
  const clientIp = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
  const maxAttempts = parseInt(process.env.RATE_LIMIT_USER_CREATION_MAX_ATTEMPTS || '5');
  const windowMs = parseInt(process.env.RATE_LIMIT_USER_CREATION_WINDOW_MS || '900000');
  const rateLimitResult = rateLimiter.check(`user-creation:${clientIp}`, maxAttempts, windowMs);
  
  if (!rateLimitResult.success) {
    const response = NextResponse.json(
      { error: 'Too many requests. Please try again later.' }, 
      { status: 429 }
    );
    return applySecurityHeaders(response);
  }

  const session = await getSession();
  if (!session || ![UserRole.ADMIN, UserRole.DEVELOPER].includes(session.role)) {
    const response = NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    return applySecurityHeaders(response);
  }

  try {
    const body = await req.json();
    const { username, password, role, firstName, lastName, assignedWardId, approveWardIds } = body;

    // --- Enhanced Security Validation ---
    if (!username || !password || !role) {
      const response = NextResponse.json({ error: 'Username, password, and role are required.' }, { status: 400 });
      return applySecurityHeaders(response);
    }

    // Validate username
    const usernameValidation = validateUsername(username);
    if (!usernameValidation.isValid) {
      const response = NextResponse.json({ error: usernameValidation.error }, { status: 400 });
      return applySecurityHeaders(response);
    }

    // Validate password strength (enterprise-grade: 8+ chars with complexity)
    const passwordValidation = validatePasswordStrength(password);
    if (!passwordValidation.isValid) {
      const response = NextResponse.json({ 
        error: 'Password does not meet security requirements', 
        details: passwordValidation.errors 
      }, { status: 400 });
      return applySecurityHeaders(response);
    }

    // Validate role
    const roleValidation = validateUserRole(role);
    if (!roleValidation.isValid) {
      const response = NextResponse.json({ error: roleValidation.error }, { status: 400 });
      return applySecurityHeaders(response);
    }

    // Validate names if provided
    if (firstName) {
      const firstNameValidation = validateName(firstName, 'First name');
      if (!firstNameValidation.isValid) {
        const response = NextResponse.json({ error: firstNameValidation.error }, { status: 400 });
        return applySecurityHeaders(response);
      }
    }

    if (lastName) {
      const lastNameValidation = validateName(lastName, 'Last name');
      if (!lastNameValidation.isValid) {
        const response = NextResponse.json({ error: lastNameValidation.error }, { status: 400 });
        return applySecurityHeaders(response);
      }
    }

    const usersCollection = collection(db, 'users');
    // Use sanitized username for database query
    const q = query(usersCollection, where("username", "==", usernameValidation.sanitized));
    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty) {
      const response = NextResponse.json({ error: 'Username already exists.' }, { status: 409 });
      return applySecurityHeaders(response);
    }

    // --- User Creation with Sanitized Data ---
    const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS || '12');
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    const newUserRef = doc(usersCollection,username);
    
    // Create the user object with sanitized and validated data
    const newUser: User = {
        uid: username,
        username,
        password: hashedPassword,
        firstName: firstName ? sanitizeInput(firstName) : undefined,
        lastName: lastName ? sanitizeInput(lastName) : undefined,
        role,
        assignedWardId: role === UserRole.NURSE ? assignedWardId : undefined,
        approveWardIds: role === UserRole.APPROVER ? approveWardIds : [],
        isActive: true,
        createdAt: new Date(), // Placeholder, will be replaced by serverTimestamp
        updatedAt: new Date(), // Placeholder, will be replaced by serverTimestamp
        lastLogin: null,
    };

    await setDoc(newUserRef, {
        ...newUser,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
    });

    // Log the creation action
    await logUserManagementAction({
        action: 'CREATE_USER',
        adminUid: session.uid,
        adminUsername: session.username,
        targetUid: newUser.uid,
        targetUsername: newUser.username,
        details: { userData: body }
    });
    
    // Return the complete user object, excluding the password
    const { password: _, ...userToReturn } = newUser;

    const response = NextResponse.json({ user: userToReturn }, { status: 201 });
    return applySecurityHeaders(response);

  } catch (error) {
    console.error('[API /admin/users] POST Error:', error);
    // Don't expose detailed error messages in production
    const message = process.env.NODE_ENV === 'development' 
      ? (error instanceof Error ? error.message : 'An unknown error occurred')
      : 'Internal server error';
    
    const response = NextResponse.json({ error: message }, { status: 500 });
    return applySecurityHeaders(response);
  }
} 