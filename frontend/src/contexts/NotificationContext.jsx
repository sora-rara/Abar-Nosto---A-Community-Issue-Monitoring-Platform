import React, { createContext, useContext, useEffect, useState } from 'react';
import io from 'socket.io-client';
import API from '../services/api';   // ← added to fetch initial unread count

export const NotificationContext = createContext();

export const useNotifications = () => {
    const context = useContext(NotificationContext);
    if (!context) {
        throw new Error('useNotifications must be used within a NotificationProvider');
    }
    return context;
};

export const NotificationProvider = ({ children }) => {
    const [socket, setSocket] = useState(null);
    const [latestNotification, setLatestNotification] = useState(null);
    const [unreadCount, setUnreadCount] = useState(0);
    const [toastNotification, setToastNotification] = useState(null);
    const token = localStorage.getItem('token');

    // 1. Connect to Socket.IO and listen for live notifications
    useEffect(() => {
        if (!token) {
            if (socket) {
                socket.close();
                setSocket(null);
            }
            return;
        }

        const socketUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';
        const newSocket = io(socketUrl, {
            auth: { token },
            transports: ['websocket']
        });

        newSocket.on('connect', () => console.log('🔌 Socket connected'));

        newSocket.on('notification', (notification) => {
            console.log('📢 New notification:', notification);
            setLatestNotification(notification);
            setUnreadCount(prev => prev + 1);
            setToastNotification(notification);
        });

        newSocket.on('disconnect', () => console.log('🔌 Socket disconnected'));

        setSocket(newSocket);
        return () => newSocket.close();
    }, [token]);

    // 2. Load unread count from the server on mount (so badge isn't always zero)
    useEffect(() => {
        if (!token) return;
        (async () => {
            try {
                const res = await API.get('/notifications?limit=100');
                const unread = res.data.data.filter(n => !n.read).length;
                setUnreadCount(unread);
            } catch (err) {
                console.error('Failed to fetch unread count', err);
            }
        })();
    }, [token]);

    const resetUnreadCount = () => setUnreadCount(0);
    const clearToast = () => setToastNotification(null);

    return (
        <NotificationContext.Provider value={{
            socket,
            latestNotification,
            unreadCount,
            resetUnreadCount,
            toastNotification,
            clearToast
        }}>
            {children}
        </NotificationContext.Provider>
    );
};