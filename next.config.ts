import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["oracledb"],
  allowedDevOrigins: [
    "http://localhost:3001",
    "http://localhost:3000",
    "http://192.168.56.1:3000",
    "http://192.168.56.1:3001",
    "http://192.168.13.98:3001",
    "http://DESKTOP-59KIBBL:3001"
  ],
  reactStrictMode: false,

  // ✅ تجاهل أخطاء TypeScript أثناء البناء
  typescript: {
    ignoreBuildErrors: true,
  },

  webpack: (config, { isServer, dev }) => {
    if (!isServer) {
      config.resolve.alias = {
        ...config.resolve.alias,
        canvas: false,
      };
      config.resolve.fallback = {
        ...config.resolve.fallback,
        canvas: false,
        fs: false,
        path: false,
        stream: false,
        crypto: false,
        os: false,        // ✅ إضافة
        util: false,      // ✅ إضافة
        assert: false,    // ✅ إضافة
        http: false,      // ✅ إضافة
        https: false,     // ✅ إضافة
        url: false,       // ✅ إضافة
        zlib: false,      // ✅ إضافة
      };
    }

    if (dev) {
      config.watchOptions = {
        poll: 5000,
        aggregateTimeout: 3000,
        ignored: [
          '**/node_modules/**',
          '**/.next/**',
          '**/public/**',
          '**/*.bak',
          '**/*.pdf',
          '**/*.docm',
          '**/*.docx',
          '**/*.xlsx',
          '**/*.jpg',
          '**/*.jpeg',
          '**/*.png',
          '**/*.gif',
          '**/*.ico',
          '**/*.svg',
          '**/.git/**',
          '**/.vscode/**',
          '**/temp/**',
          '**/logs/**',
          '**/*.log',
          '**/coverage/**',
          '**/dist/**',
        ],
      };

      config.infrastructureLogging = {
        level: 'error',
      };
    }

    config.externals = [...(config.externals || []), { canvas: "canvas" }];
    return config;
  },

  turbopack: {
    resolveAlias: {
      canvas: './empty-module.js',
    },
  },
};

export default nextConfig;