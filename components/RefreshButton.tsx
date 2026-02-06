

import Feather from '@expo/vector-icons/Feather';
import React from 'react';
import { Text, View } from 'react-native';
import { AppButton } from './ui/app-button';


const RefreshButton = ({ onPress, label }: { label: string, onPress: () => void }) => {

    return (
        <View
            className='flex-1 justify-center bg-background items-center gap-4'

        >
            <Text className='text-status-error text-sm font-poppins' >
                {label}
            </Text>
            <AppButton
                variant='outline'
                onPress={onPress}
                backgroundColor='orange'
                borderRadius={50}
                outline={true}
                width={'40%'}
                text='Try Again'
                icon={<Feather name='refresh-ccw' color='orange' size={20} />}
            />


        </View>
    );
}

export default RefreshButton
