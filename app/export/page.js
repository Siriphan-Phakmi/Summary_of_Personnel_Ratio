// File: app/export/page.js
'use client';
import { useState } from 'react';
import { fetchStaffRecords, formatDataForExcel, exportToExcel } from '../../lib/exportData';
import { Box, Button, VStack, Heading, Text, useToast, Spinner } from '@chakra-ui/react';
import Navigation from '../components/Navigation';

export default function ExportPage() {
    const [isExporting, setIsExporting] = useState(false);
    const toast = useToast();

    const handleExport = async () => {
        try {
            setIsExporting(true);
            
            // ดึงข้อมูล
            const records = await fetchStaffRecords();
            
            // ตรวจสอบข้อมูลว่างเปล่า
            if (records.length === 0) {
                throw new Error('ไม่พบข้อมูลที่จะส่งออก');
            }

            // จัดรูปแบบและส่งออก
            const formattedData = formatDataForExcel(records);
            const fileName = `รายงานอัตรากำลัง_${new Date().toLocaleDateString('th-TH')}.xlsx`;
            exportToExcel(formattedData, fileName);

            // แจ้งเตือนสำเร็จ
            toast({
                title: "สำเร็จ!",
                description: "ส่งออกไฟล์ Excel แล้ว",
                status: "success",
                duration: 5000,
                isClosable: true,
            });

        } catch (error) {
            // แจ้งเตือนข้อผิดพลาด
            toast({
                title: "เกิดข้อผิดพลาด",
                description: error.message || 'ไม่สามารถส่งออกข้อมูลได้',
                status: "error",
                duration: 5000,
                isClosable: true,
            });
        } finally {
            setIsExporting(false);
        }
    };

    return (
        <>
            <Navigation />
            <Box p={8} maxW="800px" mx="auto">
                <VStack spacing={6} align="stretch">
                    <Heading size="xl" color="blue.600">📤 Export ข้อมูล</Heading>
                    
                    <Text fontSize="lg">
                        ส่งออกข้อมูลทั้งหมดเป็นไฟล์ Excel สำหรับการทำรายงาน
                    </Text>

                    <Button 
                        colorScheme="green" 
                        size="lg" 
                        onClick={handleExport}
                        isLoading={isExporting}
                        loadingText="กำลังประมวลผล..."
                        leftIcon={<Spinner size="sm" />}
                    >
                        ดาวน์โหลดไฟล์ Excel
                    </Button>
                </VStack>
            </Box>
        </>
    );
}