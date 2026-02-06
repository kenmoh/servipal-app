import { HEADER_BG_DARK, HEADER_BG_LIGHT } from '@/constants/theme'
import { Stack, useLocalSearchParams } from 'expo-router'
import React from 'react'
import {
    Image,
    ScrollView,
    Text,
    useColorScheme,
    View
} from 'react-native'


const ProductOrder = () => {
    const { price, name, quantity, sizes, image } = useLocalSearchParams()

    // const selectedColors: string[] = JSON.parse(colors as string[])


    const theme = useColorScheme();

    return (
        <>
            {/* Header */}
            <Stack.Screen
                options={{
                    title: 'Purchase Summary',
                    headerShadowVisible: false,
                    headerTintColor: theme === 'dark' ? '#fff' : '#000',
                    headerTitleStyle: {
                        fontFamily: 'Poppins-Medium',

                    },
                    headerStyle: {
                        backgroundColor: theme === 'dark' ? HEADER_BG_DARK : HEADER_BG_LIGHT,

                    },

                }}
            />

            <ScrollView className="bg-background flex-1" contentContainerStyle={{ paddingBottom: 20 }}>
                <View className="p-4 gap-4 flex-1">
                    {/* Product Summary Card */}
                    <View className="bg-input rounded-xl p-4">
                        <View className="flex-row space-x-4">
                            {/* Product Image */}
                            <View className="w-20 h-20 rounded-lg overflow-hidden">

                                <Image
                                    source={{ uri: image as string }}
                                    className="w-full h-full"
                                    resizeMode="cover"
                                />

                            </View>

                            {/* Product Details */}
                            <View className="flex-1 space-y-2 ml-5">
                                <Text className="text-lg text-primary font-poppins" numberOfLines={2}>
                                    {name}
                                </Text>

                                <Text className="text-xl font-bold text-orange-600 font-poppins-bold">
                                    {price}
                                </Text>
                            </View>
                        </View>
                    </View>

                    {/* Selection Details */}
                    <View className="bg-input rounded-xl p-4  space-y-4">
                        <Text className="text-lg font-semibold text-primary font-poppins">Your Selection</Text>

                        {/* Sizes */}
                        {sizes && (
                            <View className="space-y-2 mt-3">
                                <Text className="text-sm font-medium text-primary font-poppins">Sizes</Text>
                                <View className="flex-row flex-wrap gap-2">
                                    {JSON.parse(sizes as string).map((size: string, index: number) => (
                                        <View key={index} className="bg-orange-100 rounded-lg px-3 py-1">
                                            <Text className="text-sm font-medium text-orange-700">{size.toUpperCase()}</Text>
                                        </View>
                                    ))}
                                </View>
                            </View>
                        )}

                    </View>

                    {/* Additional Information */}
                    <View className="bg-input rounded-xl p-4  space-y-3">
                        <Text className="text-lg font-semibold text-primary font-poppins">Delivery Information</Text>
                        <Text className="text-sm text-gray-500 font-poppins-light mb-1">
                            Provide your delivery address and any special instructions you may have.

                        </Text>

                    </View>

                    {/* Price Breakdown */}
                    <View className="rounded-xl p-4  bg-input space-y-3">
                        <Text className="text-lg font-semibold text-primary font-poppins">Price Breakdown</Text>

                        <View className="space-y-2">
                            <View className="flex-row justify-between items-center font-poppins-light">
                                <Text className="text-sm text-muted font-poppins-light">Unit Price</Text>
                                <Text className="text-sm text-muted">{price}</Text>
                            </View>

                            <View className="flex-row justify-between items-center">
                                <Text className="text-sm font-poppins-light text-muted">Quantity</Text>
                                <Text className="text-sm text-muted font-poppins-light">{quantity}</Text>
                            </View>

                            <View className="border-t border-gray-600 pt-2">
                                <View className="flex-row justify-between items-center">
                                    <Text className="text-lg font-bold text-primary">Total</Text>
                                    <Text className="text-2xl font-bold text-orange-600">
                                        {quantity}
                                    </Text>
                                </View>
                            </View>
                        </View>
                    </View>



                    {/* Status */}


                    <View className="flex-row justify-between items-center mt-3">

                        <Text className="text-sm text-gray-600 ml-2">Status</Text>
                        <Text className="text-sm text-gray-600 ml-2">Pending</Text>
                    </View>




                </View>
            </ScrollView>

        </>
    )
}

export default ProductOrder