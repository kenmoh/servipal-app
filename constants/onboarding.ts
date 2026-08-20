import laundry from "@/assets/images/anton.jpg";
import deliveryBike from "@/assets/images/delivery-bike.jpg";
import home from "@/assets/images/home.png";
import paymentBg from "@/assets/images/payment.jpg";
import restaurant from "@/assets/images/restaurant.jpg";
import shopping from "@/assets/images/shopping.jpg";

type Position = "top" | "bottom";

export const onboardingSlides = [
  {
    title: "Welcome to ServiPal",
    description:
      "Your one-stop app for item delivery, food ordering, laundry services, and secure online peer-to-peer shopping.",
    image: home,
    buttonLabel: "Continue",
    position: "top" as Position,
  },
  {
    title: "Quick & Reliable Delivery",
    description: "Send and receive packages with ease, anywhere, anytime.",
    image: deliveryBike,
    buttonLabel: "Continue",
    position: "bottom" as Position,
  },
  {
    title: "Delicious Meals at Your Doorstep",
    description:
      "Order from your favourite restaurants and enjoy fast, fresh food delivery.",
    image: restaurant,
    buttonLabel: "Continue",
    position: "top" as Position,
  },
  {
    title: "Laundry Services Made Simple",
    description:
      "Choose from a wide range of laundry services providers and have your clothes cleaned and delivered.",
    image: laundry,
    buttonLabel: "Continue",
    position: "bottom" as Position,
  },
  {
    title: "Safe & Secure Shopping",
    description:
      "Browse, buy, and sell items securely with confidence using our built-in escrow service. What you ordered is what you get! 😊",
    image: shopping,
    buttonLabel: "Continue",
    position: "top" as Position,
  },
  {
    title: "Secure Payments You Can Trust",
    description:
      "Make every transaction with confidence using Flutterwave’s trusted payment system. Your payments are protected with advanced security, ensuring fast, safe, and reliable checkout every time",
    image: paymentBg,
    buttonLabel: "Continue",
    position: "top" as Position,
  },
];
