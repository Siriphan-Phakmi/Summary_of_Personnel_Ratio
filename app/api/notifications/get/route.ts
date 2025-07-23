import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { db } from '@/app/lib/firebase/firebase';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { getSession } from '@/app/features/auth/services/sessionService';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/notifications/get
 * Fetches notifications for the authenticated user
 */
export async function GET(request: NextRequest) {
  try {
    // Get user from authentication cookie
    const user = await getSession();
    
    if (!user) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Authentication required',
          notifications: [],
          unreadCount: 0
        },
        { status: 401 }
      );
    }

    // Query notifications where user is a recipient
    const notificationsRef = collection(db, 'notifications');
    const q = query(
      notificationsRef,
      where('recipientIds', 'array-contains', user.uid),
      orderBy('createdAt', 'desc')
    );

    console.log(`[DEBUG] Starting notification query for user: ${user.uid}`);
    
    let querySnapshot;
    try {
      querySnapshot = await getDocs(q);
      console.log(`[DEBUG] Query successful. Document count: ${querySnapshot.size}`);
    } catch (firestoreError: any) {
      console.error('Firestore query error:', firestoreError.code, firestoreError.message);
      
      // Check if it's a missing index error
      if (firestoreError.code === 'failed-precondition' && 
          firestoreError.message.includes('index')) {
        console.warn('Missing Firestore index for notifications query. Deploy the index and try again.');
        
        // Return empty result instead of error to prevent infinite loading
        return NextResponse.json({
          notifications: [],
          unreadCount: 0,
          error: 'Missing database index - please contact administrator'
        });
      }
      
      // Re-throw other errors
      throw firestoreError;
    }
    const notifications: any[] = [];
    let unreadCount = 0;

    querySnapshot.forEach((doc) => {
      const data = doc.data();
      const notification = {
        id: doc.id,
        ...data,
        createdAt: data.createdAt ? data.createdAt.toDate().toISOString() : null,
      };
      
      notifications.push(notification);
      
      // Count unread notifications for this user
      if (!data.isRead || data.isRead[user.uid] !== true) {
        unreadCount++;
      }
    });

    console.log(`[DEBUG] Processed notifications: ${notifications.length}, Unread count: ${unreadCount}`);

    return NextResponse.json({
      success: true,
      notifications,
      unreadCount,
    });

  } catch (err: unknown) {
    const error = err as { message: string; code?: string; stack?: string };
    console.error('[NotificationAPI] Critical Error Fetching Notifications:', {
      message: error.message,
      code: error.code || 'N/A',
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
    return NextResponse.json(
      { 
        success: false, 
        error: `Internal Server Error: ${error.message}`,
        notifications: [],
        unreadCount: 0
      },
      { status: 500 }
    );
  }
}