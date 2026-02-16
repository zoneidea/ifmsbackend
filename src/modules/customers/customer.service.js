const { getAllCustomers, insertCustomerWithConnection, updateCustomerWithConnection } = require("./customer.repo");
const { encryptToVarbinary } = require("../../utils/crypto");
const { sanitizeConnectionForLog } = require("./audit.helper");

function t(v) {
    if (v === undefined || v === null) return "";
    return String(v).trim();
}

function isValidStatus(v) {
    return v === "ACTIVE" || v === "INACTIVE" || v === "SUSPENDED";
}

function isValidDbType(v) {
    // ตอนนี้รองรับ MSSQL ก่อน
    return v === "MSSQL";
}

function isValidAuthMode(v) {
    // กันไว้ก่อน: SQL / WINDOWS (อนาคต)
    return v === "SQL" || v === "WINDOWS";
}

function isGuid(v) {
  if (!v) return false;
  return /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/.test(v);
}


async function createCustomer(payload, actor) {
    const customerName = t(payload.customerName);
    const status = t(payload.status).toUpperCase();
    const notes = payload.notes === undefined || payload.notes === null ? null : String(payload.notes).trim();

    if (!customerName || customerName.length > 200) {
        return { ok: false, status: 400, code: "INVALID_CUSTOMER_NAME", message: "customerName ไม่ถูกต้อง" };
    }
    if (!isValidStatus(status)) {
        return { ok: false, status: 400, code: "INVALID_STATUS", message: "status ต้องเป็น ACTIVE/INACTIVE/SUSPENDED" };
    }
    if (notes !== null && notes.length > 500) {
        return { ok: false, status: 400, code: "INVALID_NOTES", message: "notes ยาวเกิน 500 ตัวอักษร" };
    }

    // ✅ Connection ต้องมี
    const c = payload.connection || {};
    const connectionName = t(c.connectionName);
    const dbType = t(c.dbType).toUpperCase();
    const host = t(c.host);
    const port = Number(c.port);
    const databaseName = t(c.databaseName);
    const authMode = t(c.authMode).toUpperCase();
    const username = c.username ?? null;
    const password = c.password ?? null;
    const optionsJson = c.optionsJson === undefined ? null : String(c.optionsJson);
    const isActive = c.isActive === undefined ? true : !!c.isActive;

    if (!connectionName || connectionName.length > 100) {
        return { ok: false, status: 400, code: "INVALID_CONNECTION_NAME", message: "connectionName ไม่ถูกต้อง" };
    }
    if (!isValidDbType(dbType)) {
        return { ok: false, status: 400, code: "INVALID_DBTYPE", message: "dbType รองรับเฉพาะ MSSQL ตอนนี้" };
    }
    if (!host || host.length > 255) {
        return { ok: false, status: 400, code: "INVALID_HOST", message: "host ไม่ถูกต้อง" };
    }
    if (!Number.isInteger(port) || port < 1 || port > 65535) {
        return { ok: false, status: 400, code: "INVALID_PORT", message: "port ไม่ถูกต้อง" };
    }
    if (!databaseName || databaseName.length > 128) {
        return { ok: false, status: 400, code: "INVALID_DBNAME", message: "databaseName ไม่ถูกต้อง" };
    }
    if (!isValidAuthMode(authMode)) {
        return { ok: false, status: 400, code: "INVALID_AUTHMODE", message: "authMode ต้องเป็น SQL หรือ WINDOWS" };
    }

    // ถ้า SQL auth ต้องมี username/password
    if (authMode === "SQL") {
        if (!t(username) || !t(password)) {
            return { ok: false, status: 400, code: "MISSING_CREDENTIALS", message: "ต้องระบุ username/password" };
        }
    }

    // ✅ Encrypt credentials (ห้ามเก็บ plain text)
    const encU = encryptToVarbinary(username ?? "");
    const encP = encryptToVarbinary(password ?? "");

    const detail = sanitizeConnectionForLog(
        {
            customerId: null,
            connectionId: null,
            connectionName,
            dbType,
            host,
            port,
            databaseName,
            authMode,
            isActive,
            optionsJson,
            keyVersion: encU.version,
        },
        { credentialsChanged: true, includeIds: false }
    );

    const { customerId, connectionId } = await insertCustomerWithConnection({
        customerName,
        status,
        notes,
        actor,
        connection: {
            connectionName,
            dbType,
            host,
            port,
            databaseName,
            authMode,
            encUsername: encU.data,
            encPassword: encP.data,
            optionsJson,
            isActive,
            keyVersion: encU.version, // ใช้ key version เดียวกัน
        },
        auditMeta: {
            actor,
            ipAddress: payload.__ipAddress ?? null,
            userAgent: payload.__userAgent ?? null,
            detailJson: JSON.stringify(detail),
        },
    });

    return { ok: true, customerId, connectionId };
}

async function updateCustomer(customerId, payload, actor) {
    if (!isGuid(customerId)) {
        return { ok: false, status: 400, code: "INVALID_CUSTOMER_ID", message: "customerId ไม่ถูกต้อง" };
    }

    // อัพเดท customer (ต้องส่งครบเหมือนฟอร์มเดียว)
    const customerName = t(payload.customerName);
    const status = t(payload.status).toUpperCase();
    const notes = payload.notes === undefined || payload.notes === null ? null : String(payload.notes).trim();

    if (!customerName || customerName.length > 200) return { ok: false, status: 400, code: "INVALID_CUSTOMER_NAME", message: "customerName ไม่ถูกต้อง" };
    if (!isValidStatus(status)) return { ok: false, status: 400, code: "INVALID_STATUS", message: "status ต้องเป็น ACTIVE/INACTIVE/SUSPENDED" };
    if (notes !== null && notes.length > 500) return { ok: false, status: 400, code: "INVALID_NOTES", message: "notes ยาวเกิน 500 ตัวอักษร" };

    // connection ต้องมี connectionId
    const c = payload.connection || {};
    const connectionId = t(c.connectionId);
    if (!isGuid(connectionId)) {
        return { ok: false, status: 400, code: "INVALID_CONNECTION_ID", message: "connection.connectionId ไม่ถูกต้อง" };
    }

    const connectionName = t(c.connectionName);
    const dbType = t(c.dbType).toUpperCase();
    const host = t(c.host);
    const port = Number(c.port);
    const databaseName = t(c.databaseName);
    const authMode = t(c.authMode).toUpperCase();
    const optionsJson = c.optionsJson === undefined ? null : String(c.optionsJson);
    const isActive = c.isActive === undefined ? true : !!c.isActive;

    if (!connectionName || connectionName.length > 100) return { ok: false, status: 400, code: "INVALID_CONNECTION_NAME", message: "connectionName ไม่ถูกต้อง" };
    if (!isValidDbType(dbType)) return { ok: false, status: 400, code: "INVALID_DBTYPE", message: "dbType รองรับเฉพาะ MSSQL ตอนนี้" };
    if (!host || host.length > 255) return { ok: false, status: 400, code: "INVALID_HOST", message: "host ไม่ถูกต้อง" };
    if (!Number.isInteger(port) || port < 1 || port > 65535) return { ok: false, status: 400, code: "INVALID_PORT", message: "port ไม่ถูกต้อง" };
    if (!databaseName || databaseName.length > 128) return { ok: false, status: 400, code: "INVALID_DBNAME", message: "databaseName ไม่ถูกต้อง" };
    if (!isValidAuthMode(authMode)) return { ok: false, status: 400, code: "INVALID_AUTHMODE", message: "authMode ต้องเป็น SQL หรือ WINDOWS" };

    // credentials: ส่งมาเมื่ออยากเปลี่ยนเท่านั้น
    let encUsername = null;
    let encPassword = null;
    let keyVersion = Number(process.env.ENC_ACTIVE_KEY_VERSION || 1);

    if (c.username !== undefined || c.password !== undefined) {
        // ถ้า authMode=SQL แล้วส่งมา ต้องครบ
        if (authMode === "SQL") {
            if (!t(c.username) || !t(c.password)) {
                return { ok: false, status: 400, code: "MISSING_CREDENTIALS", message: "ถ้าจะแก้ credentials ต้องส่ง username/password ให้ครบ" };
            }
        }
        const encU = encryptToVarbinary(c.username ?? "");
        const encP = encryptToVarbinary(c.password ?? "");
        encUsername = encU.data;
        encPassword = encP.data;
        keyVersion = encU.version;
    }

    const credentialsChanged = (c.username !== undefined || c.password !== undefined);

    const detail = sanitizeConnectionForLog(
        {
            customerId,
            connectionId,
            connectionName,
            dbType,
            host,
            port,
            databaseName,
            authMode,
            isActive,
            optionsJson,
            keyVersion,
        },
        { credentialsChanged, includeIds: true }
    );

    const updated = await updateCustomerWithConnection({
        customerId,
        customerName,
        status,
        notes,
        actor,
        connection: {
            connectionId,
            connectionName,
            dbType,
            host,
            port,
            databaseName,
            authMode,
            encUsername, // null = ไม่อัพเดท
            encPassword, // null = ไม่อัพเดท
            optionsJson,
            isActive,
            keyVersion,
        },
        auditMeta: {
            actor,
            ipAddress: payload.__ipAddress ?? null,
            userAgent: payload.__userAgent ?? null,
            detailJson: JSON.stringify(detail),
        },
    });

    if (!updated) {
        return { ok: false, status: 404, code: "NOT_FOUND", message: "ไม่พบ customer/connection ที่ต้องการอัพเดท" };
    }

    return { ok: true, customerId, connectionId };
}

async function listCustomers() {
    const rows = await getAllCustomers();

    const data = rows.map((r) => ({
        customerId: r.CustomerId,
        customerName: r.CustomerName,
        status: r.Status,
        notes: r.Notes ?? null,
        createdAt: r.CreatedAt,
        updatedAt: r.UpdatedAt,

        connection: r.ConnectionId
            ? {
                connectionId: r.ConnectionId,
                connectionName: r.ConnectionName,
                dbType: r.DbType,
                host: r.Host,
                port: r.Port,
                databaseName: r.DatabaseName,
                authMode: r.AuthMode,
                optionsJson: r.OptionsJson ?? null,
                isActive: !!r.IsActive,
                lastTestAt: r.LastTestAt,
                lastTestStatus: r.LastTestStatus ?? null,
                lastTestMessage: r.LastTestMessage ?? null,
                keyVersion: r.KeyVersion,
                createdAt: r.ConnectionCreatedAt,
                updatedAt: r.ConnectionUpdatedAt,
            }
            : null,
    }));

    return { ok: true, data };
}

module.exports = { createCustomer, updateCustomer, listCustomers };
