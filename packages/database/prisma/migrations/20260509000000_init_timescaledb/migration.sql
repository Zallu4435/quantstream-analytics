-- Create the trades and candles tables if they don't exist yet (usually handled by Prisma)
-- But we need to ensure they are hypertables.

SELECT create_hypertable('trades', 'timestamp', if_not_exists => TRUE);
SELECT create_hypertable('candles', 'timestamp', if_not_exists => TRUE);
