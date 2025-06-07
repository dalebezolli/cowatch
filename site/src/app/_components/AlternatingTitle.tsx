"use client";

import { useEffect, useRef, useState } from "react";

export default function AlternatingTitle({className=""}: {className: string}) {
	const refElems = useRef<HTMLDivElement>(null);
	const [activeItem, setActiveItem] = useState(0);

	function alternate() {
		if(refElems.current == null) return;
		const children = refElems.current.children;
		const total = children.length ?? 0;

		for(let i = 0; i < children.length; i++) {
			if(i == activeItem) {
				children[i].classList.remove("alternating-partially-visible");
				children[i].classList.remove("alternating-invisible");
				children[i].classList.remove("alternating-is-above");
				children[i].classList.remove("alternating-is-below");
			} else if(i == (total+(activeItem-1)) % total) {
				children[i].classList.add("alternating-invisible");
				children[i].classList.remove("alternating-is-below");
				children[i].classList.add("alternating-is-above");
			} else if(i == (activeItem+1) % total) {
				children[i].classList.add("alternating-partially-visible");
				children[i].classList.remove("alternating-invisible");
				children[i].classList.remove("alternating-is-above");
				children[i].classList.add("alternating-is-below");
			} else {
				children[i].classList.add("alternating-invisible");
				children[i].classList.remove("alternating-is-above");
				children[i].classList.add("alternating-is-below");
			}
		}

		setActiveItem(prev => ((prev+1) % total));
	}

	useInterval(alternate, 2000);

	return (
		<p className={`relative text-transparent text-3xl md:text-[2.5rem] font-bold bg-clip-text bg-gradient-to-br from-light to-cyan ${className}`}>
			<span className="opacity-0 pr-2" aria-hidden>_______</span>

			<span ref={refElems}>
				<span className="absolute top-0 left-0 text-transparent bg-clip-text bg-gradient-to-br from-light to-cyan transition-all duration-300">Watch</span>
				<span className="absolute top-0 left-0 text-transparent bg-clip-text bg-gradient-to-br from-light to-cyan pl-[0.5ch] alternating-partially-visible alternating-is-below transition-all duration-300" aria-hidden>Study</span>
				<span className="absolute top-0 left-0 text-transparent bg-clip-text bg-gradient-to-br from-light to-cyan pl-[1.5ch] alternating-invisible alternating-is-below transition-all duration-300" aria-hidden>Vibe</span>
			</span>

			with friends
		</p>
	);
}

function useInterval(fn: () => void, delay: number) {
	const refFn = useRef<() => void>(null);

	useEffect(() => {
		refFn.current = fn;
	}, [fn]);

	useEffect(() => {
		const intervalId = setInterval(() => refFn.current && refFn.current(), delay);
		return () => {
			clearInterval(intervalId);
		}
	}, [delay]);
}
