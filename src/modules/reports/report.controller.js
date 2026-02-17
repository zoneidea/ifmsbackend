const { createReport } = require("./report.service");

async function postReport(req, res) {
    const result = await createReport(req.body || {});
    if (!result.ok) {
        return res.status(result.status).json({ ok: false, code: result.code, message: result.message });
    }
    return res.status(201).json({
        ok: true,
        data: { reportId: result.reportId },
        message: "สร้างรายงานและตั้งค่าสำเร็จ",
    });
}

module.exports = { postReport };
