export async function sleep(ms: number) {
	await new Promise((resolve, _) => {
		setTimeout(() => resolve(null), ms)
	});
}
