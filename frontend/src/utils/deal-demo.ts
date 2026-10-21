export function dealDemoState(input: {
  startedAt: number | null;
  durationSeconds: number;
  now: number;
  completed: number;
  target: number;
  settled: boolean;
}) {
  const remaining =
    input.startedAt === null
      ? input.durationSeconds
      : Math.max(
          0,
          Math.ceil(
            (input.startedAt + input.durationSeconds * 1000 - input.now) / 1000,
          ),
        );
  const expired = input.startedAt !== null && remaining === 0;
  const state =
    input.startedAt === null
      ? "PENDING"
      : !expired
        ? "ACTIVE"
        : !input.settled
          ? "SETTLING"
          : input.completed >= input.target
            ? "ACHIEVED"
            : "REVIEW_REQUIRED";
  return { remaining, expired, state };
}
