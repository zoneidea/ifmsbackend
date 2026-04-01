const sql = require("mssql");

function t(v) {
    return (v === undefined || v === null) ? "" : String(v).trim();
}

function toInt(v, fallback = null) {
    const n = Number(v);
    return Number.isInteger(n) ? n : fallback;
}

function safeMsg(err) {
    const msg = (err?.message || "Connection failed").toString();
    return msg.length > 800 ? msg.slice(0, 800) : msg;
}

async function testConnectionService(payload, meta) {
    // Expected payload:
    // {
    //   dbType: "MSSQL",
    //   host, port, databaseName,
    //   authMode: "SQL" | "WINDOWS",
    //   username, password,   // required if SQL
    //   options: { encrypt?: boolean, trustServerCertificate?: boolean },
    //   timeouts: { connectionTimeoutMs?: number, requestTimeoutMs?: number }
    // }

    const dbType = t("MSSQL").toUpperCase();
    // if (dbType !== "MSSQL") {
    //     return { ok: false, httpStatus: 400, message: "dbType รองรับเฉพาะ MSSQL" };
    // }

    const host = t(payload.host);
    const port = toInt(payload.port, 1433);
    const databaseName = t(payload.databaseName);
    const authMode = t("SQL").toUpperCase();

    if (!host || host.length > 255) return { ok: false, httpStatus: 400, message: "host ไม่ถูกต้อง" };
    if (!Number.isInteger(port) || port < 1 || port > 65535) return { ok: false, httpStatus: 400, message: "port ไม่ถูกต้อง" };
    if (!databaseName || databaseName.length > 128) return { ok: false, httpStatus: 400, message: "databaseName ไม่ถูกต้อง" };
    // if (authMode !== "SQL" && authMode !== "WINDOWS") return { ok: false, httpStatus: 400, message: "authMode ต้องเป็น SQL หรือ WINDOWS" };

    const username = payload.username ?? null;
    const password = payload.password ?? null;

    // if (authMode === "SQL") {
    //     if (!t(username) || !t(password)) {
    //         return { ok: false, httpStatus: 400, message: "ต้องระบุ username/password" };
    //     }
    // }

    const encrypt = false;
    const trustServerCertificate = true;

    const connectionTimeout = toInt(payload?.timeouts?.connectionTimeoutMs, 5000);
    const requestTimeout = toInt(payload?.timeouts?.requestTimeoutMs, 5000);

    // ✅ IMPORTANT: ใช้ ConnectionPool ใหม่ ไม่ใช้ sql.connect(global)
    const config = {
        // server: host,
        port,
        database: databaseName,
        options: { encrypt, trustServerCertificate },
        pool: { max: 1, min: 0, idleTimeoutMillis: 3000 },
        connectionTimeout,
        requestTimeout,
    };

    // SQL Auth: ใส่ user/pass
    if (authMode === "SQL") {
        config.user = t(username);
        config.password = String(password);
    }

    // WINDOWS Auth:
    // - ถ้าจะใช้ Windows Integrated Auth บน Node ต้องใช้ driver/setting เพิ่ม (msnodesqlv8)
    // - ตอนนี้เราจะคืน error ชัดๆ ไปก่อนเพื่อไม่ให้เข้าใจผิด
    // if (authMode === "WINDOWS") {
    //     return {
    //         ok: false,
    //         httpStatus: 400,
    //         message: "WINDOWS auth ต้องใช้ driver msnodesqlv8 (ยังไม่ได้เปิดใช้ใน endpoint นี้)",
    //     };
    // }

    const pool = new sql.ConnectionPool(config);
    try {
        await pool.connect();
        await pool.request().query("SELECT 1 AS ok");

        return {
            ok: true,
            httpStatus: 200,
            message: "Connection successful",
            data: {
                dbType,
                host,
                port,
                databaseName,
                authMode,
                options: { encrypt, trustServerCertificate },
                timeouts: { connectionTimeout, requestTimeout },
            },
        };
    } catch (err) {
        return {
            ok: false,
            httpStatus: 400,
            message: safeMsg(err),
        };
    } finally {
        try { await pool.close(); } catch (_) { }
    }
}

module.exports = { testConnectionService };
