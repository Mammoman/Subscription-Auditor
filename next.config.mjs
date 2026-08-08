/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Allow bank-statement PDFs up to 10 MB (default is 1 MB).
  experimental: {
    serverActions: { bodySizeLimit: "10mb" },
  },
};

export default nextConfig;
