export async function sleep(ms: number) {
	await new Promise((resolve: any, _) => {
		setTimeout(() => resolve(null), ms)
	});
}
