/**
 * PostCSS configuration used by the frontend build.
 * This configuration includes the Tailwind CSS plugin, which allows for the use of Tailwind's utility-first CSS framework in the project.
 * The plugin is configured with an empty object, which means it will use the default Tailwind configuration.
 * Additional PostCSS plugins can be added to this configuration as needed for further CSS processing.
 */

export default {
  plugins: {
    '@tailwindcss/postcss': {},
  },
}
