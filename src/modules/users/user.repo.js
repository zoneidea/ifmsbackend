const { sql, getPool } = require("../../db");

async function insertUser({ username, passwordHash }) {
    const pool = await getPool();
    const req = pool.request();

    req.input("Username", sql.NVarChar(50), username);
    req.input("PasswordHash", sql.VarBinary(256), passwordHash);

    const q = `
    INSERT INTO Users (Username, PasswordHash, IsActive)
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
    FROM Users
    WHERE Username = @Username;
  `;

    const r = await req.query(q);
    return r.recordset[0] || null;
}

module.exports = {
    insertUser,
    getUserByUsername,
};
