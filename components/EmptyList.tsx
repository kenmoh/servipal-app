import { router, type Href } from "expo-router";
import React from "react";
import { Text, View } from "react-native";

interface EmptyListProps {
    title: string;
    description: string;
    buttonTitle?: string;
    buttonAction?: () => void;
    route?: Href;
}

const EmptyList = ({
    title,
    description,
    buttonAction,
    route,
}: EmptyListProps) => {

    const handlePress = () => {
        if (buttonAction) {
            buttonAction();
            return;
        }
        if (route) {
            router.push(route);
        }
    };

    return (
        <View className="flex-1 justify-center items-center bg-background self-center">
            <View className="flex-1 justify-center mt-10 items-center gap-4 p-4">
                <Text className="text-primary font-poppins-semibold text-2xl text-center">
                    {title}
                </Text>
                <Text className="text-muted text-lg text-center font-poppins-light">
                    {description}
                </Text>
                {/* <View className="">
                    <AppVariantButton borderRadius={50} label={buttonTitle} onPress={handlePress} />
                </View> */}
            </View>
        </View>
    );
};

export default EmptyList;
