import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    formats: ["image/webp", "image/avif"],
  },
  // Fail build if content validation fails
  webpack: undefined,
};

export default nextConfig;
