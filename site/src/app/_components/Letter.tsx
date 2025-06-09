"use client";

import { PropsWithChildren, useEffect, useRef } from "react";

export default function Letter({ children }: PropsWithChildren) {
	const observerRef = useRef<IntersectionObserver>(null);

	useEffect(() => {
		if(observerRef.current == null) {
			observerRef.current = new IntersectionObserver(prepareLetter, {
				threshold: [0, 0.25, 0.5, 0.75, 1]
			});
		}

		const rootElem = document.querySelector("#letter-svg");
		if(rootElem == null) return;
		observerRef.current.observe(rootElem);

		return () => {
			observerRef.current?.unobserve(rootElem);
		}

	}, []);

	function prepareLetter(entries: IntersectionObserverEntry[]) {
		if(entries[0].intersectionRatio < 0.5) return;
		document.getElementById("letter-front")?.classList.add("letter-front");
		document.getElementById("letter-back")?.classList.add("letter-back");
		document.getElementById("paper")?.classList.add("paper");
		document.getElementById("highlight")?.classList.add("highlight");
		document.getElementById("letter-content")?.classList.add("letter-content");
	}

	return (
		<div className="relative">
			<div id="letter-content" className="absolute inset-0 pt-28 pb-20 opacity-0 px-24">
				{children}
			</div>

			<svg id="letter-svg" width={590} height={609} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 590 609" shapeRendering="geometricPrecision" textRendering="geometricPrecision">
				<defs>
					<linearGradient id="egFVcG1dxoQ7-fill" x1="229" y1="0" x2="229" y2="320.4997" spreadMethod="pad" gradientUnits="userSpaceOnUse" gradientTransform="translate(0 0)">
						<stop id="egFVcG1dxoQ7-fill-0" offset="0%" stopColor="#0e0060" />
						<stop id="egFVcG1dxoQ7-fill-1" offset="100%" stopColor="#9fa6f0" />
					</linearGradient>
					<linearGradient id="highlight-fill" x1="295" y1="124.535" x2="295" y2="257.59" spreadMethod="pad" gradientUnits="userSpaceOnUse" gradientTransform="translate(0 0)">
						<stop id="highlight-fill-0" offset="0%" stopColor="rgba(0,119,255,0)" />
						<stop id="highlight-fill-1" offset="100%" stopColor="rgba(80,161,255,0.8)" />
					</linearGradient>
					<linearGradient id="egFVcG1dxoQ14-fill" x1="297" y1="265" x2="297" y2="608" spreadMethod="pad" gradientUnits="userSpaceOnUse" gradientTransform="translate(0 0)">
						<stop id="egFVcG1dxoQ14-fill-0" offset="0%" stopColor="#1c182d" />
						<stop id="egFVcG1dxoQ14-fill-1" offset="100%" stopColor="#252525" />
					</linearGradient>
					<linearGradient id="egFVcG1dxoQ15-fill" x1="297" y1="386" x2="297" y2="608" spreadMethod="pad" gradientUnits="userSpaceOnUse" gradientTransform="translate(0 0)">
						<stop id="egFVcG1dxoQ15-fill-0" offset="0%" stopColor="#1c182d" />
						<stop id="egFVcG1dxoQ15-fill-1" offset="100%" stopColor="#252525" />
					</linearGradient>
					<linearGradient id="egFVcG1dxoQ16-fill" x1="297" y1="386" x2="297" y2="608" spreadMethod="pad" gradientUnits="userSpaceOnUse" gradientTransform="translate(0 0)">
						<stop id="egFVcG1dxoQ16-fill-0" offset="0%" stopColor="#34388e" />
						<stop id="egFVcG1dxoQ16-fill-1" offset="100%" stopColor="rgba(66,66,66,0)" />
					</linearGradient>
					<filter id="egFVcG1dxoQ17-filter" x="-150%" y="-150%" width="400%" height="400%">
						<feGaussianBlur id="egFVcG1dxoQ17-filter-drop-shadow-0-blur" in="SourceAlpha" stdDeviation="20.9,20.9" />
						<feOffset id="egFVcG1dxoQ17-filter-drop-shadow-0-offset" dx="0" dy="0" result="tmp" />
						<feFlood id="egFVcG1dxoQ17-filter-drop-shadow-0-flood" floodColor="rgba(0,119,255,0.1)" />
						<feComposite id="egFVcG1dxoQ17-filter-drop-shadow-0-composite" operator="in" in2="tmp" />
						<feMerge id="egFVcG1dxoQ17-filter-drop-shadow-0-merge" result="result">
							<feMergeNode id="egFVcG1dxoQ17-filter-drop-shadow-0-merge-node-1" />
							<feMergeNode id="egFVcG1dxoQ17-filter-drop-shadow-0-merge-node-2" in="SourceGraphic" />
						</feMerge>
					</filter>
					<linearGradient id="egFVcG1dxoQ19-fill" x1="0.5" y1="0" x2="0.5" y2="1" spreadMethod="pad" gradientUnits="objectBoundingBox" gradientTransform="translate(0 0)">
						<stop id="egFVcG1dxoQ19-fill-0" offset="0%" stopColor="rgba(255,255,255,0)" />
						<stop id="egFVcG1dxoQ19-fill-1" offset="100%" stopColor="#010022" />
					</linearGradient>
				</defs>
				<g transform="translate(0 16)" id="letter-back" className="scale-0">
					<rect width="518" height="344" rx="0" ry="0" transform="translate(38 264)" fill="#161616" />
					<path d="M294,9.00098c.417-.01347.812.15887,1.186.50683C320.996,18.7989,494.275,153.001,494.275,153.001l61.725,111h-518l60.0996-111C98.2107,152.913,266.188,19.3014,291.802,9.56152c.4-.38309.823-.57466,1.273-.56054.142.00445.297.02087.466.04785.166-.02752.319-.04335.459-.04785Z" transform="matrix(1 0 0 1.096421 0-16.454863)" fill="#161616" />
				</g>
				<g clipPath="url(#letter-mask)" opacity="1" id="letter-group">
					<g id="paper" className="translate-y-full" transform="translate(0 29.5)">
						<rect width="458" height="465" rx="8" ry="8" transform="matrix(1 0 0 1.288478 65.999986 35.606311)" fill="url(#egFVcG1dxoQ7-fill)" />
						<path d="M495,55.9988h14v14" fill="none" stroke="#2f6496" />
						<path d="M101,55.9988h-14v14" fill="none" stroke="#2f6496" />
					</g>
					<clipPath id="letter-mask">
						<rect width="517.999999" height="218.27544" rx="0" ry="0" transform="matrix(1 0 0 3.541397 38.663002-148.499994)" fill="#fff" strokeWidth="0" />
					</clipPath>
				</g>
				<path id="highlight" className="opacity-0" d="M0.5,68.9993L98.0945,407.999h395.7725L589.5,68.9993h-589Z" opacity="1" fill="url(#highlight-fill)" />
				<g id="letter-front" className="scale-0" transform="translate(0.000001 16)">
					<path d="M556,608h-518v-343c0,0,68.217,8.676,76.5,15.5s126.5,140.5,126.5,140.5l56,139.626L353,421c0,0,118.217-133.676,126.5-140.5s76.5-15.5,76.5-15.5v343Z" fill="url(#egFVcG1dxoQ14-fill)" />
					<path d="M384.854,386c0,0,143.843,134.5,147.146,142s24,80,24,80h-518c0,0,20.6967-72.5,24-80s147.146-142,147.146-142h175.708Z" fill="url(#egFVcG1dxoQ15-fill)" />
					<path d="M384.854,386l.342-.365-.144-.135h-.198v.5ZM532,528l.458-.202L532,528Zm24,80v.5h.663l-.182-.637L556,608ZM38,608l-.4808-.137-.1819.637h.6627v-.5Zm24-80l-.4576-.202L62,528ZM209.146,386v-.5h-.198l-.144.135.342.365Zm175.708,0c-.341.365-.34.365-.339.367.001.001.002.002.005.004.004.004.01.01.019.018.018.017.044.041.078.073.069.065.173.162.309.289.272.255.676.633,1.203,1.126c1.054.987,2.601,2.435,4.571,4.282c3.939,3.692,9.571,8.975,16.339,15.338c13.536,12.726,31.619,29.772,49.805,47.053s36.474,34.794,50.421,48.455c6.974,6.831,12.86,12.697,17.104,17.087c2.123,2.196,3.832,4.019,5.059,5.408.615.695,1.105,1.277,1.465,1.74.369.474.574.79.649.961L532,528l.458-.202c-.131-.297-.407-.698-.776-1.172-.378-.487-.883-1.086-1.504-1.788-1.243-1.405-2.963-3.241-5.09-5.441-4.254-4.4-10.147-10.273-17.123-17.106-13.953-13.667-32.245-31.184-50.432-48.466-18.188-17.282-36.272-34.33-49.809-47.057-6.769-6.363-12.401-11.647-16.34-15.339-1.97-1.846-3.517-3.295-4.572-4.282-.527-.493-.931-.872-1.203-1.126-.136-.128-.24-.224-.309-.289-.034-.032-.06-.057-.078-.073-.008-.008-.015-.014-.019-.018-.003-.002-.004-.004-.005-.005s-.002-.001-.344.364ZM532,528l-.458.201c.811,1.841,2.714,7.742,5.123,15.609c2.404,7.849,5.301,17.612,8.094,27.143c2.793,9.53,5.483,18.826,7.475,25.74.996,3.457,1.817,6.318,2.39,8.315.286.998.51,1.78.662,2.313.076.267.135.471.174.608.019.069.034.121.044.155.005.018.009.031.011.04.002.004.003.008.003.01.001.001.001.002.001.002c0,.001,0,.001.481-.136s.481-.138.481-.138c-.001-.001-.001-.002-.001-.003-.001-.002-.002-.005-.003-.01-.003-.009-.006-.022-.011-.039-.01-.035-.025-.087-.045-.156-.039-.137-.097-.341-.174-.608-.152-.533-.376-1.315-.662-2.314-.573-1.997-1.394-4.859-2.39-8.316-1.992-6.914-4.683-16.212-7.476-25.744-2.794-9.532-5.692-19.3-8.097-27.155-2.4-7.835-4.324-13.81-5.164-15.719L532,528Zm24,80v-.5h-518v.5.5h518v-.5ZM38,608c.4808.137.4809.137.481.136.0002,0,.0004-.001.0007-.002.0007-.002.0016-.006.0029-.01.0025-.009.0062-.022.0112-.04.0099-.034.0248-.086.0444-.155.0393-.137.0976-.341.1738-.608.1523-.533.3762-1.315.6624-2.313.5723-1.997,1.3936-4.858,2.3895-8.315c1.9918-6.914,4.6819-16.21,7.4752-25.74c2.7933-9.531,5.6894-19.294,8.0934-27.143c2.4097-7.867,4.3123-13.768,5.1231-15.609L62,528l-.4576-.202c-.8409,1.909-2.7641,7.884-5.1641,15.719-2.4057,7.855-5.3031,17.623-8.0969,27.155s-5.4843,18.83-7.4764,25.744c-.996,3.457-1.8175,6.319-2.3899,8.316-.2862.999-.5102,1.781-.6626,2.314-.0762.267-.1345.471-.1738.608-.0196.069-.0345.121-.0445.156-.0049.017-.0087.03-.0112.039-.0013.005-.0022.008-.0028.01-.0004.001-.0006.002-.0008.003-.0001,0-.0002.001.4806.138Zm24-80l.4576.201c.0756-.171.2804-.487.6498-.961.36-.463.85-1.045,1.4641-1.74c1.2277-1.389,2.9363-3.212,5.0591-5.408c4.2445-4.39,10.1305-10.256,17.1043-17.087c13.9471-13.661,32.2351-31.174,50.4211-48.455s36.269-34.327,49.805-47.053c6.768-6.363,12.4-11.646,16.339-15.338c1.97-1.847,3.517-3.295,4.571-4.282.527-.493.931-.871,1.203-1.126.136-.127.24-.224.309-.289.034-.032.06-.056.078-.073.009-.008.015-.014.019-.018.003-.002.004-.003.005-.004.001-.002.002-.002-.339-.367-.342-.365-.343-.365-.344-.364s-.002.003-.005.005c-.004.004-.011.01-.019.018-.018.016-.044.041-.078.073-.069.065-.173.161-.309.289-.272.254-.676.633-1.203,1.126-1.055.987-2.602,2.436-4.572,4.282-3.939,3.692-9.571,8.976-16.34,15.339-13.537,12.727-31.621,29.775-49.809,47.057-18.187,17.282-36.4793,34.799-50.4318,48.466-6.9759,6.833-12.8695,12.706-17.1236,17.106-2.1266,2.2-3.8471,4.036-5.0893,5.441-.6209.702-1.1261,1.301-1.5042,1.788-.3687.474-.6449.875-.7757,1.172L62,528ZM209.146,386v.5h175.708v-.5-.5h-175.708v.5Z" fill="url(#egFVcG1dxoQ16-fill)" />
				</g>
				<g filter="url(#egFVcG1dxoQ17-filter)">
					<circle r="0.5" transform="translate(294.5 238.5)" fill="#d9d9d9" />
				</g>
			</svg>

		</div>

	);
}
