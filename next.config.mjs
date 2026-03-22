/** @type {import('next').NextConfig} */

// 프로덕션 빌드 시 필수 환경변수 누락 검증
if (process.env.NODE_ENV === 'production' && !process.env.NEXT_PUBLIC_API_BASE) {
  throw new Error(
    '[Build Error] NEXT_PUBLIC_API_BASE 환경변수가 설정되지 않았습니다. 프로덕션 빌드에는 필수입니다.'
  );
}

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
    const isDev = process.env.NODE_ENV === 'development';
    const apiBase = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8080';

    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-DNS-Prefetch-Control', value: 'on' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          ...(!isDev ? [
            { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
          ] : []),
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: https://k.kakaocdn.net https://lh3.googleusercontent.com",
              `connect-src 'self' ${apiBase} https://kauth.kakao.com https://kapi.kakao.com`,
              "font-src 'self'",
              "frame-ancestors 'none'",
            ].join('; '),
          },
        ],
      },
    ];
  },
};

export default nextConfig;
