const { sql, getPool } = require("../../db");

async function insertUser({ username, passwordHash }) {
    const pool = await getPool();
    const req = pool.request();

    req.input("Username", sql.NVarChar(50), username);
    req.input("PasswordHash", sql.VarBinary(256), passwordHash);

    const q = `
    INSERT INTO iFMSReportUsers (Username, PasswordHash, IsActive)
    VALUES (@Username, @PasswordHash, 1);
  `;

    await req.query(q);
}

async function getUserByUsername(username) {
    const pool = await getPool();
    const req = pool.request();

    req.input("Username", sql.NVarChar(50), username);

    const q = `
    SELECT Username, PasswordHash, IsActive
    FROM iFMSReportUsers
    WHERE Username = @Username;
  `;

    const r = await req.query(q);
    return r.recordset[0] || null;
}

async function getAllUsers() {
    const pool = await getPool();
    const req = pool.request();

    const q = `
    SELECT Username, IsActive, CreatedAt, UpdatedAt
    FROM iFMSReportUsers
    ORDER BY Username ASC;
  `;

    const r = await req.query(q);
    return r.recordset || [];
}

async function softDeleteUser(username) {
    const pool = await getPool();
    const req = pool.request();

    req.input("Username", sql.NVarChar(50), username);

    const q = `
    UPDATE iFMSReportUsers
    SET IsActive = 0,
        UpdatedAt = SYSUTCDATETIME()
    WHERE Username = @Username AND IsActive = 1;

    SELECT @@ROWCOUNT AS Affected;
  `;

    const r = await req.query(q);
    return (r.recordset?.[0]?.Affected || 0) > 0;
}

module.exports = {
    insertUser,
    getUserByUsername,
    getAllUsers,
    softDeleteUser,
};
