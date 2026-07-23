module.exports = {
  apps: [
    {
      name: 'backend',
      cwd: './apps/backend',
      script: 'dist/main.js',
      interpreter: 'node',
      env: {
        NODE_ENV: 'production',
        PORT: '3001',
      },
      env_file: '../../.env',
      max_restarts: 10,
      restart_delay: 3000,
    },
    {
      name: 'frontend',
      cwd: './apps/frontend',
      script: 'node_modules/next/dist/bin/next',
      args: 'start -p 3100',
      interpreter: 'node',
      env: {
        NODE_ENV: 'production',
      },
      env_file: '../../.env',
      max_restarts: 10,
      restart_delay: 3000,
    },
  ],
};
