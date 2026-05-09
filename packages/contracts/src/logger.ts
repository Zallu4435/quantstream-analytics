import pino from "pino";

/**
 * Creates a structured JSON logger for the given service.
 * In development, it pretty-prints. In production, it outputs raw JSON for ELK/LGTM parsing.
 */
export const createLogger = (serviceName: string) => {
  const isProduction = process.env.NODE_ENV === "production";

  return pino({
    name: serviceName,
    level: process.env.LOG_LEVEL || "info",
    transport: isProduction
      ? undefined // Raw JSON in prod
      : {
          target: "pino-pretty",
          options: {
            colorize: true,
            translateTime: "SYS:standard",
            ignore: "pid,hostname",
          },
        },
    formatters: {
      level: (label) => {
        return { level: label.toUpperCase() };
      },
    },
  });
};
