const { reportSeaShipment } = require('./customerreport.repo')

function isGuid(v) {
    if (!v) return false;
    return /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/.test(v);
}

async function ReportSeaShipment(query) {
    const q = query || {};

    if (!isGuid(q.customerId)) {
        const err = new Error("INVALID_CUSTOMER_ID");
        err.statusCode = 400;
        throw err;
    }

    // if (!isGuid(q.reportId)) {
    //     const err = new Error("INVALID_REPORT_ID");
    //     err.statusCode = 400;
    //     throw err;
    // }

    return await reportSeaShipment(q.customerId);

}

module.exports = { ReportSeaShipment };