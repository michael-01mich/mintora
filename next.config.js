/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=86400" }]
      }
    ];
  }
};

module.exports = nextConfig;
