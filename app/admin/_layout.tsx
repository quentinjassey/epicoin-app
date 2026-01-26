import { Stack } from 'expo-router';
import React from 'react';

export default function AdminLayout() {
    return (
        <Stack>
            <Stack.Screen name="index" options={{ title: 'Admin Dashboard', headerBackTitle: 'Wallet' }} />
            <Stack.Screen name="products" options={{ title: 'Manage Products' }} />
            <Stack.Screen name="users" options={{ title: 'Manage Users' }} />
            <Stack.Screen name="transactions" options={{ title: 'Transaction Logs' }} />
        </Stack>
    );
}
