import React from 'react';
import Link from 'next/link';
import { ScanSearch, Plus } from 'lucide-react';
import { ThemeToggle } from './ThemeToggle';
import { Button } from '@/components/ui/Button';

export const AppShell: React.FC<{ children: React.ReactNode; showNewButton?: boolean }> = ({
  children,
  showNewButton = true,
}) => (
  <div className="min-h-screen flex flex-col bg-bg">
    <header className="sticky top-0 z-40 border-b border-line bg-bg/80 backdrop-blur-xl surface-transition">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2.5 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-accent-fg">
            <ScanSearch className="h-4.5 w-4.5" />
          </span>
          <span className="text-[15px] font-semibold tracking-tight text-fg">Research.AI</span>
        </Link>
        <nav className="flex items-center gap-2 sm:gap-3">
          <Link href="/#reports" className="hidden sm:inline-flex h-9 items-center rounded-lg px-3 text-sm text-muted hover:text-fg hover:bg-surface-2 transition-colors">
            Reports
          </Link>
          {showNewButton && (
            <Button asChild size="sm" variant="outline" className="h-9">
              <Link href="/">
                <Plus className="h-3.5 w-3.5" /> New research
              </Link>
            </Button>
          )}
          <ThemeToggle />
        </nav>
      </div>
    </header>

    <main className="flex-1">{children}</main>

    <footer className="border-t border-line">
      <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-6 text-xs text-subtle sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <p>Research.AI · Every claim checked against independent sources.</p>
        <p>AI can make mistakes — open the cited sources before relying on a verdict.</p>
      </div>
      <div className="border-t border-line">
        <p className="mx-auto max-w-7xl px-4 py-4 text-center text-xs text-subtle sm:px-6">
          © {new Date().getFullYear()} <span className="font-medium text-muted">IotaDev</span>. All rights reserved.
        </p>
      </div>
    </footer>
  </div>
);
