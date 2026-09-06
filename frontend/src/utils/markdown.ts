import { marked } from 'marked';
import DOMPurify from 'dompurify';

/**
 * Render assistant chat content to safe HTML.
 *
 * The AI model may reply in plain text, Markdown (`| table |`), or HTML, so we
 * parse with `marked` first, then sanitize with DOMPurify to strip any
 * dangerous markup (`<script>`, event handlers, `javascript:` URLs, etc.).
 */
export function renderMarkdown(raw: string): string {
  const html = marked.parse(raw, { async: false }) as string;
  return DOMPurify.sanitize(html);
}
