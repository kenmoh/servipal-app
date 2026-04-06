// hooks/useColorScheme.ts
import { useTheme } from "./theme-toggle";

export function useColorScheme() {
  const { colorScheme } = useTheme();
  return colorScheme ?? "light";
}
