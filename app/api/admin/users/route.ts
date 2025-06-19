import { NextRequest, NextResponse } from 'next/server';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { db } from '@/app/lib/firebase/firebase';
import bcrypt from 'bcryptjs';
import { User, UserRole } from '@/app/features/auth/types/user';

// Helper function to get user from cookies and check role
async function authorizeRequest(req: NextRequest): Promise<User | null> {
  const userCookie = req.cookies.get('user_data')?.value;
  if (!userCookie) return null;

  try {
    const user = JSON.parse(decodeURIComponent(userCookie)) as User;
    const allowedRoles = [UserRole.ADMIN, UserRole.DEVELOPER];
    if (allowedRoles.includes(user.role)) {
      return user;
    }
  } catch (error) {
    console.error('Error parsing user cookie:', error);
    return null;
  }
  return null;
}

export async function POST(req: NextRequest) {
  const adminUser = await authorizeRequest(req);
  if (!adminUser) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { username, password, role, firstName, lastName, assignedWardId, approveWardIds } = body;

    // --- Validation ---
    if (!username || !password || !role) {
      return NextResponse.json({ success: false, error: 'Username, password, and role are required.' }, { status: 400 });
    }
    
    if (password.length < 6) {
        return NextResponse.json({ success: false, error: 'Password must be at least 6 characters long.' }, { status: 400 });
    }

    const userRef = doc(db, 'users', username);
    const userSnap = await getDoc(userRef);

    if (userSnap.exists()) {
      return NextResponse.json({ success: false, error: 'Username already exists.' }, { status: 409 });
    }

    // --- User Creation ---
    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser: User = {
      uid: username,
      username,
      role,
      firstName: firstName || '',
      lastName: lastName || '',
      assignedWardId: assignedWardId || undefined,
      approveWardIds: approveWardIds || [],
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastLogin: null,
      lastActive: null,
    };
    
    const dataToSave = { ...newUser, password: hashedPassword };

    await setDoc(userRef, dataToSave);
    
    return NextResponse.json({ success: true, user: newUser }, { status: 201 });

  } catch (error) {
    console.error('Error creating user:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown server error occurred.';
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
} 