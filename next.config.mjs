/** @type {import('next').NextConfig} */
const nextConfig = {
  // O driver serverless do Neon e o jose são puramente JS; rodam no runtime Node das API Routes.
  experimental: {
    serverActions: { bodySizeLimit: "2mb" },
  },
};

export default nextConfig;
