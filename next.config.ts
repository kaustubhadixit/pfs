import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  // Security headers — applied to all routes.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          { key: "X-DNS-Prefetch-Control", value: "on" },
        ],
      },
    ];
  },
  experimental: {
    // Tree-shake barrel imports. lucide-react ships 1000+ icons; without this,
    // every admin page that imports a single icon could pull in much of the
    // barrel. recharts is a heavy chart lib (~400KB ungzipped) — tree-shaking
    // the named imports (LineChart, BarChart, etc.) drops the unused charts.
    optimizePackageImports: ["lucide-react", "recharts"],
  },
  webpack: (config, { isServer }) => {
    // The admin client bundles are large (patent-form.tsx 32KB,
    // data-requests-manager.tsx 23KB, leads-table.tsx 16KB, etc.). Splitting
    // vendor chunks keeps incremental dev rebuilds cheaper because react /
    // radix-ui / recharts land in stable chunks that webpack can reuse across
    // rebuilds instead of re-bundling them with app code on every change. We
    // only ADD cacheGroups (higher priority than the Next defaults) on top of
    // the existing splitChunks config so existing chunking still applies.
    if (!isServer) {
      config.optimization = config.optimization || {};
      const splitChunks = config.optimization.splitChunks;
      if (splitChunks && typeof splitChunks === "object") {
        splitChunks.cacheGroups = {
          ...splitChunks.cacheGroups,
          // One stable chunk for the heavy chart lib — shared between
          // marketplace detail-charts and admin analytics-dashboard.
          recharts: {
            name: "chunk-recharts",
            test: /[\\/]node_modules[\\/](recharts|d3-[a-z]+|victory-vendor)[\\/]/,
            chunks: "all",
            priority: 30,
          },
          // One stable chunk for radix primitives — used everywhere.
          radix: {
            name: "chunk-radix",
            test: /[\\/]node_modules[\\/]@radix-ui[\\/]/,
            chunks: "all",
            priority: 25,
          },
        };
      }
    }
    return config;
  },
};

export default nextConfig;
