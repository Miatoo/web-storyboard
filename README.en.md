# Web Storyboard · Shot Editing Tool

A lightweight, ready-to-use storyboard editor: manage shots, pose 3D characters, draw annotations, use AI image generation, and export in multiple formats.  
As long as you have Node.js installed, you can run it locally with no extra setup.

---

## Features at a glance

- **Shot management**: Organize a list of shots, with support for add, duplicate, reorder, and more
- **3D posing**: Drag 3D characters and tweak the camera to quickly block out compositions
- **Annotation drawing**: Pen, arrows, text, and other markup tools
- **AI image generation**: Plug in your own image-generation API to turn sketches into rendered images
- **Export**: Export to JSON, CSV, image ZIP, or PDF for sharing and archiving

---

## Quick start (local)

1. **Prerequisites**

   - Install [Node.js 16+](https://nodejs.org/) (18+ recommended)

2. **Clone and install dependencies**

   ```bash
   git clone https://github.com/Miatoo/web-storyboard.git
   cd web-storyboard
   npm install
   ```

3. **Start the dev server**

   ```bash
   npm run dev
   ```

   You should see something like:

   ```text
   VITE v5.x.x  ready in xxx ms
     ➜  Local:   http://localhost:5173/
   ```

4. **Open in the browser**

   - Visit `http://localhost:5173`
   - You can now create storyboards, edit 3D poses, draw annotations, and export your work

> Note: By default, project data only lives in your current browser session and in the files you export. Nothing is uploaded to any server.

---

## Build & deploy as a static site (optional)

If you want to host this tool on your own server or any static hosting:

1. In the project root, run:

   ```bash
   npm run build
   ```

2. Deploy the contents of the `dist` directory to any static host:

   - GitHub Pages
   - Vercel / Netlify
   - Nginx / Apache / other static servers

Once deployed, open the corresponding domain to use the tool. The experience should be essentially the same as running locally.

---

## AI image generation configuration (optional)

This tool does *not* ship with a built-in AI service. You can connect any compatible image-generation API:

1. Click **“Settings”** in the top-right corner of the app  
2. In **“AI Image Generation”**, fill in:
   - **API URL**: Your image-generation endpoint
   - **API Key**: The key for that endpoint
   - **Model name**: An identifier for your model (for display and records)
3. Save the settings, then use the **AI Image** view to generate images via your configured API

All of these settings are stored only in the browser (`localStorage`) and are **not** committed to the repository.

---

## Project structure (overview)

```text
web_storyboard/
├── src/              # Frontend React app source
├── public/           # Static assets (3D models, etc.)
├── api/              # Optional backend example (Express + SQLite), not required by default
├── index.html        # Vite entry HTML
└── package.json      # Dependencies and scripts
```

---

## Tech stack

- React 18 + TypeScript + Vite
- Three.js (3D posing)
- Zustand (state management)
- Tailwind CSS (styling)


---

## Acknowledgements & inspiration

- Overall concepts and some interaction patterns are inspired by the open-source project **Storyboarder**:  
  `https://github.com/wonderunit/storyboarder/releases`
- Some 3D models and pose data used in this project are adapted from resources bundled with Storyboarder, for learning and personal creative use only.

---

## License & usage

- This project is provided as **fully open source**. You are free to:
  - Fork it to your own repository
  - Modify the code and add/remove features
  - Integrate and use it in personal or commercial projects
- If you use this code or assets in your own project, a short attribution (for example, a link back to this repository) is appreciated but not required.

