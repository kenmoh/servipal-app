import * as Linking from 'expo-linking'
import { Text, View } from 'react-native'
import Feather from '@expo/vector-icons/Feather';
import { AppButton } from './ui/app-button';

// import { Linking } from 'react-native'

interface LocationPermissionProps {
    onRetry: () => void
}

const LocationPermission = ({ onRetry }: LocationPermissionProps) => {

    const handleOpenSettings = async () => {
        await Linking.openSettings()
    }


    return (
        <View
            className='bg-background  flex-1 justify-center items-center p-3 gap-4'

        >
            <Feather name="map-pin" size={50} color={'orange'} />
            <Text
                className='text-primary text-center text-lg font-poppins-bold'

            >
                Location Access Required
            </Text>
            <Text
                className='text-primary px-4 text-center text-sm font-poppins-regular'

            >
                Please enable location services to see available deliveries within 30km of your location
            </Text>
            <View className='gap-2 w-full px-6' >
                <AppButton
                    variant='outline'
                    borderRadius={50}
                    text='Open Settings'
                    onPress={handleOpenSettings}

                />

                <AppButton

                    onPress={onRetry}
                    text='Retry'
                    borderRadius={50}

                />

            </View>
        </View>
    )
}

export default LocationPermission