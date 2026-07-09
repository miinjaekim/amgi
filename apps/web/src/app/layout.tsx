import type { Metadata } from "next";
import { Source_Code_Pro } from "next/font/google";
import "./globals.css";
import { UserProvider } from "@/components/UserContext";
import { ThemeProvider } from "@/components/ThemeContext";
import LayoutWithUser from "./LayoutWithUser";

// Source Code Pro is a clean, modern coding font with excellent readability
const sourceCodePro = Source_Code_Pro({ 
  subsets: ["latin"],
  // Include variable font settings for better performance
  variable: '--font-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: "Amgi · 암기",
  description: "Look up any word or phrase. Get an AI-powered explanation and save it as a flashcard to review with spaced repetition.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${sourceCodePro.className} min-h-screen font-mono`}>
        {/* Apply the theme palette and sidebar-collapsed state before first
            paint to avoid a flash of the default (Forest, expanded) UI.
            Mirrors ThemeContext and LayoutWithUser. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('amgi-theme');if(t!=='forest'&&t!=='slate'&&t!=='paper'&&t!=='system')t='forest';var r=t==='system'?(window.matchMedia('(prefers-color-scheme: dark)').matches?'slate':'paper'):t;document.documentElement.classList.add('theme-'+r);if(localStorage.getItem('sidenav-collapsed')==='1')document.documentElement.classList.add('sidenav-collapsed');}catch(e){document.documentElement.classList.add('theme-forest');}})();`,
          }}
        />
        <ThemeProvider>
          <UserProvider>
            <LayoutWithUser>{children}</LayoutWithUser>
          </UserProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
