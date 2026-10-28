import '@/styles/globals.css';
import type { AppProps } from 'next/app';
import Head from 'next/head';
import { Geist, Geist_Mono } from 'next/font/google';
import { ThemeProvider } from '@/lib/theme';

const geist = Geist({ subsets: ['latin'], variable: '--font-geist' });
const geistMono = Geist_Mono({ subsets: ['latin'], variable: '--font-geist-mono' });

export default function App({ Component, pageProps }: AppProps) {
  return (
    <ThemeProvider>
      <Head>
        <title>Research.AI — AI research & fact-checking</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <div id="app-root" className={`${geist.variable} ${geistMono.variable} font-sans`}>
        <Component {...pageProps} />
      </div>
    </ThemeProvider>
  );
}
