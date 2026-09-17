import type { NextConfig } from "next";
import path from "node:path";

// Domain の Date ベースの暦日計算を、ホストOSのタイムゾーンから分離する。
// package scripts を経由しない起動経路でも、Next.js がアプリを読み込む前に固定する。
process.env.TZ = "Asia/Tokyo";

const nextConfig: NextConfig = {
  outputFileTracingRoot: path.join(__dirname, "../../.."),
  experimental: {
    externalDir: true,
  },
  webpack(config) {
    config.resolve.extensionAlias = {
      ...config.resolve.extensionAlias,
      ".js": [".ts", ".js"],
      ".jsx": [".tsx", ".jsx"],
    };
    return config;
  },
};

export default nextConfig;
