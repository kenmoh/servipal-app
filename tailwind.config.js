/** @type {import('tailwindcss').Config} */
module.exports = {
  // NOTE: Update this to include the paths to all files that contain Nativewind classes.
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        // Surface Colors
        surface: "var(--color-surface-default)",
        "surface-elevated": "var(--color-surface-elevated)",
        "surface-profile": "var(--color-surface-profile)",

        // Background Colors
        background: "var(--color-background-default)",

        // Profile Card Colors
        "profile-card": "var(--color-profile-card-default)",
        input: "var(--color-input-default)",

        // Primary Brand Colors
        "brand-primary": "var(--color-brand-primary)",
        "brand-secondary": "var(--color-brand-secondary)",
        "brand-accent": "var(--color-brand-accent)",

        // Text Colors
        primary: "var(--color-text-primary)",
        secondary: "var(--color-text-secondary)",
        muted: "var(--color-text-muted)",

        // Interactive Elements
        "icon-default": "var(--color-icon-default)",
        "tab-inactive": "var(--color-tab-inactive)",

        // Borders
        "border-subtle": "var(--color-border-subtle)",

        // Bottom Sheet
        "bottom-sheet": "var(--color-bottom-sheet)",

        // Button Colors
        "button-primary": "var(--color-button-primary)",
        "button-primary-transparent": "var(--color-button-primary-transparent)",

        // Status Colors
        "status-error": "var(--color-status-error)",
        "status-error-subtle": "var(--color-status-error-subtle)",
        "status-success": "var(--color-status-success)",
        "status-success-subtle": "var(--color-status-success-subtle)",
        "status-pending": "var(--color-status-pending)",
        "status-pending-subtle": "var(--color-status-pending-subtle)",
        "status-delivered": "var(--color-status-delivered)",
        "status-delivered-subtle": "var(--color-status-delivered-subtle)",
      },
    },
    fontFamily: {
      poppins: ["Poppins-Regular"],
      "poppins-medium": ["Poppins-Medium"],
      "poppins-bold": ["Poppins-Bold"],
      "poppins-thin": ["Poppins-Thin"],
      "poppins-light": ["Poppins-Light"],
      "poppins-semibold": ["Poppins-SemiBold"],
    },
  },
  plugins: [],
};
