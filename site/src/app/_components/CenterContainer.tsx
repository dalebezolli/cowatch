import { HTMLAttributes, PropsWithChildren } from "react";

export default function CenterContainer({ width="1920", className="", children, ...rest}: PropsWithChildren<{
	width?: string;
	className?: string;
}> & HTMLAttributes<HTMLDivElement>) {
	return (
		<div className={`px-8 lg:px-16 mx-auto ${className}`} style={{ maxWidth: width+"px"}} {...rest}>
			{children}
		</div>
	)
}
