/** @type {import('next').NextConfig} */
const nextConfig = {
  // Explicitly disable middleware
  skipMiddlewareUrlNormalize: true,
  skipTrailingSlashRedirect: true,
  
  // Add redirects
  async redirects() {
    return [
      {
        source: '/',
        destination: '/login',
        permanent: false,
      }
    ]
  }
};

module.exports = nextConfig;