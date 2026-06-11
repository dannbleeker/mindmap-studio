// Self-contained HTML export: embed the map's SVG in a standalone document that
// opens anywhere, offline, with no dependencies. Pure + deterministic.

function escapeHtml(text: string): string {
  return text.replace(/[&<>]/g, (c) => (c === "&" ? "&amp;" : c === "<" ? "&lt;" : "&gt;"));
}

export function wrapSvgHtml(svg: string, title: string): string {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${escapeHtml(title)}</title>
<style>
  body { margin: 0; background: #faf9f5; font-family: ui-sans-serif, system-ui, sans-serif; }
  main { display: flex; justify-content: center; padding: 24px; }
  svg { max-width: 100%; height: auto; }
</style>
</head>
<body>
<main>${svg}</main>
</body>
</html>
`;
}
