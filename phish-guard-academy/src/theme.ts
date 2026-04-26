/**
 * Shared theme tokens used across frontend UI components.
 * This file defines a centralized theme object that includes color palettes, font families, and spacing values. These tokens can be imported and used by various UI components to ensure a consistent look and feel throughout the application.
 * It includes the following responsibilities:
 * - Defining a color palette with primary, success, warning, danger, and dark colors.
 * - Specifying font families for headings and body text.
 * - Setting standardized spacing values for margins and padding.
 * - Providing a single source of truth for design tokens to promote consistency and maintainability.
 */

export const theme = {
  colors: {
    primary: {
      50: "#f0f9ff",
      500: "#0ea5e9",
      600: "#0284c7",
      900: "#0c2d57",
    },
    success: "#10b981",
    warning: "#f59e0b",
    danger: "#ef4444",
    dark: {
      50: "#f9fafb",
      900: "#111827",
    },
  },
  fonts: {
    heading: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI'",
    body: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI'",
  },
  spacing: {
    xs: "0.25rem",
    sm: "0.5rem",
    md: "1rem",
    lg: "1.5rem",
    xl: "2rem",
    "2xl": "3rem",
  },
};