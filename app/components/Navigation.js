'use client';
import { Box, Flex, Link, Button } from '@chakra-ui/react';
import NextLink from 'next/link';
import { usePathname } from 'next/navigation';

export default function Navigation() {
    const pathname = usePathname();

    const isActive = (path) => pathname === path;

    const navItems = [
        { path: '/', label: 'บันทึกข้อมูล' },
        { path: '/dashboard', label: 'Dashboard' },
        { path: '/export', label: 'Export ข้อมูล' },
    ];

    return (
        <Box bg="blue.500" py={4} px={8} color="white">
            <Flex justify="flex-start" align="center" gap={4}>
                {navItems.map((item) => (
                    <Link
                        key={item.path}
                        as={NextLink}
                        href={item.path}
                        _hover={{ textDecoration: 'none' }}
                    >
                        <Button
                            variant={isActive(item.path) ? "solid" : "ghost"}
                            colorScheme="whiteAlpha"
                            size="md"
                        >
                            {item.label}
                        </Button>
                    </Link>
                ))}
            </Flex>
        </Box>
    );
}
