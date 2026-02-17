module.exports = {
  apps: [{
    name: 'cfpm-backend',
    script: './server.js',
    instances: 1,
    exec_mode: 'cluster',
    env_production: {
      NODE_ENV: 'production',
      PORT: 5000
    },
    env_development: {
      NODE_ENV: 'development',
      PORT: 5000
    },
    error_file: './logs/pm2-error.log',
    out_file: './logs/pm2-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    // Gestion des erreurs
    min_uptime: '10s',
    max_restarts: 10,
    // Variables d'environnement de production
    env: {
      NODE_ENV: 'production'
    }
  }]
};
