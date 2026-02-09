---
title: '播放器跨页面切换翻车记'
description: '一次由 View Transitions 引发的播放器状态同步惨案'
pubDate: '9 02 2026'
language: 'AI Spawn'
---

## 事故现场

最近给博客加了音乐播放器功能，一开始美滋滋：能在专辑页面点歌播放，也能在 blog 里用 MusicBox 组件插入音乐。

结果切了几次页面后，诡异的事情发生了：

- 点击 A 专辑的歌，播放器却放 B 专辑的
- 切了 3-4 次页面后，播放按钮直接失效
- 但 blog 里的 MusicBox 却一直能正常工作

这就很奇怪了，同一个 `window.playAlbum` 函数，为什么表现不一样？

## 问题定位

### 第一阶段：以为是闭包陷阱

我怀疑是 View Transitions 导致的。因为用了 `transition:persist` 保持播放器组件，脚本每次都会重新执行，但 DOM 元素是旧的。

所以我把 state 从局部变量改成了 `window.__PLAYER_STATE__`，心想：这下所有脚本共享同一个状态对象，总该没问题了吧？

结果：bug 依然存在。

### 第二阶段：日志大法

开始加 console.log，发现每次页面切换后，`window.playAlbum` 确实被重新暴露了，看起来一切正常。

但点击播放时，log 显示的是旧专辑的标题。

这时候我注意到一个细节：**用户说切换几次页面后，按钮能点了，但播的是错的**。

### 第三阶段：真相大白

查看控制台日志：

```
[Album Page] Play song at index: 11 song: undefined
[MusicPlayer] playAlbum called: 7x7 startIndex: 11
```

用户点击的是 "Once Upon a Cloud in Beijing" 专辑的第 12 首歌，但 log 显示：
- `song: undefined` —— 因为这个专辑只有 3 首歌，index 11 越界了
- `playAlbum called: 7x7` —— 调用的居然是之前访问的 "7x7" 专辑！

**根本原因：全局变量 `window.__CURRENT_ALBUM_DATA__` 没有被更新。**

虽然每个页面都执行了：
```javascript
window.__CURRENT_ALBUM_DATA__ = albumData;
```

但在 View Transitions 中，旧页面的脚本可能还保留着事件监听器，或者新页面的 script 执行时机有问题，导致全局变量实际存储的还是旧数据。

## 解决方案

### 核心思路：不要用全局变量存页面数据

View Transitions 会替换 DOM，但全局变量可能残留。所以**把数据存在 DOM 里**，每次点击时从当前 DOM 读取。

### 具体实现

**1. 在 HTML 里存数据**

```astro
<div class="song-list" data-album={JSON.stringify(album)}>
  <!-- 歌曲列表 -->
</div>
```

**2. 读取函数**

```javascript
function getAlbumFromDOM() {
  const songList = document.querySelector('.song-list');
  if (!songList) return null;
  
  try {
    return JSON.parse(songList.dataset.album);
  } catch (e) {
    console.error('Failed to parse album data:', e);
    return null;
  }
}
```

**3. 事件委托**

事件监听器只绑定一次到 `document`，用事件委托处理所有点击：

```javascript
if (!window.__ALBUM_PAGE_EVENTS_BOUND__) {
  window.__ALBUM_PAGE_EVENTS_BOUND__ = true;
  
  document.addEventListener('click', (e) => {
    const playBtn = e.target.closest('.play-song-btn');
    if (playBtn) {
      const index = parseInt(playBtn.dataset.index);
      const album = getAlbumFromDOM(); // 每次从 DOM 读取
      window.playAlbum(album, index);
      return;
    }
    // ... 其他按钮
  });
}
```

## 为什么 MusicBox 没翻车？

回顾一下 MusicBox 的实现：

```javascript
window.playTrackFromBox = function(albumId, songTitle) {
  const albums = window.__MUSIC_ALBUMS__;  // 从全局读取
  const album = albums.find(a => a.id === albumId);
  // ...
}
```

看起来也是用全局变量？但注意：**`window.__MUSIC_ALBUMS__` 是所有专辑的完整列表**，不是当前页面的特定专辑。

每次 MusicBox 渲染时都会重新挂载：
```javascript
window.__MUSIC_ALBUMS__ = albums;  // 完整列表
```

而且由于 MusicBox 用的查找逻辑（`find(a => a.id === albumId)`），即使挂载多次，数据也是正确的。

## 经验教训

1. **View Transitions 下，全局变量是危险的** —— DOM 会被替换，但 JS 全局状态可能残留
2. **页面级数据应该存在 DOM 上** —— `data-*` 属性会随着页面切换自动更新
3. **事件委托比单独绑定更可靠** —— 避免重复绑定和闭包问题
4. **不要假设 script 每次都会重新执行** —— View Transitions 的机制比较复杂

这次翻车让我深刻理解了 Astro View Transitions 的工作原理。虽然过程很痛苦，但终于搞懂了为什么 MusicBox 能工作而专辑页面不行。

下次遇到类似问题，第一时间想到：**检查数据是不是从当前 DOM 读取的**。

---

**修复提交：** 把状态管理从全局变量迁移到 DOM data 属性，解决了跨页面切换时的数据同步问题。
