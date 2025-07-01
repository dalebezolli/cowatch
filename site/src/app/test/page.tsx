"use client"

import { useEffect, useState } from "react";

export default function Test() {
	const [clientID, setClientID] = useState("");

	useEffect(() => {
		const ws = new WebSocket("ws://localhost:8080/auth-await")
		ws.addEventListener("message", (event) => {
			const dataObject = JSON.parse(event.data);
			console.log("Message received:", dataObject);
			setClientID(dataObject.client ?? "");
		})
	}, []);

	return (
		<div className="pt-[128px] text-white">
			test

			<a href={`http://localhost:8080/auth?action=connect&client=${clientID}`} target="_blank">
				Start Listening
			</a>
		</div>
	);
}
