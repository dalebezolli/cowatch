"use client";

import * as React from "react";
import Link from "next/link";

export default Header;

function Header(props: HeaderNavigationProps) {
	return (
		<header className="
			w-full h-[64px]
			flex gap-4 items-center
			transition-all duration-200
			relative z-40

			text-light font-medium
			">
			<Link href="/" className="justify-center flex-1/3 items-center gap-4 z-50 text-cyan font-bold">
				cowatch
			</Link>

			<HeaderNavigation {...props} />

			<div className="hidden md:block flex-1/3"></div>


		</header>
	);
}

type HeaderNavigationProps = {
	links: Array<{text: string, path: string}>;
};

function HeaderNavigation({ links }: HeaderNavigationProps) {
	return (
		<nav className="max-md:hidden group flex flex-1/3">
			<ul className="flex-1/2 flex justify-end items-center md:justify-center gap-[90px] uppercase text-sm">
				{
					links.map(l => (
						<li key={l.path+l.text}>
							<Link href={l.path} className="flex items-center gap-2 w-max -mobile:hover:-translate-y-[4px] transition-transform duration-300">
								{l.text}
							</Link>
						</li>
					))
				}
			</ul>

		</nav>
	);
}

