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

const SAFE_FONTS = new Map([
  ["arial", "Arial, Helvetica, sans-serif"],
  ["verdana", "Verdana, Geneva, sans-serif"],
  ["tahoma", "Tahoma, Geneva, sans-serif"],
  ["courier new", '"Courier New", Courier, monospace'],
  ["georgia", "Georgia, serif"],
  ["times new roman", '"Times New Roman", Times, serif'],
  ["comic sans ms", '"Comic Sans MS", cursive, sans-serif'],
  ["trebuchet ms", '"Trebuchet MS", Helvetica, sans-serif'],
  ["impact", "Impact, Charcoal, sans-serif"],
  ["lucida console", '"Lucida Console", Monaco, monospace'],
]);

function sanitizeFontFamily(value) {
  if (!value) {
    return "";
  }
  const normalized = String(value).trim().toLowerCase();
  if (SAFE_FONTS.has(normalized)) {
    return SAFE_FONTS.get(normalized);
  }
  if (/^[a-z0-9\s,'-]{1,60}$/i.test(normalized)) {
    return normalized.replace(/"/g, "");
  }
  return "";
}

const SIZE_SCALE = {
  1: "0.75em",
  2: "0.875em",
  3: "1em",
  4: "1.125em",
  5: "1.25em",
  6: "1.5em",
};

function sanitizeFontSize(value) {
  const parsed = Number.parseInt(String(value).trim(), 10);
  if (!Number.isFinite(parsed)) {
    return "";
  }
  if (SIZE_SCALE[parsed]) {
    return SIZE_SCALE[parsed];
  }
  return "";
}

export function ubbToHtml(input) {
  let s = escapeHtml(input).replace(/\r\n|\r|\n/g, "<br>");

  // Simple pairs
  s = s.replace(/\[b\](.*?)\[\/b\]/gis, "<b>$1</b>");
  s = s.replace(/\[i\](.*?)\[\/i\]/gis, "<i>$1</i>");
  s = s.replace(/\[u\](.*?)\[\/u\]/gis, "<u>$1</u>");
  s = s.replace(/\[quote\](.*?)\[\/quote\]/gis, '<div class="smallfont">__________________<br>$1</div>');

  s = s.replace(/\[center\]([\s\S]*?)\[\/center\]/gi, '<div style="text-align:center">$1</div>');
  s = s.replace(/\[align=(left|right|center|justify)\]([\s\S]*?)\[\/align\]/gi, (_, align, inner) => {
    return `<div style="text-align:${align.toLowerCase()}">${inner}</div>`;
  });

  // [color=...]...[/color]
  s = s.replace(/\[color=([^\]]+)\]([\s\S]*?)\[\/color\]/gi, (_, c, inner) => {
    const col = sanitizeColor(c);
    return col ? `<span style="color:${col}">${inner}</span>` : inner;
  });

  // [font=...]...[/font]
  s = s.replace(/\[font=([^\]]+)\]([\s\S]*?)\[\/font\]/gi, (_, font, inner) => {
    const family = sanitizeFontFamily(font);
    return family ? `<span style="font-family:${family}">${inner}</span>` : inner;
  });

  // [size=...]...[/size]
  s = s.replace(/\[size=([^\]]+)\]([\s\S]*?)\[\/size\]/gi, (_, size, inner) => {
    const scaled = sanitizeFontSize(size);
    return scaled ? `<span style="font-size:${scaled}">${inner}</span>` : inner;
  });

  // Legacy shortcuts
  s = s.replace(/\[blue\]([\s\S]*?)\[\/blue\]/gi, '<span style="color:#000099">$1</span>');
  s = s.replace(/\[red\]([\s\S]*?)\[\/red\]/gi, '<span style="color:#990000">$1</span>');
  s = s.replace(/\[green\]([\s\S]*?)\[\/green\]/gi, '<span style="color:#009900">$1</span>');

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

