const { sql, getPool } = require("../../db");

async function reportSeaShipment(
    // customerReportId,
    conn,
    customerId
) {
    // const pool = await getPool();
    // const req = pool.request();
    const req = conn.request();
    const sql = `SELECT
                    SJ.ETD,
                    SJ.ETA,
                    ISNULL(RTRIM(SJ.JOB_NO_PREFIX), '')
                        + ISNULL(CAST(SJ.JOB_NO AS varchar(20)), '')
                        + ISNULL(RTRIM(SJ.JOB_NO_SUFFIX), '') AS [Job No.],
                    SJ.JOB_DATE,
                    RTRIM(SJ.JOB_TYPE) AS [Job Type],
                    RTRIM(SJ.JOB_STATUS) AS [Status],
                    SJ.ACTUAL_QTY AS [Qty.],
                    SJ.DESTN AS [Destination],
                    RTRIM(AG.AGENT_NAME) AS [Agent],
                    SP.SALES_NAME AS [Salesperson],
                    RTRIM(SJ.CON_TYPE) AS [Con. Type],
                    RTRIM(SJ.OBL_NO) AS [O-B/L No.],
                    CASE
                        WHEN HB.HBL_COUNT IS NULL OR HB.HBL_COUNT = 0 THEN NULL
                        WHEN HB.HBL_COUNT = 1 THEN HB.FIRST_HBL_NO
                        ELSE HB.FIRST_HBL_NO + ' #'+ CAST(HB.HBL_COUNT AS varchar(10)) + ' HB/L(s)'
                    END AS [H-B/L No.]
                FROM FMS.dbo.SEA_JOB SJ
                LEFT JOIN FMS.dbo.AGENT AG
                    ON AG.REC_ID = SJ.AGENT_ID
                LEFT JOIN FMS.dbo.SALESPERSON SP
                    ON SP.REC_ID = SJ.SALE_ID
                OUTER APPLY (
                    SELECT
                        MIN(RTRIM(H.HBL_NO)) AS FIRST_HBL_NO,
                        COUNT(*) AS HBL_COUNT
                    FROM FMS.dbo.HBL H
                    WHERE H.JOB_ID = SJ.REC_ID
                    AND NULLIF(RTRIM(H.HBL_NO), '') IS NOT NULL
                ) HB
                WHERE SJ.ACTIVE_FLAG = 1 AND SJ.JOB_STATUS = 'ACTIVE'
                ORDER BY SJ.JOB_DATE, SJ.JOB_NO;`;
    const r = await req.query(sql);
    return r.recordset || [];
}

async function reportSeaShipment2(
    // customerReportId,
    conn,
    filters = {}
) {
    let where = `WHERE ISNULL(SJ.ACTIVE_FLAG, 0) = 1`;

    if (filters.date_start) {
        req.input("date_start", sql.DateTime, filters.date_start);
        where += ` AND SJ.JOB_DATE >= @date_start`;
    }

    if (filters.date_end) {
        req.input("date_end", sql.DateTime, filters.date_end);
        where += ` AND SJ.JOB_DATE < DATEADD(DAY, 1, @date_end)`;
    }

    if (filters.job_type) {
        req.input("job_type", sql.VarChar(10), filters.job_type);
        where += ` AND SJ.JOB_TYPE = @job_type`;
    }

    if (filters.agent_id) {
        req.input("agent_id", sql.Int, Number(filters.agent_id));
        where += ` AND SJ.AGENT_ID = @agent_id`;
    }

    if (filters.sales_id) {
        req.input("sales_id", sql.Int, Number(filters.sales_id));
        where += ` AND SJ.SALE_ID = @sales_id`;
    }
    const req = conn.request();
    const sql = `SELECT
                    SJ.ETD,
                    SJ.ETA,
                    ISNULL(RTRIM(SJ.JOB_NO_PREFIX), '')
                        + ISNULL(CAST(SJ.JOB_NO AS varchar(20)), '')
                        + ISNULL(RTRIM(SJ.JOB_NO_SUFFIX), '') AS [Job No.],
                    SJ.JOB_DATE,
                    RTRIM(SJ.JOB_TYPE) AS [Job Type],
                    RTRIM(SJ.JOB_STATUS) AS [Status],
                    SJ.ACTUAL_QTY AS [Qty.],
                    SJ.DESTN AS [Destination],
                    RTRIM(AG.AGENT_NAME) AS [Agent],
                    SP.SALES_NAME AS [Salesperson],
                    RTRIM(SJ.CON_TYPE) AS [Con. Type],
                    RTRIM(SJ.OBL_NO) AS [O-B/L No.],
                    CASE
                        WHEN HB.HBL_COUNT IS NULL OR HB.HBL_COUNT = 0 THEN NULL
                        WHEN HB.HBL_COUNT = 1 THEN HB.FIRST_HBL_NO
                        ELSE HB.FIRST_HBL_NO + ' #'+ CAST(HB.HBL_COUNT AS varchar(10)) + ' HB/L(s)'
                    END AS [H-B/L No.]
                FROM FMS.dbo.SEA_JOB SJ
                LEFT JOIN FMS.dbo.AGENT AG
                    ON AG.REC_ID = SJ.AGENT_ID
                LEFT JOIN FMS.dbo.SALESPERSON SP
                    ON SP.REC_ID = SJ.SALE_ID
                OUTER APPLY (
                    SELECT
                        MIN(RTRIM(H.HBL_NO)) AS FIRST_HBL_NO,
                        COUNT(*) AS HBL_COUNT
                    FROM FMS.dbo.HBL H
                    WHERE H.JOB_ID = SJ.REC_ID
                    AND NULLIF(RTRIM(H.HBL_NO), '') IS NOT NULL
                ) HB
                ${where}
                ORDER BY SJ.JOB_DATE, SJ.JOB_NO;`;
    const r = await req.query(sql);
    return r.recordset || [];
}

module.exports = { reportSeaShipment, reportSeaShipment2 };