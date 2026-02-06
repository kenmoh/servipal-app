import { useEffect, useRef } from "react";
import Swiper from "react-native-swiper";

/**
 * Custom hook to handle Swiper component cleanup and prevent ViewPager recycling issues
 *
 * This hook provides:
 * - A ref for the Swiper component
 * - Automatic cleanup on component unmount to prevent crashes during navigation
 * - Stops autoplay and clears pending timeouts
 *
 * @returns {React.RefObject<Swiper>} A ref object to attach to your Swiper component
 *
 * @example
 * ```typescript
 * const swiperRef = useSwiperCleanup();
 *
 * return (
 *   <Swiper ref={swiperRef} autoplay>
 *     // Your swiper content
 *   </Swiper>
 * );
 * ```
 */
export const useSwiperCleanup = () => {
  const swiperRef = useRef<Swiper>(null);

  useEffect(() => {
    // Cleanup function to run when component unmounts
    return () => {
      if (swiperRef.current) {
        try {
          // Stop autoplay to prevent memory leaks and crashes
          swiperRef.current.scrollTo(0, false);

          // Additional safety measures if the Swiper has these methods
          // @ts-ignore - These methods might not be in the type definitions
          if (typeof swiperRef.current.stopAutoplay === "function") {
            swiperRef.current.stopAutoplay();
          }

          // @ts-ignore - Clear any pending timeouts
          if (typeof swiperRef.current.clearTimeout === "function") {
            swiperRef.current.clearTimeout();
          }
        } catch (error) {
          console.warn("Error during Swiper cleanup:", error);
        }
      }
    };
  }, []);

  return swiperRef;
};

export default useSwiperCleanup;
