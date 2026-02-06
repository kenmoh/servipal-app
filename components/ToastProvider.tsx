import React, { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { View } from 'react-native';
import Toast, { ToastProps } from './Toast';

interface ToastContextType {
    showToast: (toast: Omit<ToastProps, 'onDismiss'>) => void;
    showSuccess: (title: string, message?: string, duration?: number) => void;
    showError: (title: string, message?: string, duration?: number) => void;
    showWarning: (title: string, message?: string, duration?: number) => void;
    showInfo: (title: string, message?: string, duration?: number) => void;
    dismissToast: (id: string) => void;
    dismissAllToasts: () => void;
}

interface ToastItem extends ToastProps {
    id: string;
}

const ToastContext = createContext<ToastContextType | null>(null);

interface ToastProviderProps {
    children: ReactNode;
    maxToasts?: number;
}

export const ToastProvider: React.FC<ToastProviderProps> = ({
    children,
    maxToasts = 3
}) => {


    const [toasts, setToasts] = useState<ToastItem[]>([]);
    const mountedRef = useRef(true);
    const toastsRef = useRef<ToastItem[]>([]);

    useEffect(() => {
        mountedRef.current = true;
        return () => {
            mountedRef.current = false;
            // Immediately clear toasts to prevent render issues during unmount
            setToasts([]);
            toastsRef.current = [];
        };
    }, []);

    // const [toasts, setToasts] = useState<ToastItem[]>([]);
    // const mountedRef = useRef(true);

    // useEffect(() => {
    //     return () => {
    //         mountedRef.current = false;
    //     };
    // }, []);

    const generateId = useCallback(() => Math.random().toString(36).substr(2, 9), []);

    const showToast = useCallback((toast: Omit<ToastProps, 'onDismiss'>) => {
        if (!mountedRef.current) return;

        const id = toast.id || generateId();
        const newToast: ToastItem = { ...toast, id };

        // Use a try-catch to prevent errors during unmount
        try {
            setToasts((prevToasts) => {
                if (!mountedRef.current) return prevToasts;

                let updatedToasts = [...prevToasts, newToast];

                if (updatedToasts.length > maxToasts) {
                    updatedToasts = updatedToasts.slice(-maxToasts);
                }

                toastsRef.current = updatedToasts;
                return updatedToasts;
            });
        } catch (error) {
            // Silently ignore errors during unmount
            console.warn('Toast update failed (component may be unmounting):', error);
        }
    }, [generateId, maxToasts]);

    const showSuccess = useCallback((title: string, message?: string, duration: number = 4000) => {
        showToast({
            title,
            message,
            type: 'success',
            duration,
        });
    }, [showToast]);

    const showError = useCallback((title: string, message?: string, duration: number = 5000) => {
        showToast({
            title,
            message,
            type: 'error',
            duration,
        });
    }, [showToast]);

    const showWarning = useCallback((title: string, message?: string, duration: number = 4000) => {
        showToast({
            title,
            message,
            type: 'warning',
            duration,
        });
    }, [showToast]);

    const showInfo = useCallback((title: string, message?: string, duration: number = 4000) => {
        showToast({
            title,
            message,
            type: 'info',
            duration,
        });
    }, [showToast]);

    const dismissToast = useCallback((id: string) => {
        if (!mountedRef.current) return;

        try {
            setToasts((prevToasts) => {
                if (!mountedRef.current) return prevToasts;
                const filtered = prevToasts.filter((toast) => toast.id !== id);
                toastsRef.current = filtered;
                return filtered;
            });
        } catch (error) {
            // Silently ignore errors during unmount
            console.warn('Toast dismiss failed (component may be unmounting):', error);
        }
    }, []);

    const dismissAllToasts = useCallback(() => {
        if (!mountedRef.current) return;

        try {
            setToasts([]);
            toastsRef.current = [];
        } catch (error) {
            // Silently ignore errors during unmount
            console.warn('Toast dismiss all failed (component may be unmounting):', error);
        }
    }, []);

    // const dismissToast = useCallback((id: string) => {
    //     if (!mountedRef.current) return;
    //     setToasts((prevToasts) => prevToasts.filter((toast) => toast.id !== id));
    // }, []);

    // const dismissAllToasts = useCallback(() => {
    //     setToasts([]);
    // }, []);

    const value = useMemo<ToastContextType>(() => ({
        showToast,
        showSuccess,
        showError,
        showWarning,
        showInfo,
        dismissToast,
        dismissAllToasts,
    }), [showToast, showSuccess, showError, showWarning, showInfo, dismissToast, dismissAllToasts]);

    return (
        <ToastContext.Provider value={value}>
            {children}
            <View style={{ position: 'absolute', top: 0, left: 0, right: 0 }}>
                {toasts.map((toast, index) => (
                    <View
                        key={toast.id}
                        style={{
                            transform: [{ translateY: index * 80 }],
                        }}
                    >
                        <Toast
                            {...toast}
                            onDismiss={() => dismissToast(toast.id)}
                        />
                    </View>
                ))}
            </View>
        </ToastContext.Provider>
    );
};

export const useToast = (): ToastContextType => {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error('useToast must be used within a ToastProvider');
    }
    return context;
};

export default ToastProvider;



// Warning: TypeError: Cannot read property 'props' of undefined

// This error is located at:

//   25 |
//   26 | export const ToastProvider: React.FC<ToastProviderProps> = ({
// > 27 |     children,
//      |             ^
//   28 |     maxToasts = 3
//   29 | }) => {
//   30 |

// Call Stack
//   ToastProvider (components/ToastProvider.tsx:27:13)
//   NetworkProvider (components/NetworkProvider.tsx:8:43)
//   NotificationProvider (components/NotificationProvider.tsx:40:11)
//   RNGestureHandlerRootView (<anonymous>)
//   KeyboardControllerView (<anonymous>)
//   RootLayout (app/_layout.tsx:51:37)
//   RootApp(./_layout.tsx) (<anonymous>)
//   RNCSafeAreaProvider (<anonymous>)
//   App (<anonymous>)
//   ErrorOverlay (<anonymous>)
