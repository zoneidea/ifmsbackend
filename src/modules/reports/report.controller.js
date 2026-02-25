const { createReport, listReports, viewerInit, setCustomerReportStatus } = require("./report.service");

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

async function getReports(req, res) {
    const result = await listReports(req.query);
    return res.status(200).json({
        ok: true,
        data: result.data,
        message: "ดึงรายการรายงานสำเร็จ",
    });
}

async function getInit(req, res, next) {
    try {
        const customerId = req.query.customerId;
        console.log(req.query)
        const data = await viewerInit({ customerId });
        return res.status(200).json(data);
    } catch (e) {
        return next(e);
    }
}

async function updateStatusHandler(req, res, next) {
    try {
        const { customerReportId } = req.params;
        const { customerId, isActive } = req.body;

        await setCustomerReportStatus({
            customerReportId,
            customerId,
            isActive
        });

        res.status(200).json({ success: true });
    } catch (e) {
        next(e);
    }
}

module.exports = { postReport, getReports, getInit, updateStatusHandler };
