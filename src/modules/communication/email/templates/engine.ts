export function renderEmailTemplate(templateHtml: string, variables: Record<string, string>): string {
  let rendered = templateHtml;
  for (const [key, value] of Object.entries(variables)) {
    // Replace all instances of {{variable}} safely
    const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
    rendered = rendered.replace(regex, value);
  }
  return rendered;
}

export const BASIC_WELCOME_TEMPLATE = `
  <html>
    <body>
      <h1>Welcome, {{customerName}}!</h1>
      <p>Thank you for joining {{companyName}}.</p>
    </body>
  </html>
`;
