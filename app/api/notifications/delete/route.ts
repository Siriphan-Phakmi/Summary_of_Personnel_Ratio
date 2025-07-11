import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { db } from '@/app/lib/firebase/firebase';
import { doc, deleteDoc, collection, query, where, getDocs, writeBatch } from 'firebase/firestore';
import { getSession } from '@/app/features/auth/services/sessionService';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * DELETE /api/notifications/delete
 * Deletes notifications for the authenticated user
 * Supports both individual notification deletion and bulk deletion
 */
export async function DELETE(request: NextRequest) {
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
    const { notificationId, all, type } = body;

    if (all) {
      // Delete all notifications for this user
      const notificationsRef = collection(db, 'notifications');
      const q = query(
        notificationsRef,
        where('recipientIds', 'array-contains', user.uid)
      );

      const querySnapshot = await getDocs(q);
      const batch = writeBatch(db);
      let deletedCount = 0;

      for (const docSnapshot of querySnapshot.docs) {
        const data = docSnapshot.data();
        const recipientIds = data.recipientIds || [];
        
        if (recipientIds.length === 1 && recipientIds[0] === user.uid) {
          // If this user is the only recipient, delete the entire notification
          batch.delete(docSnapshot.ref);
          deletedCount++;
        } else if (recipientIds.length > 1) {
          // If multiple recipients, remove only this user from recipientIds
          const updatedRecipientIds = recipientIds.filter((id: string) => id !== user.uid);
          const updatedIsRead = { ...data.isRead };
          delete updatedIsRead[user.uid];
          
          batch.update(docSnapshot.ref, {
            recipientIds: updatedRecipientIds,
            isRead: updatedIsRead
          });
          deletedCount++;
        }
      }

      await batch.commit();
      
      return NextResponse.json({
        success: true,
        message: `Successfully deleted ${deletedCount} notifications`,
        deletedCount
      });

    } else if (notificationId) {
      // Delete specific notification
      const notificationRef = doc(db, 'notifications', notificationId);
      
      // First check if user has access to this notification
      const notificationDoc = await getDocs(
        query(
          collection(db, 'notifications'),
          where('recipientIds', 'array-contains', user.uid)
        )
      );
      
      const targetNotification = notificationDoc.docs.find(doc => doc.id === notificationId);
      if (!targetNotification) {
        return NextResponse.json(
          { success: false, error: 'Notification not found or access denied' },
          { status: 404 }
        );
      }

      const data = targetNotification.data();
      const recipientIds = data.recipientIds || [];
      
      if (recipientIds.length === 1 && recipientIds[0] === user.uid) {
        // If this user is the only recipient, delete the entire notification
        await deleteDoc(notificationRef);
      } else if (recipientIds.length > 1) {
        // If multiple recipients, remove only this user
        const updatedRecipientIds = recipientIds.filter((id: string) => id !== user.uid);
        const updatedIsRead = { ...data.isRead };
        delete updatedIsRead[user.uid];
        
        await targetNotification.ref.update({
          recipientIds: updatedRecipientIds,
          isRead: updatedIsRead
        });
      }

      return NextResponse.json({
        success: true,
        message: 'Notification deleted successfully'
      });

    } else if (type) {
      // Delete notifications by type
      const notificationsRef = collection(db, 'notifications');
      const q = query(
        notificationsRef,
        where('recipientIds', 'array-contains', user.uid),
        where('type', '==', type)
      );

      const querySnapshot = await getDocs(q);
      const batch = writeBatch(db);
      let deletedCount = 0;

      for (const docSnapshot of querySnapshot.docs) {
        const data = docSnapshot.data();
        const recipientIds = data.recipientIds || [];
        
        if (recipientIds.length === 1 && recipientIds[0] === user.uid) {
          batch.delete(docSnapshot.ref);
          deletedCount++;
        } else if (recipientIds.length > 1) {
          const updatedRecipientIds = recipientIds.filter((id: string) => id !== user.uid);
          const updatedIsRead = { ...data.isRead };
          delete updatedIsRead[user.uid];
          
          batch.update(docSnapshot.ref, {
            recipientIds: updatedRecipientIds,
            isRead: updatedIsRead
          });
          deletedCount++;
        }
      }

      await batch.commit();
      
      return NextResponse.json({
        success: true,
        message: `Successfully deleted ${deletedCount} notifications of type "${type}"`,
        deletedCount
      });

    } else {
      return NextResponse.json(
        { success: false, error: 'Invalid request: notificationId, all flag, or type required' },
        { status: 400 }
      );
    }

  } catch (error) {
    console.error('[NotificationAPI] Error deleting notifications:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete notifications' },
      { status: 500 }
    );
  }
}