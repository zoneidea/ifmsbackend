const bcrypt = require("bcrypt");
const { insertUser, getUserByUsername, getAllUsers, softDeleteUser } = require("./user.repo");

function t(v) {
    return (v || "").toString().trim();
}

async function createUser(payload) {
    const username = t(payload.username);
    const password = t(payload.password);

    if (!username || username.length > 50) {
        return { ok: false, status: 400, message: "username ไม่ถูกต้อง" };
    }

    if (!password || password.length < 8) {
        return { ok: false, status: 400, message: "password ต้องอย่างน้อย 8 ตัว" };
    }

    const existing = await getUserByUsername(username);
    if (existing) {
        return { ok: false, status: 409, message: "username ซ้ำ" };
    }

    const saltRounds = 12; // production safe
    const hashString = await bcrypt.hash(password, saltRounds);

    // แปลงเป็น Buffer ก่อนเก็บ VARBINARY
    const hashBuffer = Buffer.from(hashString, "utf8");

    await insertUser({
        username,
        passwordHash: hashBuffer,
    });

    return { ok: true };
}

async function loginUser(payload) {
    const username = t(payload.username);
    const password = t(payload.password);

    const user = await getUserByUsername(username);

    // กัน timing attack
    if (!user || !user.IsActive) {
        await bcrypt.compare(password, "$2b$12$invalidinvalidinvalidinvalidinv");
        return { ok: false, status: 401, message: "invalid credentials" };
    }

    const hashString = user.PasswordHash.toString("utf8");

    const match = await bcrypt.compare(password, hashString);

    if (!match) {
        return { ok: false, status: 401, message: "invalid credentials" };
    }

    return {
        ok: true,
        data: {
            username: user.Username,
        },
    };
}

async function listUsers() {
    const rows = await getAllUsers();
    return {
        ok: true,
        data: rows.map((u) => ({
            username: u.Username,
            isActive: !!u.IsActive,
            createdAt: u.CreatedAt,
            updatedAt: u.UpdatedAt,
        })),
    };
}

async function deactivateUser(username) {
    const un = t(username);

    if (!un || un.length > 50) {
        return { ok: false, status: 400, code: "INVALID_USERNAME", message: "username ไม่ถูกต้อง" };
    }

    const updated = await softDeleteUser(un);

    if (!updated) {
        // ไม่เจอ user หรือ user ถูกปิดไปแล้ว
        return { ok: false, status: 404, code: "NOT_FOUND", message: "ไม่พบผู้ใช้ หรือถูกปิดใช้งานแล้ว" };
    }

    return { ok: true };
}

module.exports = {
    createUser,
    loginUser,
    listUsers,
    deactivateUser,
};
