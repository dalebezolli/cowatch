export async function sleep(ms: number) {
	await new Promise((resolve: any, _) => {
		setTimeout(() => resolve(null), ms)
	});
}

export function getCurrentVideoId() {
	return (location.href.split('watch?v=')[1] ?? '').split('&')[0];
}
