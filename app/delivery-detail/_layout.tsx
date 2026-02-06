import { Stack } from "expo-router";

const DeliveryDetailLayout = () => {
  return (
    <Stack>
      <Stack.Screen
        name="[id]"
        options={{
          headerShown: false,
          animation: "fade_from_bottom",
        }}
      />
    </Stack>
  );
};

export default DeliveryDetailLayout;
