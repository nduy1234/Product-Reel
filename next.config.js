/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "export",   // static export for Butterbase deployment
  images: {
    unoptimized: true, // required for static export
    remotePatterns: [
      { protocol: "https", hostname: "**.bytepluses.com" },
      { protocol: "https", hostname: "**.volccdn.com" },
      { protocol: "https", hostname: "**.byteimg.com" },
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "**.pexels.com" },
      { protocol: "https", hostname: "**.atlascloud.ai" },
      { protocol: "https", hostname: "**" },
    ],
  },
};

module.exports = nextConfig;
