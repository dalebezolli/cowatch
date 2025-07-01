"use client";

import { useEffect } from "react";

export default function Sink() {
	useEffect(() => {
		window.close()
	}, []);

	return (
		<div>
		</div>
	)
}
