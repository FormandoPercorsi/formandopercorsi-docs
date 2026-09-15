import {themes as prismThemes} from 'prism-react-renderer';
import type {Config} from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';
import type * as OpenApiPlugin from 'docusaurus-plugin-openapi-docs';

// This runs in Node.js - Don't use client-side code here (browser APIs, JSX...)

const config: Config = {
  title: 'Formando PerCorsi',
  tagline: 'Documentazione tecnica e API',
  favicon: 'img/favicon.ico',

  future: {
    v4: true,
  },

  url: 'https://docs.formandopercorsi.com',
  baseUrl: '/',

  organizationName: 'FormandoPercorsi',
  projectName: 'formandopercorsi-docs',

  // Keep this at 'throw': a dead link in a guide is worse than a failed build.
  //
  // It does mean guides must not deep-link a per-tag API page (`/api/<tag>`) whose tag is not
  // yet in **production**. The two API trees are generated from two different live specs -- `/api`
  // from api.formandopercorsi.com, `/api-develop` from dev.api... (see scripts/fetch-openapi.js)
  // -- and a backend feature reaches dev well before prod, so `/api/<new-tag>` is missing while
  // `/api-develop/<new-tag>` is already there. The build then fails here, on a deploy, far from
  // the commit that added the link. sidebars.ts tolerates the same asymmetry on purpose (a tag
  // configured but absent from a tree is skipped, not an error); links have no such escape.
  //
  // So: name a new administrative area in prose and add its link only once it is live in
  // production.
  onBrokenLinks: 'throw',
  markdown: {
    hooks: {
      onBrokenMarkdownLinks: 'warn',
    },
  },

  i18n: {
    defaultLocale: 'it',
    locales: ['it'],
  },

  presets: [
    [
      'classic',
      {
        docs: {
          sidebarPath: './sidebars.ts',
          routeBasePath: '/',
          docItemComponent: '@theme/ApiItem',
          editUrl: 'https://github.com/FormandoPercorsi/formandopercorsi-docs/tree/master/',
        },
        blog: false,
        theme: {
          customCss: './src/css/custom.css',
        },
      } satisfies Preset.Options,
    ],
  ],

  plugins: [
    'docusaurus-plugin-sass',
    [
      'docusaurus-plugin-openapi-docs',
      {
        id: 'api',
        docsPluginId: 'classic',
        config: {
          production: {
            specPath: 'openapi/formandopercorsi.production.docs.yaml',
            outputDir: 'docs/api',
            sidebarOptions: {
              groupPathsBy: 'tag',
              categoryLinkSource: 'tag',
            },
          } satisfies OpenApiPlugin.Options,
          develop: {
            specPath: 'openapi/formandopercorsi.develop.docs.yaml',
            outputDir: 'docs/api-develop',
            sidebarOptions: {
              groupPathsBy: 'tag',
              categoryLinkSource: 'tag',
            },
          } satisfies OpenApiPlugin.Options,
        },
      },
    ],
  ],

  themes: ['docusaurus-theme-openapi-docs'],

  themeConfig: {
    image: 'img/social-card.png',
    colorMode: {
      defaultMode: 'light',
      respectPrefersColorScheme: true,
    },
    navbar: {
      title: 'Formando PerCorsi Docs',
      logo: {
        alt: 'Formando PerCorsi',
        src: 'img/brand/logoFPC.svg',
      },
      items: [
        {
          type: 'docSidebar',
          sidebarId: 'guidesSidebar',
          position: 'left',
          label: 'Guide',
        },
        {
          type: 'dropdown',
          label: 'API Reference',
          position: 'left',
          items: [
            {type: 'docSidebar', sidebarId: 'apiSidebar', label: 'Produzione (main)'},
            {type: 'docSidebar', sidebarId: 'apiDevSidebar', label: 'Sviluppo (develop)'},
          ],
        },
        {
          href: 'https://github.com/FormandoPercorsi',
          label: 'GitHub',
          position: 'right',
        },
      ],
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: 'Documentazione',
          items: [
            {label: 'Guide', to: '/intro'},
            {label: 'API Reference (produzione)', to: '/api/formando-percorsi-api'},
            {label: 'API Reference (sviluppo)', to: '/api-develop/formando-percorsi-api'},
          ],
        },
        {
          title: 'Progetto',
          items: [
            {label: 'GitHub', href: 'https://github.com/FormandoPercorsi'},
          ],
        },
      ],
      copyright: `© ${new Date().getFullYear()} FPC DIDATTICA 4.0 S.R.L.`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
