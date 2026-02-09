// 这个文件在构建时由 generate-albums-data.js 自动生成
// 不要在浏览器端使用 albums.ts，应该使用这个文件

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

// 静态数据，将在构建时填充
export const albums: Album[] = [];
