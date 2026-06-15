/**
 * @file src/utils/colors.ts
 * @description Centralized color theme definitions for Ludo Game.
 * Theme: Gold & Red (Game Optimized)
 */

const colors = {
  light: {
    textPrimary: "#1F2937",
    textSecondary: "#4B5563",
    textTertiary: "#9CA3AF",
    textInvierte: "#FFFFFF",
    backgroundPrimary: "#FFFBEB", // Very pale gold tint
    backgroundSecondary: "#FFFFFF",
    backgroundTertiary: "#FEF3C7",
    primary: "#E31B23", // Bold Red
    primaryContent: "#FFFFFF",
    secondary: "#F5B81B", // Bright Gold
    secondaryContent: "#1F2937",
    buttonPrimary: "#E31B23",
    buttonSecondary: "#F5B81B",
    buttonGradient: ["#E31B23", "#F5B81B"] as const,
    tabBarInactive: "#FDE68A",
    tabBarActive: "#E31B23",
    iconDefault: "#6B7280",
    success: "#10B981",
    error: "#E31B23",
    warning: "#F59E0B",
    info: "#3B82F6",
  },
  dark: {
    textPrimary: "#FEF3C7", // Soft gold
    textSecondary: "#FDE68A",
    textTertiary: "#D4A373",
    textInvierte: "#111827",
    backgroundPrimary: "#0F0F0F", // Almost black (clean)
    backgroundSecondary: "rgba(19, 27, 28, 0.8)",
    backgroundTertiary: "#262626",
    primary: "#FF3B30", // Bright red (iOS-style but works)
    primaryContent: "#FFFFFF",
    secondary: "#F5B81B", // Gold
    secondaryContent: "#0F0F0F",
    buttonPrimary: "#FF3B30",
    buttonSecondary: "#F5B81B",
    buttonGradient: ["#FF3B30", "#9e221b"] as const,
    tabBarInactive: "#3F3F3F",
    tabBarActive: "#FF3B30",
    iconDefault: "#A1A1AA",
    success: "#34D399",
    error: "#FF453A",
    warning: "#FBBF24",
    info: "#60A5FA",
  },
};

export default colors;