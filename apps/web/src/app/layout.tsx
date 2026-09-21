import type { Metadata } from "next";
import { Source_Code_Pro } from "next/font/google";
import "./globals.css";
import { UserProvider } from "@/components/UserContext";
import { ThemeProvider } from "@/components/ThemeContext";
import { PronunciationProvider } from "@/components/PronunciationContext";
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
            paint to avoid a flash of the default (Paper, expanded) UI.
            Mirrors ThemeContext and LayoutWithUser.

            ⚠️ It reads the *mode* off `location.pathname` and the theme off
            that mode's own key, because the two sets share no ids — a cold
            load of /munli that used Amgi's key would paint Paper and then
            snap to Shoko. The path is available here for the same reason the
            mode is never stored: it is the route. Keep the prefix test in
            step with `modeFromPath`, and the ids in step with
            `THEME_SETS` — the duplication is the price of running before
            any module does. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var p=location.pathname;var m=(p==='/munli'||p.indexOf('/munli/')===0)?1:0;var S=m?['suisei','shoko','godspeed']:['forest','slate','paper'];var k=m?'munli-theme':'amgi-theme';var d=m?'shoko':'paper';var dk=m?'suisei':'slate';var t=localStorage.getItem(k);if(S.indexOf(t)<0&&t!=='system')t=d;var r=t==='system'?(window.matchMedia('(prefers-color-scheme: dark)').matches?dk:d):t;document.documentElement.classList.add('theme-'+r);if(localStorage.getItem('sidenav-collapsed')==='1')document.documentElement.classList.add('sidenav-collapsed');}catch(e){document.documentElement.classList.add('theme-paper');}})();`,
          }}
        />
        <ThemeProvider>
          <UserProvider>
            <PronunciationProvider>
              <LayoutWithUser>{children}</LayoutWithUser>
            </PronunciationProvider>
          </UserProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
