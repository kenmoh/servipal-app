export const formatNumberInput = (value: string | number): string => {
  if (!value && value !== 0) return "";

  if (typeof value === "number") {
    return value.toFixed(2);
  }

  return value.toString();
};

export function formatReservationDate(isoString: string): string {
  const date = new Date(isoString);
  const day = date.toLocaleDateString("en-US", { weekday: "short" });
  const dateNum = date.getDate();
  const month = date.toLocaleDateString("en-US", { month: "long" });
  return `${day} ${dateNum} ${month}`;
}
