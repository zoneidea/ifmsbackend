const { testConnectionService } = require("./connection.service");

async function testConnection(req, res) {
    const actor = (req.headers["x-actor"] || "system").toString().slice(0, 100);
    const ipAddress = (req.ip || "").toString().slice(0, 45);
    const userAgent = (req.headers["user-agent"] || "").toString().slice(0, 300);

    const result = await testConnectionService(req.body || {}, { actor, ipAddress, userAgent });

    return res.status(result.httpStatus).json({
        ok: result.ok,
        message: result.message,
        data: result.data || null,
    });
}

module.exports = { testConnection };
