module.exports = {
  apps: [{
    name: "konoha-bot",
    script: "start.js",
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: "500M",
    restart_delay: 10000,
    max_restarts: 10,
    min_uptime: "10s",
    env: {
      NODE_ENV: "development"
    },
    env_production: {
      NODE_ENV: "production"
    },
    error_file: "./logs/pm2-error.log",
    out_file: "./logs/pm2-out.log",
    log_file: "./logs/pm2-combined.log",
    time: true,
    log_date_format: "YYYY-MM-DD HH:mm:ss Z",
    merge_logs: true,
    cron_restart: "0 2 * * *"
  }]
};
