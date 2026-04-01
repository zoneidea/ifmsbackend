const { reportSeaShipment, reportSeaShipment2 } = require('./customerreport.repo')
const { getClientPool } = require("../../clientDbManager");
const { getCustomerConnectionForReport } = require("../customers/customer.service");

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

    const customerConnection = await getCustomerConnectionForReport(q.customerId);
    const conn = await getClientPool(customerConnection);
    return await reportSeaShipment(conn, q.customerId);

}

async function ReportSeaShipment2(query) {
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

    const customerConnection = await getCustomerConnectionForReport(q.customerId);
    const conn = await getClientPool(customerConnection);
    return await reportSeaShipment2(conn, q.customerId);

}

module.exports = { ReportSeaShipment, ReportSeaShipment2 };