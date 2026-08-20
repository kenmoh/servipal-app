export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat("en-NG", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
};

export const formatDistanceAndTime = (
  distance: number,
  duration: number
): { distance: number; duration: number } => {
  const distanceInKm = Number((distance / 1000).toFixed(2));
  const durationInMin = Number(Math.floor(duration / 60).toFixed(2));
  return { distance: distanceInKm, duration: durationInMin };
};
