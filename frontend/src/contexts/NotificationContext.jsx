import React, { createContext, useContext, useEffect, useState } from 'react'; // ✅ added useContext
import io from 'socket.io-client';

export const NotificationContext = createContext();

// ✅ Define and export the hook
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

    useEffect(() => {
        if (!token) {
            if (socket) {
                socket.close();
                setSocket(null);
            }
            return;
        }

        const newSocket = io('http://localhost:5000', {
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