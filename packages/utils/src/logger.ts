//
// Right now logger will just export console. This lets us pretend that we have
// logging setup, when in reality we don't. But in the future, we can just do
//
// export { createLogger, COLORS };
//
// ...
//
// const logger = createLogger({ color: COLORS.orange, "trpc/member/mutate" })
//
// ...
//
// logger.error("Something happened!!!", err)
//

// TODO: implement a real logger
export const logger = console;
