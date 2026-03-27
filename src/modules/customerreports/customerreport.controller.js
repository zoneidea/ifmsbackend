const { ReportSeaShipment } = require('./customerreport.service')

async function getReportSeaShipment(req, res) {
    const result = await ReportSeaShipment(req.query);
    return res.status(200).json({
        ok: true,
        data: result,
        message: "ดึงรายการรายงานสำเร็จ",
    });
}

module.exports = { getReportSeaShipment };