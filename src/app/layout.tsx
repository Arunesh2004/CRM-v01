import { ClerkProvider } from '@clerk/nextjs'
import SetupScreen from '@/components/setup/SetupScreen'
import type { Metadata } from "next";
import { Space_Grotesk, Inter, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const ibmPlexMono = IBM_Plex_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: "Security CRM — Enterprise Suite",
  description: "AI-powered security CRM for enterprise teams",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const missingVars: string[] = [];
  if (!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) missingVars.push('NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY');
  if (!process.env.CLERK_SECRET_KEY) missingVars.push('CLERK_SECRET_KEY');
  if (!process.env.DATABASE_URL) missingVars.push('DATABASE_URL');

  if (missingVars.length > 0) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error(`Production Build Failed: Missing mandatory environment variables: ${missingVars.join(', ')}`);
    }
    return <SetupScreen missingVars={missingVars} />;
  }

  return (
    <ClerkProvider>
      <html
        lang="en"
        className={`${spaceGrotesk.variable} ${inter.variable} ${ibmPlexMono.variable} h-full antialiased dark`}
      >
        <body className="min-h-full flex flex-col bg-[#070B18] text-[#E7EAF5]">{children}</body>
      </html>
    </ClerkProvider>
  );
}
