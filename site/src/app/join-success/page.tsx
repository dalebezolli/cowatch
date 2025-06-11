import { Fragment, PropsWithChildren } from "react";
import Letter from "../_components/Letter";
import CenterContainer from "../_components/CenterContainer";

export default function Home() {
	return (
		<Fragment>
			<div className="max-md:hidden -z-20 inset-0 fixed pointer-events-none">
				<div className="absolute left-[20%] w-px h-full bg-white/15"></div>
				<div className="absolute right-[20%] w-px h-full bg-white/15"></div>
			</div>

			<main className="relative text-center text-light font-medium">
				<CenterContainer id="download" className="relative py-[128px] flex flex-col gap-[16px] md:gap-[32px] items-center bg-linear-to-b from-transparent to-dark to-40% overflow-hidden max-md:text-sm animate-[250ms_ease-in_0.25s_backwards_FadeIn]">
					<h2 className="text-2xl md:text-4xl font-bold text-light-cyan max-xl:mt-8 mb-6">Get Ready!</h2>

					<div className="absolute top-[60%] left-[30%] w-px h-px bg-transparent shadow-[0_0_250px_150px] shadow-white/30 animate-[pulse_5s_cubic-bezier(0.4,0,0.6,1)_1s_infinite]"></div>
					<div className="absolute top-[50%] right-[30%] w-px h-px bg-transparent shadow-[0_0_200px_100px] shadow-cyan/30"></div>
					<div className="absolute top-[70%] right-[20%] w-px h-px bg-transparent shadow-[0_0_300px_200px] shadow-cyan/30 animate-[pulse_9s_cubic-bezier(0.4,0,0.6,1)_infinite]"></div>

					<Letter>
						<p className="mb-4">Our hardworking elves are processing your request to join our alpha testers. Once it’s ready we’ll update you through your email and our discord server.</p>
						<p className="mb-10">Until then, feel free to join our discord server and follow us on twitter.</p>

						<div className="flex gap-4">
							<Button link="https://discord.gg/KUHQWqyXt7">
								<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
									<path d="M14.3553 4.74076C14.3655 4.88288 14.3655 5.02504 14.3655 5.16717C14.3655 9.50217 11.066 14.4971 5.03553 14.4971C3.17766 14.4971 1.45178 13.959 0 13.025C0.263969 13.0555 0.51775 13.0656 0.791875 13.0656C2.32484 13.0656 3.73603 12.5479 4.86294 11.6646C3.42131 11.6342 2.21319 10.69 1.79694 9.39051C2 9.42095 2.20303 9.44126 2.41625 9.44126C2.71066 9.44126 3.00509 9.40063 3.27919 9.3296C1.77666 9.02501 0.649719 7.70523 0.649719 6.11132V6.07073C1.08625 6.31438 1.59391 6.46667 2.13194 6.48695C1.24869 5.8981 0.670031 4.89304 0.670031 3.75598C0.670031 3.14685 0.832437 2.58848 1.11672 2.10117C2.73094 4.09101 5.15734 5.39048 7.87812 5.53263C7.82737 5.28898 7.79691 5.0352 7.79691 4.78138C7.79691 2.97426 9.25884 1.5022 11.0761 1.5022C12.0202 1.5022 12.873 1.89813 13.472 2.53773C14.2131 2.3956 14.9238 2.12148 15.5532 1.74585C15.3096 2.50729 14.7918 3.14688 14.1116 3.55295C14.7715 3.48192 15.4111 3.29913 15.9999 3.04535C15.5533 3.69507 14.9949 4.27373 14.3553 4.74076Z" fill="#E5F3F3"/>
								</svg>
							</Button>

							<Button link="https://discord.gg/KUHQWqyXt7">
								<svg width="20" height="16" viewBox="0 0 20 16" fill="none" xmlns="http://www.w3.org/2000/svg">
									<path d="M16.3906 2.18095C16.3852 2.17085 16.3763 2.16307 16.3656 2.15908C15.1751 1.61277 13.9188 1.22306 12.6281 0.999701C12.6165 0.997576 12.6045 0.999147 12.5939 1.00419C12.5832 1.00924 12.5744 1.01751 12.5687 1.02783C12.3975 1.33854 12.2421 1.6577 12.1031 1.98408C10.7111 1.77279 9.29514 1.77279 7.90311 1.98408C7.76353 1.65689 7.606 1.33766 7.43124 1.02783C7.42521 1.01781 7.41636 1.00981 7.4058 1.0048C7.39523 0.9998 7.38343 0.998025 7.37186 0.999701C6.07892 1.22206 4.82043 1.61179 3.62811 2.15908C3.61766 2.16351 3.60889 2.17117 3.60311 2.18095C1.22186 5.74033 0.568739 9.20908 0.887489 12.6372C0.888391 12.6458 0.89108 12.6542 0.895384 12.6617C0.899689 12.6692 0.905514 12.6758 0.912489 12.681C2.29957 13.7069 3.85078 14.4899 5.49999 14.9966C5.51184 15.0002 5.52455 15.0001 5.53632 14.9962C5.54809 14.9923 5.55833 14.9847 5.56561 14.9747C5.91947 14.493 6.23303 13.9829 6.50311 13.4497C6.50671 13.4424 6.50875 13.4344 6.50911 13.4262C6.50948 13.418 6.50815 13.4099 6.50521 13.4023C6.50228 13.3946 6.49781 13.3877 6.49207 13.3819C6.48633 13.3761 6.47945 13.3715 6.47186 13.3685C5.9764 13.1786 5.49677 12.9498 5.03749 12.6841C5.02937 12.6791 5.02257 12.6723 5.01765 12.6641C5.01274 12.656 5.00985 12.6468 5.00924 12.6373C5.00863 12.6278 5.0103 12.6183 5.01413 12.6095C5.01796 12.6008 5.02383 12.5932 5.03124 12.5872C5.12811 12.5153 5.22499 12.4403 5.31561 12.3653C5.32361 12.3583 5.33343 12.3537 5.34394 12.352C5.35445 12.3504 5.36522 12.3517 5.37499 12.356C8.38124 13.7278 11.6375 13.7278 14.6094 12.356C14.6188 12.3513 14.6294 12.3494 14.6399 12.3505C14.6504 12.3517 14.6604 12.3557 14.6687 12.3622C14.7594 12.4372 14.8562 12.5153 14.9531 12.5872C14.9605 12.5932 14.9664 12.6008 14.9702 12.6095C14.974 12.6183 14.9757 12.6278 14.9751 12.6373C14.9745 12.6468 14.9716 12.656 14.9667 12.6641C14.9618 12.6723 14.955 12.6791 14.9469 12.6841C14.4888 12.9511 14.0089 13.179 13.5125 13.3653C13.5049 13.3684 13.498 13.3729 13.4923 13.3787C13.4865 13.3846 13.4821 13.3915 13.4791 13.3991C13.4762 13.4068 13.4749 13.4149 13.4752 13.4231C13.4756 13.4312 13.4776 13.4392 13.4812 13.4466C13.756 13.9771 14.0694 14.4868 14.4187 14.9716C14.426 14.9816 14.4363 14.9891 14.448 14.9931C14.4598 14.997 14.4725 14.9971 14.4844 14.9935C16.1383 14.4891 17.694 13.7059 19.0844 12.6778C19.0915 12.6728 19.0974 12.6663 19.1017 12.6587C19.1061 12.6512 19.1087 12.6428 19.1094 12.6341C19.4906 8.6747 18.4656 5.23408 16.3906 2.18095ZM6.95311 10.5497C6.04686 10.5497 5.30311 9.71845 5.30311 8.6997C5.30311 7.68095 6.03436 6.84658 6.95311 6.84658C7.88124 6.84658 8.61874 7.68408 8.60311 8.69658C8.60311 9.71845 7.87186 10.5497 6.95311 10.5497ZM13.0594 10.5497C12.1531 10.5497 11.4094 9.71845 11.4094 8.6997C11.4094 7.68095 12.1375 6.84658 13.0594 6.84658C13.9875 6.84658 14.725 7.68408 14.7094 8.69658C14.7094 9.71845 13.9844 10.5497 13.0594 10.5497Z" fill="#E5F3F3"/>
								</svg>
							</Button>
						</div>
					</Letter>
				</CenterContainer>
			</main>
		</Fragment>
	);
}

function Button({link, className="", children}: PropsWithChildren<{link: string, className?: string;}>) {
	return (
		<a href={link} target="_blank" className={`block w-fit group relative font-semibold mb-6 cursor-pointer rounded-full shadow-2xl shadow-white/15 ${className}`}>
			<div className="top-full left-1/2 absolute w-[150px] h-[100px] -translate-1/2 bg-radial from-white/15 via-transparent group-hover:animate-button-highlight"></div>
				<div className="overflow-clip relative rounded-full px-[2px] py-[2px] bg-[#79768B] after:absolute after:top-full after:left-1/2 after:-translate-x-1/2 after:-translate-y-1/2 after:w-[100px] after:h-[100px] after:bg-radial after:from-white after:via-transparent hover:after:animate-button">
					<div className="relative z-[5] flex items-center gap-4 hover:gap-6 px-4 py-4 rounded-full bg-black shadow-[inset_0_0_16px] shadow-[#00D0FF]/45 transition-all ease-out">
						{children}
					</div>
				</div>
		</a>
	)
}
