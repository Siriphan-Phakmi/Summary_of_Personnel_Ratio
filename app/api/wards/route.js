'use client';

import { NextResponse } from 'next/server';
import { collection, getDocs, doc, getDoc, query, orderBy } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { firestore } from '../../../lib/firebase';
import AuditLogUtil from '../../../utils/AuditLogUtil';

/**
 * GET - ดึงข้อมูลวอร์ดทั้งหมด
 * @param {Request} request - คำขอ HTTP
 * @returns {Promise<Response>} - ผลลัพธ์ HTTP
 */
export async function GET(request) {
    try {
        // ตรวจสอบและยืนยันตัวตนของผู้ใช้
        const auth = getAuth();
        const user = auth.currentUser;
        
        if (!user) {
            return NextResponse.json(
                { error: 'Unauthorized access' },
                { status: 401 }
            );
        }

        // ตรวจสอบ URL parameters
        const { searchParams } = new URL(request.url);
        const wardId = searchParams.get('id');
        
        // กรณีต้องการดึงข้อมูลวอร์ดเฉพาะ
        if (wardId) {
            const wardRef = doc(firestore, 'wards', wardId);
            const wardDoc = await getDoc(wardRef);
            
            if (!wardDoc.exists()) {
                return NextResponse.json(
                    { error: 'Ward not found' },
                    { status: 404 }
                );
            }
            
            const wardData = {
                id: wardDoc.id,
                ...wardDoc.data()
            };
            
            // บันทึกการเข้าถึงข้อมูล
            await AuditLogUtil.logAccess('view', 'wards', wardId);
            
            return NextResponse.json({ ward: wardData });
        }
        
        // กรณีต้องการดึงข้อมูลวอร์ดทั้งหมด
        const wardsQuery = query(
            collection(firestore, 'wards'),
            orderBy('name')
        );
        
        const querySnapshot = await getDocs(wardsQuery);
        const wards = [];
        
        querySnapshot.forEach((doc) => {
            wards.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        // บันทึกการเข้าถึงข้อมูล
        await AuditLogUtil.logAccess('view', 'wards', 'all');
        
        return NextResponse.json({ wards });
    } catch (error) {
        console.error('Error fetching wards:', error);
        return NextResponse.json(
            { error: 'Failed to fetch wards', details: error.message },
            { status: 500 }
        );
    }
}

/**
 * POST - เพิ่มข้อมูลวอร์ดใหม่
 * @param {Request} request - คำขอ HTTP
 * @returns {Promise<Response>} - ผลลัพธ์ HTTP
 */
export async function POST(request) {
    try {
        // จะเพิ่มการบันทึกข้อมูลในอนาคต
        return NextResponse.json(
            { error: 'Not implemented yet' },
            { status: 501 }
        );
    } catch (error) {
        console.error('Error creating ward:', error);
        return NextResponse.json(
            { error: 'Failed to create ward', details: error.message },
            { status: 500 }
        );
    }
}