/** @type {import('next').NextConfig} */
const nextConfig = {
  // standalone 모드: Docker 이미지 크기 대폭 감소 (node_modules 불필요)
  output: 'standalone',

  // 프로덕션 빌드에서 타입/ESLint 오류 노출 (개발 품질 유지)
  eslint: {
    ignoreDuringBuilds: false,
  },
  typescript: {
    ignoreBuildErrors: false,
  },

  images: {
    // 외부 이미지 도메인 허용 목록 (unoptimized 대신 명시적 허용)
    remotePatterns: [
      { protocol: 'https', hostname: 'k.kakaocdn.net' },
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
    ],
  },

  // 보안 헤더 (Next.js 레벨)
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
