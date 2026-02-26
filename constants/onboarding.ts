// import rider from "@/assets/images/3dbike.jpg";
import rider from "@/assets/images/3dbike.png";
import hand from "@/assets/images/3dhand.png";
import linen from "@/assets/images/3dlinen.png";
import food from "@/assets/images/food3d.png";
import payment from "@/assets/images/payment.png";

type Position = "top" | "bottom";

export const onboardingSlides = [
  {
    title: "Welcome to ServiPal",
    description:
      "Your one-stop app for item delivery, food ordering, laundry services, and secure online peer-to-peer shopping.",
    image: hand,
    buttonLabel: "Continue",
    position: "top" as Position,
  },
  {
    title: "Quick & Reliable Delivery",
    description: "Send and receive packages with ease, anywhere, anytime.",
    image: rider,
    buttonLabel: "Continue",
    position: "bottom" as Position,
  },
  {
    title: "Delicious Meals at Your Doorstep",
    description:
      "Order from your favourite restaurants and enjoy fast, fresh food delivery.",
    image: food,
    buttonLabel: "Continue",
    position: "top" as Position,
  },
  {
    title: "Laundry Services Made Simple",
    description:
      "Choose from a wide range of laundry services providers and have your clothes cleaned and delivered.",
    image: linen,
    buttonLabel: "Continue",
    position: "bottom" as Position,
  },
  {
    title: "Safe & Secure Shopping",
    description:
      "Browse, buy, and sell items securely with confidence using our built-in escrow service. What you ordered is what you get! 😊",
    image: payment,
    buttonLabel: "Continue",
    position: "top" as Position,
  },
];
