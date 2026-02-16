const { createUser, loginUser, listUsers, deactivateUser } = require("./user.service");

async function postUser(req, res) {
    const result = await createUser(req.body);

    if (!result.ok) {
        return res.status(result.status).json({
            ok: false,
            message: result.message,
        });
    }

    return res.status(201).json({
        ok: true,
        message: "สร้างผู้ใช้สำเร็จ",
    });
}

async function login(req, res) {
    const result = await loginUser(req.body);

    if (!result.ok) {
        return res.status(result.status).json({
            ok: false,
            message: result.message,
        });
    }

    return res.status(200).json({
        ok: true,
        data: result.data,
    });
}

async function getUsers(req, res) {
    const result = await listUsers();
    return res.status(200).json({
        ok: true,
        data: result.data,
        message: "ดึงข้อมูลผู้ใช้สำเร็จ",
    });
}

async function deleteUser(req, res) {
    const username = req.params.username;
    const result = await deactivateUser(username);

    if (!result.ok) {
        return res.status(result.status).json({
            ok: false,
            code: result.code,
            message: result.message,
        });
    }

    return res.status(200).json({
        ok: true,
        message: "ปิดใช้งานผู้ใช้สำเร็จ",
    });
}

module.exports = {
    postUser,
    login,
    getUsers,
    deleteUser,
};
