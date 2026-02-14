function sanitizeConnectionForLog(conn, opts = {}) {
    const {
        credentialsChanged = false,
        includeIds = true,
    } = opts;

    return {
        ...(includeIds ? { connectionId: conn.connectionId, customerId: conn.customerId } : {}),
        connectionName: conn.connectionName,
        dbType: conn.dbType,
        host: conn.host,
        port: conn.port,
        databaseName: conn.databaseName,
        authMode: conn.authMode,
        isActive: !!conn.isActive,
        optionsJson: conn.optionsJson ?? null,
        keyVersion: conn.keyVersion ?? null,
        credentialsChanged: !!credentialsChanged, // ✅ แค่บอกว่าเปลี่ยนหรือไม่ ไม่บอกค่า
    };
}

module.exports = { sanitizeConnectionForLog };
