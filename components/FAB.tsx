import Feather from '@expo/vector-icons/Feather';
import React from "react";
import { Pressable } from "react-native";

const FAB = ({
    onPress,
    icon,
    disabled,
}: {
    disabled?: boolean;
    icon?: React.ReactNode;
    onPress: () => void;
}) => {
    return (
        <Pressable
            className="bg-button-primary rounded-full absolute bottom-5 right-5 p-2 w-[50px] h-[50px] items-center justify-center"
            disabled={disabled}
            onPress={onPress}
            style={({pressed})=>[
                {opacity: pressed ? 0.5 : 1}
            ]}
        >
            {icon || <Feather name='send' color="white" size={25} />}
        </Pressable>
    );
};

export default FAB;
