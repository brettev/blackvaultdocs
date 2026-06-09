/** PM2 process for BlackVaultDocs Next.js SSR (Sites server). */
module.exports = {
  apps: [
    {
      name: 'blackvaultdocs-web',
      cwd: '/var/www/blackvaultdocs.com/frontend',
      script: 'node_modules/.bin/next',
      args: 'start -p 3013',
      env: {
        NODE_ENV: 'production',
        PORT: '3013',
        BVD_API_BASE: 'https://api.blackvaultdocs.com',
      },
      max_memory_restart: '1500M',
      autorestart: true,
    },
  ],
};
