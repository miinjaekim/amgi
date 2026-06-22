import type { Metadata } from "next";
import { Source_Code_Pro } from "next/font/google";
import "./globals.css";
import Header from "@/components/Header";
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
    <html lang="en">
      <body className={`${sourceCodePro.className} min-h-screen font-mono`}>
        <ThemeProvider>
          <UserProvider>
            <LayoutWithUser>{children}</LayoutWithUser>
          </UserProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
