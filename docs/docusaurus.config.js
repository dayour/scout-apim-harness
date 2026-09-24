const lightCodeTheme = require('prism-react-renderer').themes.github;
const darkCodeTheme = require('prism-react-renderer').themes.dracula;

const config = {
  title: 'Scout APIM Harness',
  tagline: 'Teams relay, manifest generation, configuration, deployment, and operations',
  url: 'https://dayour.github.io',
  baseUrl: '/scout-apim-harness/',
  organizationName: 'dayour',
  projectName: 'scout-apim-harness',
  deploymentBranch: 'master',
  onBrokenLinks: 'throw',
  favicon: 'img/favicon.svg',
  headTags: [
    {
      tagName: 'script',
      attributes: {},
      innerHTML: `(() => {
  const requested = new URLSearchParams(window.location.search).get("clawpilotTheme");
  const param = requested === "dark" || requested === "light" ? requested : null;
  const theme =
    param || (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
  if (param) {
    try {
      window.localStorage.setItem("theme", param);
    } catch {}
    document.documentElement.setAttribute("data-theme-choice", param);
  }
  document.documentElement.setAttribute("data-theme", theme);
})();`,
    },
    {
      tagName: 'meta',
      attributes: {
        name: 'description',
        content: 'Production documentation for Scout APIM Harness configuration, relay operations, Teams manifest generation, deployment, and security.',
      },
    },
  ],
  markdown: {
    hooks: {
      onBrokenMarkdownLinks: 'throw',
    },
  },
  presets: [
    [
      'classic',
      {
        docs: {
          routeBasePath: '/',
          sidebarPath: require.resolve('./sidebars.js'),
          editUrl: 'https://github.com/dayour/scout-apim-harness/edit/master/docs/',
          showLastUpdateAuthor: false,
          showLastUpdateTime: true,
        },
        blog: false,
        theme: {
          customCss: require.resolve('./src/css/custom.css'),
        },
        sitemap: {
          changefreq: 'weekly',
          priority: 0.6,
          filename: 'sitemap.xml',
        },
      },
    ],
  ],
  themeConfig: {
    colorMode: {
      defaultMode: 'light',
      respectPrefersColorScheme: true,
      disableSwitch: false,
    },
    navbar: {
      title: 'Scout APIM Harness',
      items: [
        { to: '/', label: 'Overview', position: 'left' },
        { to: '/configuration', label: 'Configuration', position: 'left' },
        { to: '/relay', label: 'Relay', position: 'left' },
        { to: '/teams-manifest', label: 'Teams package', position: 'left' },
        {
          href: 'https://github.com/dayour/scout-apim-harness',
          label: 'GitHub',
          position: 'right',
        },
      ],
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: 'Operate',
          items: [
            { label: 'Deployment', to: '/deployment' },
            { label: 'Operations', to: '/operations' },
          ],
        },
        {
          title: 'Reference',
          items: [
            { label: 'Architecture', to: '/architecture' },
            { label: 'Configuration', to: '/configuration' },
          ],
        },
        {
          title: 'Project',
          items: [
            { label: 'GitHub repository', href: 'https://github.com/dayour/scout-apim-harness' },
            { label: 'Report an issue', href: 'https://github.com/dayour/scout-apim-harness/issues' },
          ],
        },
      ],
      copyright: `Copyright ${new Date().getFullYear()} Scout APIM Harness contributors.`,
    },
    prism: {
      theme: lightCodeTheme,
      darkTheme: darkCodeTheme,
      additionalLanguages: ['bash', 'json', 'powershell'],
    },
    tableOfContents: {
      minHeadingLevel: 2,
      maxHeadingLevel: 4,
    },
  },
};

module.exports = config;
