import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Header from "@/components/Header";
import { UserProvider } from "@/components/UserContext";
import LayoutWithUser from "./LayoutWithUser";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Amgi AI - Language Learning Made Simple",
  description: "Learn languages effortlessly with AI-powered explanations and spaced repetition.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${inter.className} min-h-screen`} style={{ background: '#173F35' }}>
        <UserProvider>
          <LayoutWithUser>{children}</LayoutWithUser>
        </UserProvider>
      </body>
    </html>
  );
}
