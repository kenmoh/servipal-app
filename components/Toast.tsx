// import { AlertCircle, CheckCircle, Info } from 'lucide-react-native';
import { Feather } from '@expo/vector-icons';
import React, { useEffect, useRef } from 'react';
import { Animated, Text, View } from 'react-native';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastProps {
    id?: string;
    title: string;
    message?: string;
    type?: ToastType;
    duration?: number;
    onDismiss?: () => void;
    customColor?: string;
    position?: 'top' | 'bottom';
}

const Toast: React.FC<ToastProps> = ({
    title,
    message,
    type = 'info',
    duration = 3000,
    onDismiss,
    customColor,
    position = 'top',
}) => {
    const slideAnim = useRef(new Animated.Value(-100)).current;
    const opacityAnim = useRef(new Animated.Value(0)).current;
    const mountedRef = useRef(true);

    const getToastColors = () => {
        if (customColor) return customColor;

        switch (type) {
            case 'success':
                return '#10B981'; // green-500
            case 'error':
                return '#EF4444'; // red-500
            case 'warning':
                return '#F59E0B'; // amber-500
            case 'info':
            default:
                return '#3B82F6'; // blue-500
        }
    };

    const getToastIcon = () => {
        const iconColor = '#FFFFFF';
        const iconSize = 20;

        switch (type) {
            case 'success':
                return <Feather name='alert-circle' color={iconColor} size={iconSize} />;
            case 'error':
                return <Feather name='check-circle' color={iconColor} size={iconSize} />;
            case 'warning':
                return <Feather name='info' color={iconColor} size={iconSize} />;
            case 'info':
            default:
                return <Feather name='info' color={iconColor} size={iconSize} />;
        }
    };

    useEffect(() => {
        mountedRef.current = true;

        // Animate in
        Animated.parallel([
            Animated.timing(slideAnim, {
                toValue: 0,
                duration: 300,
                useNativeDriver: true,
            }),
            Animated.timing(opacityAnim, {
                toValue: 1,
                duration: 300,
                useNativeDriver: true,
            }),
        ]).start();

        // Auto dismiss
        if (duration > 0) {
            const timer = setTimeout(() => {
                handleDismiss();
            }, duration);

            return () => {
                mountedRef.current = false;
                clearTimeout(timer);
            };
        }

        return () => {
            mountedRef.current = false;
        };
    }, [duration]);

    const handleDismiss = () => {
        // Don't animate or call onDismiss if component is unmounting
        if (!mountedRef.current) {
            return;
        }

        Animated.parallel([
            Animated.timing(slideAnim, {
                toValue: position === 'top' ? -100 : 100,
                duration: 250,
                useNativeDriver: true,
            }),
            Animated.timing(opacityAnim, {
                toValue: 0,
                duration: 250,
                useNativeDriver: true,
            }),
        ]).start(() => {
            // Double check mounted state before calling onDismiss
            if (mountedRef.current && onDismiss) {
                try {
                    onDismiss();
                } catch (error) {
                    console.warn('Toast onDismiss error:', error);
                }
            }
        });
    };

    return (
        <Animated.View
            style={{
                transform: [{ translateY: slideAnim }],
                position: 'absolute',
                top: position === 'top' ? 60 : undefined,
                bottom: position === 'bottom' ? 60 : undefined,
                left: 16,
                right: 16,
                zIndex: 9999,
            }}
        >
            <View
                className="bg-background rounded-xl p-4 flex-row items-start"
            >
                {/* Icon */}
                <View className="mr-3 mt-1">
                    {getToastIcon()}
                </View>

                {/* Content */}
                <View className="flex-1">
                    <Text
                        className="text-primary font-poppins-semibold text-base mb-1"
                    >
                        {title}
                    </Text>
                    {message && (
                        <Text
                            className="text-muted font-poppins text-xs leading-5"
                        >
                            {message}
                        </Text>
                    )}
                </View>
            </View>
        </Animated.View>
    );
};

export default Toast;
