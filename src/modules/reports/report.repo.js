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

async function getAllReports({ isActive } = {}) {
  const pool = await getPool();
  const req = pool.request();

  let where = "";
  if (isActive === true) where = "WHERE r.IsActive = 1";
  if (isActive === false) where = "WHERE r.IsActive = 0";

  const q = `
    SELECT
      r.ReportId,
      r.ReportKey,
      r.ReportName,
      r.ReportPath,
      r.TemplateKey,
      r.DataSourceKey,
      r.ExportModes,
      r.IsActive,
      r.CreatedAt,
      r.UpdatedAt,

      CASE WHEN rs.ReportId IS NULL THEN 0 ELSE 1 END AS HasSettings,
      rs.UpdatedAt AS SettingsUpdatedAt
    FROM Report r
    LEFT JOIN ReportSettings rs ON rs.ReportId = r.ReportId
    ${where}
    ORDER BY r.UpdatedAt DESC;
  `;

  const r = await req.query(q);
  return r.recordset || [];
}

async function getViewerInit(customerId) {
  const pool = await getPool();
  const req = pool.request();
  req.input("CustomerId", sql.UniqueIdentifier, customerId);

  const q = `
    SELECT
      c.CustomerId,
      c.CustomerName,
      c.Status,

      cr.CustomerReportId,
      cr.ReportId,
      cr.MenuName,
      cr.SortOrder,
      cr.IsActive AS CustomerReportIsActive,
      cr.ConnectionId,
      cr.OverrideJson,

      r.ReportKey,
      r.ReportName,
      r.ReportPath,
      r.TemplateKey,
      r.DataSourceKey,
      r.ExportModes,
      r.IsActive AS ReportIsActive,

      rs.ParamSchemaJson,
      rs.ColumnsJson,
      rs.DefaultConfigJson
    FROM CustomerReports cr
    JOIN Customers c ON c.CustomerId = cr.CustomerId
    JOIN Report r ON r.ReportId = cr.ReportId
    LEFT JOIN ReportSettings rs ON rs.ReportId = r.ReportId
    WHERE
      cr.CustomerId = @CustomerId
      AND c.Status IN ('ACTIVE','INACTIVE','SUSPENDED')
      AND cr.IsActive = 1
      AND r.IsActive = 1
    ORDER BY
      ISNULL(cr.SortOrder, 999999) ASC,
      cr.UpdatedAt DESC;
  `;

  const r = await req.query(q);
  return r.recordset || [];
}

module.exports = { insertReportWithSettings, getAllReports, getViewerInit };
