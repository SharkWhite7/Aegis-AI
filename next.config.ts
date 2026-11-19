import type { NextConfig } from "next";

/* STATIC_EXPORT=1 emits a plain directory of HTML/CSS/JS so the site can be
   published anywhere. Cache Components is a server-render feature and has
   nothing to do once there is no server, so it is off in that mode. */
const isExport = process.env.STATIC_EXPORT === "1";

const nextConfig: NextConfig = {
  ...(isExport ? { output: "export" as const } : {}),
  cacheComponents: !isExport,
  partialPrefetching: !isExport,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
