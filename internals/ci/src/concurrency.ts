export async function runWithConcurrency(
  paths: string[],
  fn: (workerId: number, path: string) => Promise<void>,
  concurrency: number,
): Promise<void> {
  const queue = [...paths];

  async function worker(id: number): Promise<void> {
    while (queue.length > 0) {
      const item = queue.shift();
      if (item) {
        await fn(id, item);
      }
    }
  }

  console.log("Spawning %s workers", concurrency);
  const workers = [];
  for (let idx = 0; idx < concurrency; idx += 1) {
    workers.push(worker(idx));
  }

  await Promise.all(workers);
}
