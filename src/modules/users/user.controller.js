const { createUser, loginUser } = require("./user.service");

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

module.exports = {
    postUser,
    login,
};
