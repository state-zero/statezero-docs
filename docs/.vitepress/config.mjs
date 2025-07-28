import { defineConfig } from "vitepress";

// https://vitepress.dev/reference/site-config
export default defineConfig({
  title: "StateZero",
  description:
    "StateZero - unified reactive state for Python backends and modern JS SPAs",
  themeConfig: {
    // https://vitepress.dev/reference/default-theme-config
    nav: [
      { text: "Home", link: "/" },
      { text: "Getting Started", link: "/getting-started" },
    ],

    sidebar: [
      {
        text: "Getting Started",
        items: [
          { text: "Introduction", link: "/getting-started" },
          { text: "Bolt.new Quickstart", link: "/bolt-new-quickstart" },
        ],
      },
      {
        text: "Core Features",
        items: [
          { text: "ORM", link: "/orm" },
          { text: "Authentication", link: "/authentication" },
          { text: "Permissions", link: "/permissions" },
          { text: "Custom Querysets", link: "/custom-querysets" },
          { text: "Live Querysets", link: "/live-querysets" },
        ],
      },
      {
        text: "Advanced Features",
        items: [
          { text: "Automatic Query Optimization", link: "/query-optimization" },
          { text: "Search", link: "/search" },
          { text: "Files", link: "/files" },
          { text: "Additional Fields", link: "/additional-fields" },
        ],
      },
      {
        text: "Customization",
        items: [
          { text: "Hooks", link: "/hooks" },
          { text: "Error Handling", link: "/errors" },
        ],
      },
    ],

    socialLinks: [
      { icon: "pypi", link: "https://pypi.org/project/statezero/" },
      { icon: "npm", link: "https://www.npmjs.com/package/@statezero/core" },
    ],
  },
});
