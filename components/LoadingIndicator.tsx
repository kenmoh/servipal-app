import { ActivityIndicator, Text, View } from "react-native";


function LoadingIndicator({ label, size = 'large' }: { size?: 'large' | 'small', label?: string }) {


  return (
    <View
      className="flex-1 items-center justify-center bg-background"

    >
      <ActivityIndicator size={size} className="text-icon-default" />
      {label && <Text className="text-muted font-poppins-medium text-base">{label}</Text>}
    </View>
  );
}

export default LoadingIndicator;
