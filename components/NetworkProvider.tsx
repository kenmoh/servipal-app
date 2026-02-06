import React, { createContext, useContext, useEffect, useState } from 'react';
import NetInfo from '@react-native-community/netinfo';

const NetworkContext = createContext({ isConnected: true });

export const useNetwork = () => useContext(NetworkContext);

export const NetworkProvider = ({ children }: { children: React.ReactNode }) => {
    const [isConnected, setIsConnected] = useState(true);

    useEffect(() => {
        const unsubscribe = NetInfo.addEventListener(state => {
            setIsConnected(!!state.isConnected && !!state.isInternetReachable);
        });
        return () => unsubscribe();
    }, []);

    return (
        <NetworkContext.Provider value={{ isConnected }}>
            {children}
        </NetworkContext.Provider>
    );
}; 