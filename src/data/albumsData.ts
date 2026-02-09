import { albums } from './albums';

// 这个文件将 albums 数据序列化为静态 JSON，供浏览器端使用
export const albumsData = JSON.parse(JSON.stringify(albums));

// 导出类型
export type { Album, Song } from './albums';
