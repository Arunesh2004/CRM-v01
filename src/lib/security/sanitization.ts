/**
 * Validates that an input does not contain malicious HTML/Script tags.
 * In a real Next.js app, React automatically handles XSS in rendering,
 * but this is useful for sanitizing raw database inputs (e.g. CRM notes).
 *
 * NOTE: This escapes ALL HTML and is only appropriate for plain-text fields.
 * For rich email body content use sanitizeEmailHtml() below.
 */
export function sanitizeHtml(input: string): string {
  // A simple architectural scaffold. In production, use DOMPurify or xss package.
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

/**
 * Sanitizes untrusted HTML email body content using DOMPurify.
 *
 * TRUST MODEL: bodyHtml is treated as UNTRUSTED.  It originates from
 * user-authored compose forms and may also arrive via external email
 * providers.  It must never be rendered without sanitization.
 *
 * ALLOWED: paragraph, heading, bold/italic/underline, ordered/unordered
 *   lists, table, blockquote, inline images (data-URI / external src),
 *   hyperlinks with http/https/mailto schemes, inline CSS style attrs.
 *
 * BLOCKED: <script>, event-handler attrs (onerror, onclick, etc.),
 *   javascript: URLs, <iframe>, <object>, <embed>, <form>, <input>,
 *   <base>, <meta>, SVG foreignObject, and any other active-content
 *   mechanism that can execute arbitrary JavaScript.
 *
 * Use this function at every trust boundary where bodyHtml is stored
 * (inbox.actions.ts) so that the rendering layer (MailInterface,
 * mail/[id]/page.tsx) receives pre-sanitized content only.
 */
export function sanitizeEmailHtml(input: string): string {
  // isomorphic-dompurify works in both Node (via jsdom) and browser environments.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const createDOMPurify = require('isomorphic-dompurify');
  const DOMPurify = typeof createDOMPurify === 'function' ? createDOMPurify() : createDOMPurify;

  return DOMPurify.sanitize(input, {
    // Only allow safe HTML elements for formatted email content.
    ALLOWED_TAGS: [
      'a', 'b', 'blockquote', 'br', 'caption', 'code', 'col', 'colgroup',
      'dd', 'del', 'details', 'div', 'dl', 'dt', 'em', 'figcaption', 'figure',
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'hr', 'i', 'img', 'ins',
      'kbd', 'li', 'mark', 'ol', 'p', 'pre', 'q', 's', 'samp',
      'small', 'span', 'strong', 'sub', 'summary', 'sup',
      'table', 'tbody', 'td', 'tfoot', 'th', 'thead', 'time', 'tr', 'u', 'ul', 'var',
    ],
    // Only allow safe attributes. Event handlers (on*) are excluded entirely.
    ALLOWED_ATTR: [
      'href', 'src', 'alt', 'title', 'width', 'height', 'style',
      'align', 'valign', 'border', 'cellpadding', 'cellspacing',
      'colspan', 'rowspan', 'scope', 'class', 'id', 'target', 'rel',
      'datetime', 'cite', 'lang', 'dir',
    ],
    // Strip javascript: and data: (non-image) URL schemes from href/src.
    ALLOW_DATA_ATTR: false,
    // Force safe URL protocols on href.
    ALLOWED_URI_REGEXP: /^(?:(?:(?:f|ht)tps?|mailto|tel|callto|cid|xmpp):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i,
    // Forbid <svg> and <math> which can contain foreignObject/script.
    FORBID_TAGS: ['svg', 'math', 'script', 'style', 'iframe', 'frame', 'frameset',
                  'object', 'embed', 'form', 'input', 'button', 'select', 'textarea',
                  'base', 'meta', 'link', 'head', 'html', 'body'],
    FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover', 'onfocus', 'onblur',
                  'onchange', 'onsubmit', 'onkeydown', 'onkeyup', 'onkeypress',
                  'onmousedown', 'onmouseup', 'onmousemove', 'onmouseout',
                  'ondblclick', 'oncontextmenu', 'onscroll', 'onwheel',
                  'ondragstart', 'ondrop', 'onpaste', 'oninput',
                  'srcdoc', 'formaction', 'action', 'xmlns'],
  });
}

/**
 * Validates that a string has no suspected SQL Injection patterns.
 * Prisma already parametrizes queries, but this is a defensive depth layer.
 */
export function detectSqlInjection(input: string): boolean {
  const sqlRegex = /(\b(SELECT|UPDATE|DELETE|INSERT|DROP|ALTER|TRUNCATE|UNION)\b)|(' OR '1'='1)|(;--)/i;
  return sqlRegex.test(input);
}

/**
 * Checks for extremely large payloads to prevent DoS.
 */
export function checkPayloadLimit(payloadStr: string, limitBytes: number = 1048576): boolean { // 1MB default
  const size = Buffer.byteLength(payloadStr, 'utf8');
  return size <= limitBytes;
}
