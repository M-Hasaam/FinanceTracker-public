export default () => ({
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3001', 10),

  google: {
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    redirectUri: process.env.GOOGLE_REDIRECT_URI,
  },

  jwt: {
    secret: process.env.INTERNAL_JWT_SECRET,
  },

  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
  },

  database: {
    url: process.env.DATABASE_URL,
  },

  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  },
});
