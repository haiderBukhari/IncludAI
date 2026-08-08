import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // ffmpeg-static exports a filesystem path to its binary; letting webpack
  // bundle it rewrites that path to somewhere inside .next/, which then
  // doesn't exist at spawn time. Keep it external so Node resolves it normally.
  serverExternalPackages: ["ffmpeg-static"],
};

export default nextConfig;
