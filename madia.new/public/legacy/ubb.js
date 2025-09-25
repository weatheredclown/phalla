// Minimal, safe UBB/BBCode renderer for legacy posts
// Escapes HTML, then selectively allows a subset of tags

export function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function sanitizeColor(value) {
  const v = String(value).trim();
  if (/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(v)) return v;
  if (/^(?:rgb|hsl)a?\(/i.test(v)) return ""; // disallow complex fn colors
  if (/^[a-zA-Z]{1,20}$/.test(v)) return v; // basic color names
  return "";
}

function sanitizeUrl(url) {
  const u = String(url).trim();
  if (/^https?:\/\//i.test(u)) return u;
  return "";
}

export function ubbToHtml(input) {
  let s = escapeHtml(input).replace(/\r\n|\r|\n/g, "<br>");

  // Simple pairs
  s = s.replace(/\[b\](.*?)\[\/b\]/gis, "<b>$1</b>");
  s = s.replace(/\[i\](.*?)\[\/i\]/gis, "<i>$1</i>");
  s = s.replace(/\[u\](.*?)\[\/u\]/gis, "<u>$1</u>");
  s = s.replace(/\[quote\](.*?)\[\/quote\]/gis, '<div class="smallfont">__________________<br>$1</div>');

  // [color=...]...[/color]
  s = s.replace(/\[color=([^\]]+)\]([\s\S]*?)\[\/color\]/gi, (_, c, inner) => {
    const col = sanitizeColor(c);
    return col ? `<span style="color:${col}">${inner}</span>` : inner;
  });

  // [url]...[/url] and [url=...]text[/url]
  s = s.replace(/\[url\]([^\[]+?)\[\/url\]/gi, (_, u) => {
    const href = sanitizeUrl(u);
    return href ? `<a href="${href}" target="_blank" rel="noopener noreferrer">${href}</a>` : u;
  });
  s = s.replace(/\[url=([^\]]+)\]([\s\S]*?)\[\/url\]/gi, (_, u, text) => {
    const href = sanitizeUrl(u);
    return href ? `<a href="${href}" target="_blank" rel="noopener noreferrer">${text}</a>` : text;
  });

  // [img]...[/img]
  s = s.replace(/\[img\]([^\[]+?)\[\/img\]/gi, (_, u) => {
    const src = sanitizeUrl(u);
    return src ? `<img src="${src}" alt="" loading="lazy">` : "";
  });

  // [spoiler]...[/spoiler] -> collapsible
  s = s.replace(/\[spoiler\]([\s\S]*?)\[\/spoiler\]/gi, (_, inner) => {
    return (
      '<div class="smallfont"><b>Spoiler:</b></div>' +
      '<div style="border:1px dashed gray; padding:4px;">' +
      '<details><summary class="button" style="display:inline-block;margin:4px 0;">show/hide</summary>' +
      `<div style="margin:8px 0;">${inner}</div>` +
      '</details></div>'
    );
  });

  return s;
}

