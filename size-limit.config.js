export default [
  {
    name: 'Core',
    path: 'dist/index.js',
    limit: '35 kB',
  },
  {
    name: 'CLI',
    path: 'dist/cli.js',
    limit: '30 kB',
  },
  {
    name: 'Adapters (Express)',
    path: 'dist/adapters/express.js',
    limit: '20 kB',
  },
  {
    name: 'Adapters (Hono)',
    path: 'dist/adapters/hono.js',
    limit: '10 kB',
  },
  {
    name: 'Adapters (Next.js)',
    path: 'dist/adapters/nextjs.js',
    limit: '8 kB',
  },
  {
    name: 'Adapters (Fastify)',
    path: 'dist/adapters/fastify.js',
    limit: '8 kB',
  },
  {
    name: 'React',
    path: 'dist/react/index.js',
    limit: '5 kB',
  },
]