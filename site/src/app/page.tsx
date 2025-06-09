import { Fragment, HTMLAttributes, PropsWithChildren } from "react";
import Header from "./_components/Header";
import Image from "next/image";
import AlternatingTitle from "./_components/AlternatingTitle";
import Letter from "./_components/Letter";

export default function Home() {
	return (
		<Fragment>
			<div className="z-50 top-0 w-full fixed bg-dark/50 backdrop-blur-xs animate-[1s_ease-in_0.25s_backwards_FadeIn]">
				<CenterContainer>
					<Header links={[
						{text: "HOME", path: "#home"},
						{text: "FEATURES", path: "#features"},
						{text: "DOWNLOAD", path: "#download"},
					]} />
				</CenterContainer>
			</div>

			<div id="#home" className="h-[64px]"></div>
			<div className="max-md:hidden -z-20 inset-0 fixed pointer-events-none">
				<div className="absolute left-[20%] w-px h-full bg-white/15"></div>
				<div className="absolute right-[20%] w-px h-full bg-white/15"></div>
			</div>

			<main className="relative text-center text-light font-medium">
				<div className="-z-50 bottom-0 md:left-1/2 fixed md:-translate-x-1/2 translate-y-[40%] sm:translate-y-[60%] md:translate-y-[57%]">
					<Image width={960} height={960} src="/out.png" alt="none" className="relative z-10" />
					<div className="z-0 absolute top-[35%] left-[45%] w-px h-px bg-white shadow-[0_0_250px_200px] shadow-white"></div>
				</div>

				<CenterContainer width="800" className="mt-[64px] mb-[256px] flex flex-col items-center gap-8">
					<div className="flex items-center gap-2 animate-[1s_ease-in_0.25s_backwards_FadeIn]">
						<div className="w-[64px] md:w-[112px] h-px bg-light/35 mr-2"></div>

						<h1 className="max-md:text-sm">cowatch</h1>
						<p className="max-md:text-sm opacity-35" aria-hidden>Youtube</p>

						<div className="w-[64px] md:w-[112px] h-px bg-light/35 ml-2"></div>
					</div>

					<AlternatingTitle className="animate-[0.75s_ease-in_backwards_FadeIn]" />

					<p className="max-md:text-sm animate-[1s_ease-in_0.25s_backwards_FadeIn]">cowatch let’s you effortlessly share your favorite content with anyone you want.</p>
					<p className="max-md:text-sm animate-[1s_ease-in_0.25s_backwards_FadeIn]">Feel the ultimate, lag-free, YouTube native visual quality, with your friends, by signing up for the <span className="text-cyan">closed alpha</span> experience today.</p>


					<Button className="animate-[1s_ease-in_0.25s_backwards_FadeIn]">
						Get Started
						<svg width="17" height="16" viewBox="0 0 17 16" fill="none" xmlns="http://www.w3.org/2000/svg">
							<path d="M12.4211 8.53034L6.34786 14.6036C6.05496 14.8965 5.58008 14.8965 5.28721 14.6036L4.57886 13.8952C4.28646 13.6028 4.2859 13.1289 4.57761 12.8358L9.39077 8L4.57761 3.16422C4.2859 2.87112 4.28646 2.39722 4.57886 2.10481L5.28721 1.39647C5.58011 1.10356 6.05499 1.10356 6.34786 1.39647L12.4211 7.46969C12.714 7.76256 12.714 8.23744 12.4211 8.53034Z" fill="white"/>
						</svg>
					</Button>

					<div className="flex gap-2 items-center animate-[1s_ease-in_0.25s_backwards_FadeIn]">
						<p className="opacity-35 max-md:text-sm">Available for</p>

						<svg width="16" height="16" viewBox="0 0 16 16" fill="none">
							<g>
								<path d="M4.35937 6.79688L1.97187 3.12813C3.45937 1.27813 5.69062 0.259382 7.97187 0.250007C9.29375 0.240632 10.6437 0.578132 11.8719 1.28751C13.2281 2.07501 14.2594 3.20626 14.9156 4.50626L8.5 4.16876C6.68437 4.06251 4.95625 5.08438 4.35937 6.79688ZM5.3875 8.00001C5.3875 9.44376 6.55625 10.6125 8 10.6125C9.44375 10.6125 10.6125 9.44376 10.6125 8.00001C10.6125 6.55626 9.44375 5.38751 8 5.38751C6.55625 5.38751 5.3875 6.55313 5.3875 8.00001ZM15.2281 5.21251L10.8625 5.43751C12.0469 6.82188 12.0656 8.81876 11.0687 10.35L7.56562 15.7375C9.01875 15.8156 10.5156 15.4969 11.8719 14.7094C15.2281 12.7719 16.5875 8.70938 15.2281 5.21251ZM4.42812 9.48751L1.5125 3.75313C0.715625 4.97188 0.25 6.43438 0.25 8.00001C0.25 11.875 3.0875 15.0844 6.79687 15.6531L8.7875 11.7531C6.9875 12.0906 5.25 11.1031 4.42812 9.48751Z" fill="#E5F3F3" fillOpacity="0.35"/>
							</g>
						</svg>

						<svg width="16" height="16" viewBox="0 0 16 16" fill="none">
							<g>
								<path d="M15.4406 7.35311C15.4187 7.21249 15.3969 7.13124 15.3969 7.13124C15.3969 7.13124 15.3406 7.19374 15.25 7.31561C15.2219 6.98124 15.1625 6.65311 15.0688 6.32811C14.9531 5.92499 14.8031 5.53436 14.6156 5.15936C14.4969 4.90936 14.3594 4.67186 14.2 4.44686C14.1438 4.36249 14.0844 4.27811 14.025 4.19999C13.75 3.74999 13.4313 3.47186 13.0656 2.94999C12.8281 2.54999 12.6625 2.10936 12.5844 1.64999C12.4844 1.92811 12.4062 2.21249 12.3531 2.50311C11.975 2.12186 11.65 1.85311 11.45 1.66874C10.4812 0.756238 10.5938 0.284363 10.5938 0.284363C10.5938 0.284363 8.77187 2.31874 9.55937 4.43749C9.83125 5.15624 10.3031 5.78436 10.9156 6.24686C11.6781 6.87811 12.5031 7.37186 12.9375 8.64061C12.5875 7.97499 12.0594 7.41561 11.4125 7.03124C11.6063 7.49061 11.7063 7.98749 11.7031 8.48436C11.7031 10.3906 10.1531 11.9375 8.24687 11.9344C7.9875 11.9344 7.73125 11.9062 7.48125 11.8469C7.18437 11.7906 6.89687 11.6937 6.625 11.5562C6.22188 11.3125 5.875 10.9906 5.6 10.6094L5.59375 10.6L5.65625 10.6219C5.8 10.6719 5.94375 10.7094 6.09375 10.7375C6.67812 10.8625 7.29063 10.7906 7.83125 10.5312C8.37813 10.2281 8.70625 10.0031 8.975 10.0937H8.98125C9.24375 10.1781 9.45 9.92186 9.2625 9.65624C8.9375 9.23749 8.40625 9.03124 7.88125 9.12499C7.33437 9.20311 6.83437 9.59374 6.11875 9.21561C6.07188 9.19061 6.02812 9.16561 5.98438 9.13749C5.93437 9.10936 6.1375 9.17811 6.09062 9.14686C5.93437 9.06874 5.78438 8.97811 5.64062 8.87811C5.63125 8.86874 5.75 8.91249 5.7375 8.90311C5.55313 8.77811 5.39375 8.61561 5.26875 8.42811C5.14062 8.19686 5.12813 7.91561 5.2375 7.67499C5.30313 7.55624 5.40625 7.45936 5.52812 7.40311C5.62187 7.44999 5.67812 7.48436 5.67812 7.48436C5.67812 7.48436 5.6375 7.40624 5.6125 7.36561C5.62188 7.36249 5.62812 7.36561 5.6375 7.35936C5.71875 7.39374 5.89687 7.48436 5.99375 7.54061C6.05938 7.57499 6.1125 7.62499 6.15625 7.68749C6.15625 7.68749 6.1875 7.67186 6.16563 7.60311C6.13125 7.51874 6.075 7.44686 5.99687 7.39686H6.00313C6.075 7.43436 6.14375 7.47811 6.20937 7.52499C6.26875 7.38749 6.29688 7.23749 6.29063 7.08749C6.29688 7.00624 6.28437 6.92186 6.25625 6.84374C6.23125 6.79374 6.27188 6.77499 6.31563 6.82811C6.30938 6.78749 6.29375 6.74999 6.27812 6.71249V6.70936C6.27812 6.70936 6.30313 6.67499 6.31563 6.66249C6.34688 6.63124 6.38125 6.60311 6.42188 6.57811C6.64687 6.43749 6.88438 6.31561 7.13125 6.21561C7.33125 6.12811 7.49687 6.06249 7.53125 6.04061C7.58125 6.00936 7.62813 5.97186 7.67188 5.93124C7.8375 5.79061 7.95312 5.59374 7.99062 5.37811C7.99375 5.34999 7.99687 5.32186 8 5.29061V5.24374C7.97188 5.13436 7.78438 5.05311 6.8 4.95936C6.45312 4.90311 6.175 4.64374 6.09688 4.29999V4.29686C6.28438 3.80624 6.62187 3.38749 7.05937 3.09999C7.08437 3.07811 6.95937 3.10624 6.98438 3.08436C7.06875 3.04374 7.15312 3.00624 7.24062 2.97499C7.28437 2.95624 7.05313 2.86874 6.84688 2.89061C6.72188 2.89686 6.59687 2.92811 6.48125 2.97811C6.53125 2.93749 6.675 2.88124 6.64062 2.88124C6.37813 2.93124 6.125 3.02811 5.89375 3.16249C5.89375 3.13749 5.89688 3.11561 5.90938 3.09374C5.725 3.17186 5.56563 3.29686 5.44063 3.45311C5.44375 3.42499 5.44688 3.39686 5.44688 3.36874C5.3625 3.43124 5.28438 3.50311 5.21875 3.58436L5.21562 3.58749C4.67188 3.37811 4.08125 3.32811 3.50938 3.44061L3.50312 3.43749H3.50938C3.39062 3.34061 3.2875 3.22811 3.20625 3.09686L3.2 3.09999L3.1875 3.09374C3.15 3.03749 3.1125 2.97499 3.07188 2.90624C3.04375 2.85624 3.01562 2.79999 2.9875 2.74374C2.9875 2.74061 2.98438 2.73749 2.98125 2.73749C2.96875 2.73749 2.9625 2.79061 2.95312 2.77811V2.77499C2.85313 2.51561 2.80625 2.23749 2.81562 1.95624L2.80938 1.95936C2.65 2.06874 2.52813 2.22811 2.4625 2.41249C2.43437 2.47811 2.4125 2.51561 2.39375 2.55311V2.53749C2.39687 2.50311 2.4125 2.43436 2.40937 2.44061C2.40625 2.44686 2.40312 2.44999 2.4 2.45311C2.35312 2.50624 2.30938 2.56874 2.27813 2.63436C2.25 2.69374 2.225 2.75624 2.20625 2.81874C2.20312 2.82811 2.20625 2.80936 2.20625 2.78749C2.20625 2.76561 2.20937 2.72499 2.20625 2.73436L2.19687 2.75624C1.9875 3.22186 1.85625 3.71874 1.80938 4.22811C1.79688 4.31561 1.79063 4.40311 1.79375 4.48749V4.49374C1.64375 4.65624 1.5125 4.83749 1.39688 5.02811C1.01875 5.66561 0.7375 6.35624 0.559375 7.07811C0.684375 6.80311 0.834375 6.54061 1.00625 6.29374C0.671875 7.14061 0.5 8.04374 0.5 8.95624C0.55625 8.68749 0.63125 8.42499 0.71875 8.16561C0.665625 9.24374 0.871875 10.3187 1.325 11.3C1.93125 12.6594 2.9375 13.8 4.20937 14.5719C4.72813 14.9219 5.29375 15.1937 5.89062 15.3781C5.96875 15.4062 6.05 15.4344 6.13125 15.4625C6.10625 15.4531 6.08125 15.4406 6.05625 15.4312C6.7625 15.6437 7.5 15.7531 8.2375 15.7531C10.8531 15.7531 11.7156 14.7562 11.7937 14.6594C11.9219 14.5437 12.0281 14.4031 12.1031 14.2437C12.1531 14.2219 12.2031 14.2 12.2563 14.1781L12.2875 14.1625L12.3469 14.1344C12.7406 13.95 13.1125 13.7156 13.45 13.4437C13.9594 13.0781 14.3219 12.5469 14.4781 11.9406C14.5719 11.7187 14.575 11.4719 14.4906 11.2469C14.5188 11.2031 14.5437 11.1594 14.575 11.1125C15.1375 10.2094 15.4563 9.17811 15.5 8.11561V8.02811C15.5 7.79999 15.4812 7.57499 15.4406 7.35311ZM6.09688 4.30311C6.08438 4.33749 6.06875 4.37499 6.05625 4.41249C6.06875 4.37499 6.08125 4.34061 6.09688 4.30311Z" fill="#E5F3F3" fillOpacity="0.35"/>
							</g>
						</svg>

					</div>
				</CenterContainer>


				<CenterContainer id="features" className="pt-[64px] pb-[256px] flex flex-col items-center justify-center gap-[64] md:gap-[192px] animate-[1s_ease-in_0.25s_backwards_FadeIn]">
					<GlassDisplay outerClassName="xl:max-w-[1200px]" className="flex max-xl:flex-col max-md:gap-8 max-xl:gap-16 gap-24 xl:items-center justify-between ">
						<div className="flex flex-col gap-2 md:gap-4 text-left max-w-[390px] max-md:text-sm">
							<h2 className="text-2xl md:text-4xl font-bold text-light-cyan max-xl:mt-8 mb-4 md:mb-6">Have a party with just one click</h2>
							<p>Pick a session name and create a room with just one click.</p>
							<p>Share your room and have up to 5 of your friends, family or pets connect with one click.</p>
							<p>It has never been easier.</p>
						</div>

						<Image width={658} height={497} src="/mock-1.png" alt="test" className="w-full" />
					</GlassDisplay>

					<GlassDisplay outerClassName="xl:max-w-[1200px]" className="flex max-xl:flex-col max-md:gap-8 max-xl:gap-16 gap-24 xl:items-center justify-between">
						<Image width={658} height={497} src="/mock-2.png" alt="test" className="w-full" />

						<div className="flex flex-col gap-2 md:gap-4 text-left max-w-[390px] max-md:text-sm">
							<h2 className="text-2xl md:text-4xl font-bold text-light-cyan max-xl:mt-8 mb-4 md:mb-6">One Room, Many Unique Experiences</h2>
							<p>Comfort yourself with your unique video quality and subtitles.</p>
							<p>Not all your friends have fast enough internet for 4K or understand English perfectly.</p>
							<p>Let them choose their own viewing experience while you enjoy your perfect settings.</p>
						</div>
					</GlassDisplay>
				</CenterContainer>

				<CenterContainer id="download" className="py-[128px] flex flex-col gap-[16px] md:gap-[32px] items-center overflow-hidden max-md:text-sm animate-[1s_ease-in_0.25s_backwards_FadeIn]">
					<h2 className="text-2xl md:text-4xl font-bold text-light-cyan max-xl:mt-8 mb-6">Want to join in the fun?</h2>

					<Letter>
						<p className="mb-4">We’re currently in Closed Alpha and need your feedback to make cowatch better.</p>
						<p className="mb-10">And because we don’t want to leave you alone, once you join you’ll get the chance to invite one of your friends for them to skip the line.</p>

						<Button>
							Join Now

							<svg width="15" height="16" viewBox="0 0 15 16" fill="none" xmlns="http://www.w3.org/2000/svg">
								<path d="M15 8.18027C15 12.6021 12.0215 15.749 7.62295 15.749C3.40574 15.749 0 12.2865 0 7.99902C0 3.71152 3.40574 0.249023 7.62295 0.249023C9.67623 0.249023 11.4037 1.01465 12.7346 2.27715L10.6598 4.30527C7.9457 1.64277 2.89857 3.64277 2.89857 7.99902C2.89857 10.7021 5.02254 12.8928 7.62295 12.8928C10.6414 12.8928 11.7725 10.6928 11.9508 9.55215H7.62295V6.88652H14.8801C14.9508 7.2834 15 7.66465 15 8.18027Z" fill="white"/>
							</svg>
						</Button>
					</Letter>

					<p className="text-[#8F8F8F]">or</p>
					<p>Stay in touch by following us in our socials</p>

					<div className="flex gap-4">
						<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
							<path d="M14.3553 4.74076C14.3655 4.88288 14.3655 5.02504 14.3655 5.16717C14.3655 9.50217 11.066 14.4971 5.03553 14.4971C3.17766 14.4971 1.45178 13.959 0 13.025C0.263969 13.0555 0.51775 13.0656 0.791875 13.0656C2.32484 13.0656 3.73603 12.5479 4.86294 11.6646C3.42131 11.6342 2.21319 10.69 1.79694 9.39051C2 9.42095 2.20303 9.44126 2.41625 9.44126C2.71066 9.44126 3.00509 9.40063 3.27919 9.3296C1.77666 9.02501 0.649719 7.70523 0.649719 6.11132V6.07073C1.08625 6.31438 1.59391 6.46667 2.13194 6.48695C1.24869 5.8981 0.670031 4.89304 0.670031 3.75598C0.670031 3.14685 0.832437 2.58848 1.11672 2.10117C2.73094 4.09101 5.15734 5.39048 7.87812 5.53263C7.82737 5.28898 7.79691 5.0352 7.79691 4.78138C7.79691 2.97426 9.25884 1.5022 11.0761 1.5022C12.0202 1.5022 12.873 1.89813 13.472 2.53773C14.2131 2.3956 14.9238 2.12148 15.5532 1.74585C15.3096 2.50729 14.7918 3.14688 14.1116 3.55295C14.7715 3.48192 15.4111 3.29913 15.9999 3.04535C15.5533 3.69507 14.9949 4.27373 14.3553 4.74076Z" fill="#E5F3F3"/>
						</svg>

						<svg width="20" height="16" viewBox="0 0 20 16" fill="none" xmlns="http://www.w3.org/2000/svg">
							<path d="M16.3906 2.18095C16.3852 2.17085 16.3763 2.16307 16.3656 2.15908C15.1751 1.61277 13.9188 1.22306 12.6281 0.999701C12.6165 0.997576 12.6045 0.999147 12.5939 1.00419C12.5832 1.00924 12.5744 1.01751 12.5687 1.02783C12.3975 1.33854 12.2421 1.6577 12.1031 1.98408C10.7111 1.77279 9.29514 1.77279 7.90311 1.98408C7.76353 1.65689 7.606 1.33766 7.43124 1.02783C7.42521 1.01781 7.41636 1.00981 7.4058 1.0048C7.39523 0.9998 7.38343 0.998025 7.37186 0.999701C6.07892 1.22206 4.82043 1.61179 3.62811 2.15908C3.61766 2.16351 3.60889 2.17117 3.60311 2.18095C1.22186 5.74033 0.568739 9.20908 0.887489 12.6372C0.888391 12.6458 0.89108 12.6542 0.895384 12.6617C0.899689 12.6692 0.905514 12.6758 0.912489 12.681C2.29957 13.7069 3.85078 14.4899 5.49999 14.9966C5.51184 15.0002 5.52455 15.0001 5.53632 14.9962C5.54809 14.9923 5.55833 14.9847 5.56561 14.9747C5.91947 14.493 6.23303 13.9829 6.50311 13.4497C6.50671 13.4424 6.50875 13.4344 6.50911 13.4262C6.50948 13.418 6.50815 13.4099 6.50521 13.4023C6.50228 13.3946 6.49781 13.3877 6.49207 13.3819C6.48633 13.3761 6.47945 13.3715 6.47186 13.3685C5.9764 13.1786 5.49677 12.9498 5.03749 12.6841C5.02937 12.6791 5.02257 12.6723 5.01765 12.6641C5.01274 12.656 5.00985 12.6468 5.00924 12.6373C5.00863 12.6278 5.0103 12.6183 5.01413 12.6095C5.01796 12.6008 5.02383 12.5932 5.03124 12.5872C5.12811 12.5153 5.22499 12.4403 5.31561 12.3653C5.32361 12.3583 5.33343 12.3537 5.34394 12.352C5.35445 12.3504 5.36522 12.3517 5.37499 12.356C8.38124 13.7278 11.6375 13.7278 14.6094 12.356C14.6188 12.3513 14.6294 12.3494 14.6399 12.3505C14.6504 12.3517 14.6604 12.3557 14.6687 12.3622C14.7594 12.4372 14.8562 12.5153 14.9531 12.5872C14.9605 12.5932 14.9664 12.6008 14.9702 12.6095C14.974 12.6183 14.9757 12.6278 14.9751 12.6373C14.9745 12.6468 14.9716 12.656 14.9667 12.6641C14.9618 12.6723 14.955 12.6791 14.9469 12.6841C14.4888 12.9511 14.0089 13.179 13.5125 13.3653C13.5049 13.3684 13.498 13.3729 13.4923 13.3787C13.4865 13.3846 13.4821 13.3915 13.4791 13.3991C13.4762 13.4068 13.4749 13.4149 13.4752 13.4231C13.4756 13.4312 13.4776 13.4392 13.4812 13.4466C13.756 13.9771 14.0694 14.4868 14.4187 14.9716C14.426 14.9816 14.4363 14.9891 14.448 14.9931C14.4598 14.997 14.4725 14.9971 14.4844 14.9935C16.1383 14.4891 17.694 13.7059 19.0844 12.6778C19.0915 12.6728 19.0974 12.6663 19.1017 12.6587C19.1061 12.6512 19.1087 12.6428 19.1094 12.6341C19.4906 8.6747 18.4656 5.23408 16.3906 2.18095ZM6.95311 10.5497C6.04686 10.5497 5.30311 9.71845 5.30311 8.6997C5.30311 7.68095 6.03436 6.84658 6.95311 6.84658C7.88124 6.84658 8.61874 7.68408 8.60311 8.69658C8.60311 9.71845 7.87186 10.5497 6.95311 10.5497ZM13.0594 10.5497C12.1531 10.5497 11.4094 9.71845 11.4094 8.6997C11.4094 7.68095 12.1375 6.84658 13.0594 6.84658C13.9875 6.84658 14.725 7.68408 14.7094 8.69658C14.7094 9.71845 13.9844 10.5497 13.0594 10.5497Z" fill="#E5F3F3"/>
						</svg>
					</div>
				</CenterContainer>
			</main>
		</Fragment>
	);
}

function CenterContainer({ width="1920", className="", children, ...rest}: PropsWithChildren<{
	width?: string;
	className?: string;
}> & HTMLAttributes<HTMLDivElement>) {
	return (
		<div className={`px-8 lg:px-16 mx-auto ${className}`} style={{ maxWidth: width+"px"}} {...rest}>
			{children}
		</div>
	)
}

function GlassDisplay({outerClassName="", className="", children}: PropsWithChildren<{outerClassName?: string; className?: string;}>) {
	return (
		<div className={`relative p-px shadow-[0_0_73px_55px_#000000] ${outerClassName}`}>
			<div className="-z-10 absolute inset-0 rounded-[16px] bg-gradient-to-b from-[#707070] to-[#0E152C] p-px" style={{
				mask: "linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)",
				maskComposite: "exclude",
				WebkitMaskComposite: "xor",
			}}>
			</div>
			<section className={`w-full p-[32px] bg-[#252525]/20 rounded-[16px] backdrop-blur-md sepia-20 ${className}`}>
				{children}
			</section>
		</div>
	)
}

function Button({className="", children}: PropsWithChildren<{className?: string;}>) {
	return (
		<button className={`group relative font-semibold mb-6 cursor-pointer rounded-full shadow-2xl shadow-white/15 ${className}`}>
			<div className="top-full left-1/2 absolute w-[150px] h-[100px] -translate-1/2 bg-radial from-white/15 via-transparent group-hover:animate-button-highlight"></div>
				<div className="overflow-clip relative rounded-full px-[2px] py-[2px] bg-[#79768B] after:absolute after:top-full after:left-1/2 after:-translate-x-1/2 after:-translate-y-1/2 after:w-[100px] after:h-[100px] after:bg-radial after:from-white after:via-transparent hover:after:animate-button">
					<div className="relative z-[5] flex items-center gap-4 hover:gap-6 px-8 py-4 rounded-full bg-black shadow-[inset_0_0_16px] shadow-[#00D0FF]/45 transition-all ease-out">
						{children}
					</div>
				</div>
		</button>
	)
}
