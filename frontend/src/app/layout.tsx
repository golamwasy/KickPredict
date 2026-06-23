import type { Metadata } from "next"
import { Inter, Outfit } from "next/font/google"
import "./globals.css"
import Navbar from "./components/Navbar"

const inter = Outfit({ subsets: ["latin"], variable: "--font-inter", weight: ["400","600","700","800","900"] })
const outfit = Outfit({ subsets: ["latin"], variable: "--font-outfit", weight: ["400","600","700","800","900"] })

export const metadata: Metadata = {
  title: "KickPredict 2026 — FIFA World Cup Predictions",
  description: "Predict FIFA World Cup 2026 match scores, climb the global leaderboard, and win.",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={outfit.className} suppressHydrationWarning>
        <Navbar />
        <main className="main-content">
          {children}
        </main>
      </body>
    </html>
  )
}
