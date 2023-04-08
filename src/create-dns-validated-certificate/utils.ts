export async function backoff(attempt: number): Promise<void> {
  const base = Math.pow(2, attempt);
  await sleep(Math.random() * base * 50 + base * 150);
}

export async function sleep(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}
