// 脚本：生成静态 albums 数据文件
// 在 package.json 的 build 脚本之前运行

import { albums } from '../src/data/albums.ts';
import fs from 'fs';
import path from 'path';

const outputPath = path.resolve(process.cwd(), 'src/data/albums.static.ts');

const content = `// 这个文件由 scripts/generate-albums-data.js 自动生成
// 不要在浏览器端使用 albums.ts（包含 Node.js 模块），应该使用这个文件
// 生成时间: ${new Date().toISOString()}

export interface Song {
  title: string;
  duration: string;
  file: string;
  isRecommended: boolean;
}

export interface Album {
  id: string;
  title: string;
  artist: string;
  cover: string;
  description: string;
  recommended: string[];
  songs: Song[];
}

// 静态 albums 数据
export const albums: Album[] = ${JSON.stringify(albums, null, 2)};
`;

fs.writeFileSync(outputPath, content, 'utf-8');
console.log(`✓ Generated ${outputPath} with ${albums.length} albums`);
