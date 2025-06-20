import { NextRequest, NextResponse } from 'next/server';
import { doc, setDoc, collection, serverTimestamp, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/app/lib/firebase/firebase';
import bcrypt from 'bcryptjs';
import { User, UserRole } from '@/app/features/auth/types/user';
import { getSession } from '@/app/features/auth/services/sessionService';
import { logUserManagementAction } from '@/app/features/auth/services/userManagementLogService';

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || ![UserRole.ADMIN, UserRole.DEVELOPER].includes(session.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { username, password, role, firstName, lastName, assignedWardId, approveWardIds } = body;

    // --- Validation ---
    if (!username || !password || !role) {
      return NextResponse.json({ error: 'Username, password, and role are required.' }, { status: 400 });
    }
    
    if (password.length < 6) {
        return NextResponse.json({ error: 'Password must be at least 6 characters long.' }, { status: 400 });
    }

    const usersCollection = collection(db, 'users');
    const q = query(usersCollection, where("username", "==", username));
    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty) {
      return NextResponse.json({ error: 'Username already exists.' }, { status: 409 });
    }

    // --- User Creation ---
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUserRef = doc(usersCollection);
    
    // Create the user object with all fields defined in the User type
    const newUser: User = {
        uid: newUserRef.id,
        username,
        password: hashedPassword,
        firstName,
        lastName,
        role,
        assignedWardId: role === UserRole.NURSE ? assignedWardId : undefined,
        approveWardIds: role === UserRole.APPROVER ? approveWardIds : [],
        isActive: true,
        createdAt: new Date(), // Placeholder, will be replaced by serverTimestamp
        updatedAt: new Date(), // Placeholder, will be replaced by serverTimestamp
        lastLogin: null,
        lastActive: null,
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

    return NextResponse.json({ user: userToReturn }, { status: 201 });

  } catch (error) {
    console.error('[API /admin/users] POST Error:', error);
    const message = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ error: message }, { status: 500 });
  }
} 