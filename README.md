# 杂谈 #T001

一个只刊登《杂谈 #T001》的独立 Vite 页面。使用原始 Markdown，配有十张原文照片和《坏结局》背景音乐。

## 本地运行

```sh
npm install
npm run dev
```

## 构建

```sh
npm run build
npm run preview
```

`dist/` 是可部署的静态页面，包含照片与音乐。页面支持部署到子目录，可通过 `npm run build -- --base=/your-path/` 设置路径。

## 内容与资源

- 文章直接读取根目录的 `杂谈 #T001.md`，保留原文内容和照片顺序。
- `Attachments/` 保留原始照片；`public/images/` 存放网页使用的 WebP 版本。
- 修改照片后运行 `npm run prepare:images`，重新生成图片和资源清单。
- 音乐位于 `public/audio/bad-ending.mp3`，复制自 `/Users/syyann/projects/curve-react/public/bgm/【坏结局】.mp3`。用户最初指定的 `/Users/syyann/projects/3D/【坏结局】.mp3` 在本机不存在。
- 字体优先使用 Noto Sans SC 与 Noto Serif SC，网络不可用时使用系统中文字体。

页面打开时会尝试有声自动播放并循环。浏览器若阻止自动播放，首次点击页面或点击音乐播放按钮即可继续。可随时暂停或静音。
