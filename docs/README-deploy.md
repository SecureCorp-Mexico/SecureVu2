# docs.secure.vu — Documentation Deployment

Built with Docusaurus. Deploy to CloudPanel as a **Node.js** site.

## Build

```bash
cd docs/
npm install
npm run build
# Output: docs/build/
```

## CloudPanel Steps

1. Create a new site:
   - Domain: `docs.secure.vu`
   - Type: **Node.js**
   - Node version: 20.x
   - Document root: `/home/<user>/htdocs/docs.secure.vu`

2. Upload the entire `docs/` directory (or just `build/` if serving static).

3. If serving the pre-built static output directly (simplest):
   - Set document root to the `build/` subdirectory
   - Type can be **Static** — Docusaurus output is pure HTML/CSS/JS

4. Enable HTTPS (Let's Encrypt).

## Recommended: Serve as Static Site

After `npm run build`, the `build/` directory is fully static.
Upload only `build/` contents to the document root — no Node.js runtime needed.
