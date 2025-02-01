'use client';
import { Box, Flex, Link, Button } from '@chakra-ui/react';
import NextLink from 'next/link';
import { usePathname } from 'next/navigation';

export default function Navigation() {
    const pathname = usePathname();

    const isActive = (path) => pathname === path;

    return (
        <Box bg="blue.500" py={4} px={8} color="white">
            <Flex justify="flex-start" align="center" gap={4}>
                <Link
                    as={NextLink}
                    href="/"
                    _hover={{ textDecoration: 'none' }}
                >
                    <Button
                        variant={isActive('/') ? "solid" : "ghost"}
                        colorScheme="whiteAlpha"
                        size="md"
                    >
                        บันทึกข้อมูล
                    </Button>
                </Link>
                <Link
                    as={NextLink}
                    href="/dashboard"
                    _hover={{ textDecoration: 'none' }}
                >
                    <Button
                        variant={isActive('/dashboard') ? "solid" : "ghost"}
                        colorScheme="whiteAlpha"
                        size="md"
                    >
                        Dashboard
                    </Button>
                </Link>
                <Link
                    as={NextLink}
                    href="/export"
                    _hover={{ textDecoration: 'none' }}
                >
                    <Button
                        variant={isActive('/export') ? "solid" : "ghost"}
                        colorScheme="whiteAlpha"
                        size="md"
                    >
                        Export ข้อมูล
                    </Button>
                </Link>
            </Flex>
        </Box>
    );
}

