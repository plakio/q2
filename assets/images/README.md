# Workspace assets

Place static assets used by the Q2 application in this folder. They are
copied into the plugin build during `npm run build` so they ship with
releases.

## `q2-logo.png`

Default workspace icon shown when no custom cover/icon has been uploaded
through the workspace editor. Recommended specs:

- **Format:** PNG with a transparent background (or solid color)
- **Size:** 256×256 px (renders crisp at 1× and 2×)
- **Shape:** Square / 1:1 aspect ratio
- **Padding:** Keep roughly 10% padding around the mark so the icon does
  not crowd the 4px white border applied by the workspace summary styles

To replace the default logo, drop a new file at
`assets/images/q2-logo.png` and rebuild the plugin with `npm run build`.
The Q2 logo component (`Q2Logo` in `src/index.js`) loads the image from
`Q2_URL + 'assets/images/q2-logo.png'`.