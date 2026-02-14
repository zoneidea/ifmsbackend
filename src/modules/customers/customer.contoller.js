const { createCustomer, updateCustomer, listCustomers } = require("./customer.service");

async function postCustomer(req, res) {
    // ในระบบจริง actor มาจาก SSO/JWT แต่ตอนนี้ยังไม่ทำ
    // เลยให้ใช้ header ที่ปลอดภัยพอสำหรับ audit เบื้องต้น
    const ipAddress = (req.ip || "").toString().slice(0, 45);
    const userAgent = (req.headers["user-agent"] || "").toString().slice(0, 300);
    const actor = (req.headers["x-actor"] || "system").toString().slice(0, 100);

    req.body = {
        ...(req.body || {}),
        __ipAddress: ipAddress,
        __userAgent: userAgent,
    };

    const result = await createCustomer(req.body || {}, actor);

    if (!result.ok) {
        return res.status(result.status).json({
            ok: false,
            code: result.code,
            message: result.message,
        });
    }

    return res.status(201).json({
        ok: true,
        data: {
            customerId: result.customerId,
            connectionId: result.connectionId,
        },
        message: "สร้างลูกค้าสำเร็จ",
    });
}

async function putCustomer(req, res) {
    const ipAddress = (req.ip || "").toString().slice(0, 45);
    const userAgent = (req.headers["user-agent"] || "").toString().slice(0, 300);
    const actor = (req.headers["x-actor"] || "system").toString().slice(0, 100);

    req.body = {
        ...(req.body || {}),
        __ipAddress: ipAddress,
        __userAgent: userAgent,
    };

    const customerId = String(req.params.customerId || "");

    const result = await updateCustomer(customerId, req.body || {}, actor);

    if (!result.ok) return res.status(result.status).json({ ok: false, code: result.code, message: result.message });

    return res.status(200).json({
        ok: true,
        data: { customerId: result.customerId, connectionId: result.connectionId },
        message: "อัพเดทข้อมูลสำเร็จ",
    });
}

async function getCustomers(req, res) {
    const result = await listCustomers();
    return res.status(200).json({
        ok: true,
        data: result.data,
        message: "ดึงข้อมูลลูกค้าสำเร็จ",
    });
}


module.exports = { postCustomer, putCustomer, getCustomers };
