import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'pesafy',
  description:
    'Type-safe M-PESA Daraja SDK for Node.js, Bun, Deno, Cloudflare Workers, and all JS frameworks.',
  lang: 'en-US',

  cleanUrls: true,
  lastUpdated: true,

  head: [
    ['link', { rel: 'icon', type: 'image/svg+xml', href: '/logo.svg' }],
    ['meta', { name: 'theme-color', content: '#f59e0b' }],
    ['meta', { property: 'og:type', content: 'website' }],
    ['meta', { property: 'og:title', content: 'pesafy — M-PESA Daraja SDK' }],
    [
      'meta',
      {
        property: 'og:description',
        content:
          'Type-safe M-PESA Daraja SDK for Node.js, Bun, Cloudflare Workers, Next.js, Fastify, Hono & Express.',
      },
    ],
    [
      'meta',
      {
        property: 'og:image',
        content: 'https://pesafy.vercel.app/og-image.png',
      },
    ],
  ],

  sitemap: {
    hostname: 'https://pesafy.vercel.app',
  },

  themeConfig: {
    logo: '/logo.svg',
    siteTitle: 'pesafy',

    nav: [
      { text: 'Guide', link: '/guide/', activeMatch: '/guide/' },
      { text: 'API Reference', link: '/api/', activeMatch: '/api/' },
      { text: 'Adapters', link: '/adapters/', activeMatch: '/adapters/' },
      {
        text: '0.5.1',
        items: [
          {
            text: 'Changelog',
            link: 'https://github.com/levos-snr/pesafy/releases',
          },
          {
            text: 'Contributing',
            link: 'https://github.com/levos-snr/pesafy/blob/main/CONTRIBUTING.md',
          },
        ],
      },
    ],

    sidebar: {
      '/guide/': [
        {
          text: 'Getting Started',
          items: [
            { text: 'Introduction', link: '/guide/' },
            { text: 'Installation', link: '/guide/installation' },
            { text: 'Quick Start', link: '/guide/quick-start' },
            { text: 'Configuration', link: '/guide/configuration' },
            { text: 'CLI', link: '/guide/cli' },
          ],
        },
        {
          text: 'Core Concepts',
          items: [
            { text: 'Error Handling', link: '/guide/error-handling' },
            { text: 'Webhooks & IP Verification', link: '/guide/webhooks' },
            { text: 'Branded Types', link: '/guide/branded-types' },
          ],
        },
      ],

      '/api/': [
        {
          text: 'API Reference',
          items: [
            { text: 'Overview', link: '/api/' },
            { text: 'STK Push (M-PESA Express)', link: '/api/stk-push' },
            { text: 'C2B — Customer to Business', link: '/api/c2b' },
            { text: 'B2C — Business to Customer', link: '/api/b2c' },
            { text: 'B2B Express Checkout', link: '/api/b2b' },
            { text: 'Account Balance', link: '/api/account-balance' },
            { text: 'Transaction Status', link: '/api/transaction-status' },
            { text: 'Transaction Reversal', link: '/api/reversal' },
            { text: 'Tax Remittance (KRA)', link: '/api/tax-remittance' },
            { text: 'Dynamic QR Code', link: '/api/dynamic-qr' },
            { text: 'Bill Manager', link: '/api/bill-manager' },
          ],
        },
      ],

      '/adapters/': [
        {
          text: 'Framework Adapters',
          items: [
            { text: 'Overview', link: '/adapters/' },
            { text: 'Express', link: '/adapters/express' },
            { text: 'Hono', link: '/adapters/hono' },
            { text: 'Next.js App Router', link: '/adapters/nextjs' },
            { text: 'Fastify', link: '/adapters/fastify' },
          ],
        },
      ],
    },

    search: {
      provider: 'local',
      options: {
        detailedView: true,
      },
    },

    outline: {
      level: [2, 3],
      label: 'On this page',
    },

    footer: {
      message: 'Released under the MIT License.',
      copyright: 'Copyright © 2026 Lewis Odero',
    },

    editLink: {
      pattern: 'https://github.com/levos-snr/pesafy/edit/main/docs/:path',
      text: 'Edit this page on GitHub',
    },

    lastUpdated: {
      text: 'Last updated',
      formatOptions: {
        dateStyle: 'short',
        timeStyle: 'short',
      },
    },

    docFooter: {
      prev: 'Previous',
      next: 'Next',
    },

    socialLinks: [
      { icon: 'github', link: 'https://github.com/levos-snr/pesafy' },
      { icon: 'npm', link: 'https://www.npmjs.com/package/pesafy' },
    ],

    externalLinkIcon: true,
  },

  markdown: {
    theme: {
      light: 'github-light',
      dark: 'github-dark',
    },
    lineNumbers: true,
  },
})
