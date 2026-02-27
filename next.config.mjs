/** @type {import('next').NextConfig} */
const nextConfig = {
  // standalone 모드: Docker 이미지 크기 대폭 감소 (node_modules 불필요)
  output: 'standalone',

  // 프로덕션 빌드에서 타입 오류 노출 (개발 품질 유지)
  typescript: {
    ignoreBuildErrors: false,
  },

  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'k.kakaocdn.net' },
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
    ],
  },

  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-DNS-Prefetch-Control', value: 'on' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
        ],
      },
    ];
  },
};

export default nextConfig;
