export const formatNumberInput = (value: string | number): string => {
  if (!value && value !== 0) return "";

  if (typeof value === "number") {
    return value.toFixed(2);
  }

  return value.toString();
};
