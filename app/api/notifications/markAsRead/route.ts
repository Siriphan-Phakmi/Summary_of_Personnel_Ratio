import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { db } from '@/app/lib/firebase/firebase';
import { doc, updateDoc, collection, query, where, getDocs, writeBatch } from 'firebase/firestore';
import { getSession } from '@/app/features/auth/services/sessionService';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/notifications/markAsRead
 * Marks notifications as read for the authenticated user
 */
export async function POST(request: NextRequest) {
  try {
    // Get user from authentication cookie
    const user = await getSession();
    const cookieStore = await cookies();
    
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Validate CSRF token
    const csrfToken = request.headers.get('X-CSRF-Token');
    const csrfCookie = cookieStore.get('csrf-token')?.value;
    
    if (!csrfToken || !csrfCookie || csrfToken !== csrfCookie) {
      return NextResponse.json(
        { success: false, error: 'Invalid CSRF token' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { notificationId, all } = body;

    if (all) {
      // Mark all notifications as read for this user
      const notificationsRef = collection(db, 'notifications');
      const q = query(
        notificationsRef,
        where('recipientIds', 'array-contains', user.uid)
      );

      const querySnapshot = await getDocs(q);
      const batch = writeBatch(db);

      querySnapshot.forEach((docSnapshot) => {
        const data = docSnapshot.data();
        const currentIsRead = data.isRead || {};
        
        // Update only if not already read
        if (currentIsRead[user.uid] !== true) {
          batch.update(docSnapshot.ref, {
            [`isRead.${user.uid}`]: true
          });
        }
      });

      await batch.commit();
      
      return NextResponse.json({
        success: true,
        message: 'All notifications marked as read'
      });

    } else if (notificationId) {
      // Mark specific notification as read
      const notificationRef = doc(db, 'notifications', notificationId);
      
      await updateDoc(notificationRef, {
        [`isRead.${user.uid}`]: true
      });

      return NextResponse.json({
        success: true,
        message: 'Notification marked as read'
      });

    } else {
      return NextResponse.json(
        { success: false, error: 'Invalid request: notificationId or all flag required' },
        { status: 400 }
      );
    }

  } catch (error) {
    console.error('[NotificationAPI] Error marking notifications as read:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to mark notifications as read' },
      { status: 500 }
    );
  }
}