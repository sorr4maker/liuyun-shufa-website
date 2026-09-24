# 留云诗墨书法院官网

留云诗墨书法院的公开官网源码，用于展示书院环境、课程设置、师生作品、授课老师和联系方式。

## 技术结构

- 原生 HTML、CSS 和 JavaScript，无第三方运行时依赖。
- `index.html` 负责页面结构与 SEO 元数据。
- `assets/css/styles.css` 负责视觉与响应式布局。
- `assets/js/main.js` 负责页面切换、联系弹窗、作品预览和内容配置。

## 本地预览

```bash
python3 -m http.server 8000
```

然后访问 `http://127.0.0.1:8000/`。

## 内容更新

联系方式、地址、备案号与活动信息集中在 `assets/js/main.js` 顶部的 `CONFIG` 中维护。正式域名确定后，还需同步更新 `index.html`、`robots.txt` 和 `sitemap.xml` 中的站点地址。

作品和环境照片分别放在：

- `assets/images/works/`
- `assets/images/env/`
- `assets/images/teachers/`

## 上线前检查

- 填写真实 ICP 备案号；未备案时保持 `icpBeian` 为空。
- 确认正式域名和社交分享图。
- 核对电话、微信、地址与高德地图链接。
- 发布新照片前进行尺寸压缩，并补充准确的替代文本。
