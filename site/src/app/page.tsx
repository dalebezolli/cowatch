import { Fragment, PropsWithChildren } from "react";
import Header from "./_components/Header";

export default function Home() {
	return (
		<Fragment>
			<div className="top-0 sticky bg-dark/50 backdrop-blur-xs">
				<CenterContainer>
					<Header links={[
						{text: "HOME", path: "/"},
						{text: "FEATURES", path: "/"},
						{text: "DOWNLOAD", path: "/"},
					]} />
				</CenterContainer>
			</div>

			<div className="text-red-400 sm:font-bold h-[200px]">Hello world</div>
			<div className="text-red-400 sm:font-bold h-[200px]">Hello world</div>
			<div className="text-red-400 sm:font-bold h-[200px]">Hello world</div>
			<div className="text-red-400 sm:font-bold h-[200px]">Hello world</div>
			<div className="text-red-400 sm:font-bold h-[200px]">Hello world</div>

		</Fragment>
	);
}

function CenterContainer({ className="", children}: PropsWithChildren<{className?: string}>) {
	return (
		<div className={"px-8 lg:px-16 "+className}>
			{children}
		</div>
	)
}
