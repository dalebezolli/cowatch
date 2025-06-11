"use client";

import { Fragment } from "react";
import CenterContainer from "../_components/CenterContainer";
import { useSearchParams } from "next/navigation";

export default function Home() {
	const params = useSearchParams();

	return (
		<Fragment>
			<div className="max-md:hidden -z-20 inset-0 fixed pointer-events-none">
				<div className="absolute left-[20%] w-px h-full bg-white/15"></div>
				<div className="absolute right-[20%] w-px h-full bg-white/15"></div>
			</div>

			<main className="relative text-center text-light font-medium">
				<CenterContainer id="download" className="relative py-[35vh] flex flex-col justify-center gap-[16px] items-center overflow-hidden max-md:text-sm animate-[250ms_ease-in_0.25s_backwards_FadeIn]">
					<h2 className="text-2xl md:text-4xl font-bold text-light-cyan max-xl:mt-8 mb-6">? - ? How did we end up here</h2>
					{ params.get("err") ?
						(
							<p>{params.get("err")}.</p>
						) : (
							<>
							<p className="mb-4">Something went wrong during the authentication process....</p>
								{ params.get("id") && (
									<div className="flex flex-col items-center">
										<p className="mb-4">Send us a message with with the following id to help you out</p>
										<p className="rounded-full px-8 py-2 bg-light/10 w-fit">{params.get("id")}</p>
									</div>
								)}
							</>
						)
					}
				</CenterContainer>
			</main>
		</Fragment>
	);
}
