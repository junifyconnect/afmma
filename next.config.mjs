/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // tsx + ESM 시나리오와 호환되도록 .js import를 .ts/.tsx로 resolve.
  turbopack: {
    resolveExtensions: ['.tsx', '.ts', '.jsx', '.js', '.mjs', '.json'],
    resolveAlias: {},
  },
  webpack(config) {
    // Webpack 빌드(프로덕션) 경로 — Turbopack과 동일하게 .js → .ts/.tsx 매핑
    config.resolve.extensionAlias = {
      '.js': ['.ts', '.tsx', '.js'],
      '.jsx': ['.tsx', '.jsx'],
    };
    return config;
  },
};

export default nextConfig;
