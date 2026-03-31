const sql = require("mssql");
const { decryptFromVarbinary } = require("../utils/crypto");

const poolCache = new Map();

function safeJsonParse(txt, fallback = {}) {
    if (!txt) return fallback;
    try {
        return JSON.parse(txt);
    } catch {
        return fallback;
    }
}

function buildPoolKey(cfg) {
    return [
        cfg.customerId,
        cfg.connectionId,
        cfg.host,
        cfg.port,
        cfg.databaseName,
        cfg.authMode
    ].join("|");
}

async function getClientPool(connectionConfig) {
    const key = buildPoolKey(connectionConfig);

    if (poolCache.has(key)) {
        return poolCache.get(key);
    }

    const username = decryptFromVarbinary(connectionConfig.encUsername, connectionConfig.keyVersion);
    const password = decryptFromVarbinary(connectionConfig.encPassword, connectionConfig.keyVersion);

    const extraOptions = safeJsonParse(connectionConfig.optionsJson, {});

    const pool = new sql.ConnectionPool({
        user: username || undefined,
        password: password || undefined,
        server: connectionConfig.host,
        port: Number(connectionConfig.port || 1433),
        database: connectionConfig.databaseName,
        options: {
            encrypt: false,
            trustServerCertificate: true,
            ...(extraOptions.options || {})
        },
        pool: {
            max: 10,
            min: 0,
            idleTimeoutMillis: 30000,
            ...(extraOptions.pool || {})
        },
        requestTimeout: extraOptions.requestTimeout || 60000,
        connectionTimeout: extraOptions.connectionTimeout || 30000
    });

    const connectPromise = pool.connect()
        .then(() => pool)
        .catch((err) => {
            poolCache.delete(key);
            throw err;
        });

    poolCache.set(key, connectPromise);
    return connectPromise;
}

function clearClientPoolCache(connectionConfig) {
    const key = buildPoolKey(connectionConfig);
    poolCache.delete(key);
}

module.exports = {
    getClientPool,
    clearClientPoolCache
};