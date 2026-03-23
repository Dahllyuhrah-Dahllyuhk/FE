/**
 * SVG → PNG 변환 스크립트
 * 실행: node public/icons/convert.mjs
 * 의존성: npm install sharp (FE 루트에서)
 */
import sharp from 'sharp';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

const files = [
  { input: 'icon-192.svg', output: 'icon-192.png', size: 192 },
  { input: 'icon-512.svg', output: 'icon-512.png', size: 512 },
];

for (const { input, output, size } of files) {
  await sharp(join(__dirname, input))
    .resize(size, size)
    .png()
    .toFile(join(__dirname, output));
  console.log(`✓ ${output} 생성 완료`);
}
