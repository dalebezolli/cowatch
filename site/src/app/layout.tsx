import type { Metadata } from "next";
import { Montserrat } from "next/font/google";
import "./globals.css";

const montserrat = Montserrat({
	variable: "--font-montserrat",
	subsets: ["latin"],
});

export const metadata: Metadata = {
	title: "Cowatch",
	description: "Cowatch let’s you effortlessly share your favorite content with anyone you want.",
};

export default function RootLayout({
	children,
}: Readonly<{
		children: React.ReactNode;
	}>) {
	return (
		<html lang="en" className="scroll-smooth">
			<body className={`${montserrat.variable} antialiased bg-dark`}>
				{children}
			</body>
		</html>
	);
}
