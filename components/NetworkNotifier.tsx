import { useEffect, useRef } from 'react';

import { useNetwork } from './NetworkProvider';
import { useToast } from './ToastProvider';

export function NetworkNotifier() {
    const { isConnected } = useNetwork();
    const shown = useRef(false);
    const { showWarning } = useToast()

    useEffect(() => {
        if (!isConnected && !shown.current) {
            showWarning("Network Issue", "Your internet connection is poor or lost.")
            shown.current = true;
        } else if (isConnected && shown.current) {
            shown.current = false;
        }
    }, [isConnected]);

    return null;
} 