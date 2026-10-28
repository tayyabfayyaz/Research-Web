import { Html, Head, Main, NextScript } from 'next/document';

// Runs before first paint so the page never flashes the wrong theme.
// The PDF template is always printed in light mode, so it is skipped.
const themeScript = `
(function () {
  try {
    if (location.pathname.indexOf('/export-pdf-template') === 0) return;
    var stored = localStorage.getItem('theme');
    var dark = stored ? stored === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (dark) document.documentElement.classList.add('dark');
  } catch (e) {}
})();
`;

export default function Document() {
  return (
    <Html lang="en" suppressHydrationWarning>
      <Head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
