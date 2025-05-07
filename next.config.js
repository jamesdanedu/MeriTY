/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable middleware
  skipMiddlewareUrlNormalize: false,
  skipTrailingSlashRedirect: false,
  
  // Add redirects
  async redirects() {
    return [
      {
        source: '/',
        destination: '/dashboard',
        permanent: false,
      }
    ]
  }
};

module.exports = nextConfig;