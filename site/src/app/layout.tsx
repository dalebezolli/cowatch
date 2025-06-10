import type { Metadata } from "next";
import { Montserrat } from "next/font/google";
import "./globals.css";
import Header from "./_components/Header";
import CenterContainer from "./_components/CenterContainer";

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
				<div className="z-50 top-0 w-full fixed bg-dark/50 backdrop-blur-xs animate-[1s_ease-in_0.25s_backwards_FadeIn]">
					<CenterContainer>
						<Header links={[
							{text: "HOME", path: "/#home"},
							{text: "FEATURES", path: "/#features"},
							{text: "DOWNLOAD", path: "/#download"},
						]} />
					</CenterContainer>
				</div>

				{children}
			</body>
		</html>
	);
}
