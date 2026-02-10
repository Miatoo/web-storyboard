# 分镜编辑工具 · Web Storyboard

一个开箱即用的分镜编辑小工具：支持分镜管理、3D 姿势、标注绘制、AI 生图和多种格式导出。  
只要有 Node.js，就可以本地跑起来使用，不需要额外配置。

---
<img width="1920" height="911" alt="image" src="https://github.com/user-attachments/assets/8cec45cc-fe17-42ad-9ef4-206c91ebbd2c" />

## 功能一览

- 📝 **分镜管理**：按镜头管理 shot 列表，支持添加、复制、重排等
- 🎭 **3D 姿势编辑**：拖拽 3D 角色、调整相机，快速搭出画面
- ✏️ **标注绘制**：画笔、箭头、文字等标注工具
- 🤖 **AI 生图**：可接入你自己的图片生成接口，将草图变成成图
- 📤 **导出**：支持导出 JSON、CSV、图片 ZIP、PDF，方便分享与归档

---

## 本地快速使用

1. **准备环境**

- 安装 [Node.js 16+](https://nodejs.org/)（推荐 18+）

2. **克隆并安装依赖**

```bash
git clone https://github.com/你的用户名/web-storyboard.git
cd web-storyboard
npm install
```

3. **启动开发服务器**

```bash
npm run dev
```

终端出现类似输出：

```text
VITE v5.x.x  ready in xxx ms
  ➜  Local:   http://localhost:5173/
```

4. **打开浏览器**

- 访问 `http://localhost:5173`
- 现在就可以开始创建分镜、编辑 3D 姿势、绘制标注以及导出了

> 提示：项目数据默认只存在当前浏览器会话和你导出的文件中，不会上传到任何服务器。

---

## 构建并部署静态站点（可选）

如果你想把这个工具放到自己的服务器或静态空间：

1. 在项目根目录执行：

```bash
npm run build
```

2. 将 `dist` 目录里的文件部署到任意静态托管：

- GitHub Pages
- Vercel / Netlify
- Nginx / Apache / 其他静态服务器

部署完成后，访问对应域名即可使用，与本地体验基本一致。

---

## AI 生图配置（可选）

工具本身不绑定任何具体 AI 服务，你可以接入任意兼容的图片生成接口：

1. 在应用右上角点击 **“设置”**  
2. 在 “AI 生图配置” 中填写：
   - **API 地址**：你的图片生成接口 URL  
   - **API Key**：对应接口的密钥  
   - **模型名称**：你的模型标识（用于提示和记录）  
3. 保存后，即可在 “AI 生图” 视图中使用该接口生成图片

所有这些配置都只保存在本地浏览器（`localStorage`），不会提交到仓库。

---

## 目录结构（简要）

```text
web_storyboard/
├── src/              # 前端 React 应用源码
├── public/           # 静态资源（3D 模型等）
├── api/              # 可选的后端示例（Express + SQLite），默认不必使用
├── index.html        # Vite 入口 HTML
└── package.json      # 依赖与脚本
```

## 主要技术栈

- React 18 + TypeScript + Vite
- Three.js（3D 姿势编辑）
- Zustand（状态管理）
- Tailwind CSS（样式）

---

## 致谢与灵感来源

- 本项目的整体思路与部分交互设计，受到开源项目 **Storyboarder** 的启发：  
  `https://github.com/wonderunit/storyboarder/releases`
- 项目中使用的部分 3D 模型与角色动作（pose）数据，参考并整理自 Storyboarder 附带资源，仅用于学习与个人创作场景。

---

## 开源许可与使用方式

- 本项目以**完全开源**的方式提供，你可以自由地：
  - fork 到自己的仓库
  - 修改代码、增删功能
  - 在个人或商业项目中集成和使用
- 如果你在自己的项目中使用了这里的代码或资源，欢迎在说明文档里简单标注来源。
