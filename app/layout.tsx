import { ClerkProvider, Show, SignInButton, UserButton } from '@clerk/nextjs'
import type { Metadata } from 'next'
import './globals.css'
import SyncButton from './components/SyncButton'

export const metadata: Metadata = {
  title: 'CipherCross Analytics',
  description: 'LinkedIn outreach pipeline analytics',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-zinc-950 text-zinc-100 antialiased">
        <ClerkProvider>
          <div className="flex flex-col h-screen">
            <header className="flex items-center justify-between px-5 py-3 border-b border-zinc-800 bg-zinc-900 shrink-0">
              <span className="font-semibold text-zinc-100 tracking-tight">
                CipherCross <span className="text-zinc-400 font-normal">Analytics</span>
              </span>
              <div className="flex items-center gap-3">
                <Show when="signed-in">
                  <SyncButton />
                  <UserButton />
                </Show>
                <Show when="signed-out">
                  <SignInButton>
                    <button className="px-3 py-1.5 rounded-md text-sm font-medium bg-indigo-600 hover:bg-indigo-500 text-white transition-colors">
                      Sign in
                    </button>
                  </SignInButton>
                </Show>
              </div>
            </header>
            <main className="flex-1 min-h-0">{children}</main>
          </div>
        </ClerkProvider>
      </body>
    </html>
  )
}
