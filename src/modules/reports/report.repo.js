const { sql, getPool } = require("../../db");

async function insertReportWithSettings({
    reportKey,
    reportName,
    reportPath,
    templateKey,
    dataSourceKey,
    exportModes,
    isActive,
    settings,
}) {
    const pool = await getPool();
    const tx = new sql.Transaction(pool);
    await tx.begin();

    try {
        // 1) Insert Report
        const req1 = new sql.Request(tx);
        req1.input("ReportKey", sql.VarChar(80), reportKey);
        req1.input("ReportName", sql.NVarChar(200), reportName);
        req1.input("ReportPath", sql.NVarChar(300), reportPath ?? null);
        req1.input("TemplateKey", sql.NVarChar(120), templateKey);
        req1.input("DataSourceKey", sql.NVarChar(120), dataSourceKey);
        req1.input("ExportModes", sql.VarChar(50), exportModes ?? "PDF,EXCEL");
        req1.input("IsActive", sql.Bit, isActive ? 1 : 0);

        const q1 = `
      INSERT INTO Report
        (ReportId, ReportKey, ReportName, ReportPath, TemplateKey, DataSourceKey, ExportModes, IsActive, CreatedAt, UpdatedAt)
      OUTPUT INSERTED.ReportId
      VALUES
        (NEWID(), @ReportKey, @ReportName, @ReportPath, @TemplateKey, @DataSourceKey, @ExportModes, @IsActive, SYSUTCDATETIME(), SYSUTCDATETIME());
    `;
        const r1 = await req1.query(q1);
        const reportId = r1.recordset?.[0]?.ReportId;

        // 2) Insert ReportSettings
        const req2 = new sql.Request(tx);
        req2.input("ReportId", sql.UniqueIdentifier, reportId);
        req2.input("ParamSchemaJson", sql.NVarChar(sql.MAX), settings?.paramSchemaJson ?? null);
        req2.input("ColumnsJson", sql.NVarChar(sql.MAX), settings?.columnsJson ?? null);
        req2.input("DefaultConfigJson", sql.NVarChar(sql.MAX), settings?.defaultConfigJson ?? null);

        const q2 = `
      INSERT INTO ReportSettings
        (ReportId, ParamSchemaJson, ColumnsJson, DefaultConfigJson, UpdatedAt)
      VALUES
        (@ReportId, @ParamSchemaJson, @ColumnsJson, @DefaultConfigJson, SYSUTCDATETIME());
    `;
        await req2.query(q2);

        await tx.commit();
        return { reportId };
    } catch (err) {
        await tx.rollback();
        throw err;
    }
}

module.exports = { insertReportWithSettings };
