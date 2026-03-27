const { sql, getPool } = require("../../db");

async function insertConnectionAuditLog(tx, { connectionId, action, actor, ipAddress, userAgent, detailJson }) {
  const req = new sql.Request(tx);
  req.input("ConnectionId", sql.UniqueIdentifier, connectionId);
  req.input("Action", sql.VarChar(30), action);
  req.input("Actor", sql.NVarChar(150), actor ?? "system");
  req.input("IpAddress", sql.NVarChar(45), ipAddress ?? null);
  req.input("UserAgent", sql.NVarChar(300), userAgent ?? null);
  req.input("DetailJson", sql.NVarChar(sql.MAX), detailJson ?? null);

  const q = `
    INSERT INTO iFMSReportConnectionAuditLogs
      (ConnectionId, Action, Actor, IpAddress, UserAgent, DetailJson, CreatedAt)
    VALUES
      (@ConnectionId, @Action, @Actor, @IpAddress, @UserAgent, @DetailJson, SYSUTCDATETIME());
  `;
  await req.query(q);
}

async function insertCustomerWithConnection({
  customerName,
  status,
  notes,
  actor,
  connection, // object ที่ผ่านการ validate + encrypt แล้ว
  auditMeta
}) {
  const pool = await getPool();
  const tx = new sql.Transaction(pool);

  await tx.begin();

  try {
    // 1) Insert Customers
    const req1 = new sql.Request(tx);
    req1.input("CustomerName", sql.NVarChar(200), customerName);
    req1.input("Status", sql.VarChar(20), status);
    req1.input("Notes", sql.NVarChar(500), notes ?? null);
    req1.input("Actor", sql.NVarChar(100), actor ?? "system");

    const q1 = `
      INSERT INTO iFMSReportCustomers
        (CustomerId, CustomerName, Status, Notes, CreatedAt, UpdatedAt, CreatedBy, UpdatedBy)
      OUTPUT INSERTED.CustomerId
      VALUES
        (NEWID(), @CustomerName, @Status, @Notes, SYSUTCDATETIME(), SYSUTCDATETIME(), @Actor, @Actor);
    `;

    const r1 = await req1.query(q1);
    const customerId = r1.recordset?.[0]?.CustomerId;

    // 2) Insert CustomerDbConnections
    const req2 = new sql.Request(tx);
    req2.input("ConnectionName", sql.NVarChar(100), connection.connectionName);
    req2.input("CustomerId", sql.UniqueIdentifier, customerId);
    req2.input("DbType", sql.VarChar(20), connection.dbType);
    req2.input("Host", sql.NVarChar(255), connection.host);
    req2.input("Port", sql.Int, connection.port);
    req2.input("DatabaseName", sql.NVarChar(128), connection.databaseName);
    req2.input("AuthMode", sql.VarChar(20), connection.authMode);

    // varbinary(max)
    req2.input("EncUsername", sql.VarBinary(sql.MAX), connection.encUsername);
    req2.input("EncPassword", sql.VarBinary(sql.MAX), connection.encPassword);

    req2.input("OptionsJson", sql.NVarChar(sql.MAX), connection.optionsJson ?? null);
    req2.input("IsActive", sql.Bit, connection.isActive ? 1 : 0);
    req2.input("KeyVersion", sql.Int, connection.keyVersion);

    const q2 = `
      INSERT INTO iFMSReportCustomerDbConnections
        (ConnectionId, CustomerId, ConnectionName, DbType, Host, Port, DatabaseName, AuthMode,
         EncUsername, EncPassword, OptionsJson, IsActive,
         LastTestAt, LastTestStatus, LastTestMessage, KeyVersion, CreatedAt, UpdatedAt)
      OUTPUT INSERTED.ConnectionId
      VALUES
        (NEWID(), @CustomerId, @ConnectionName, @DbType, @Host, @Port, @DatabaseName, @AuthMode,
         @EncUsername, @EncPassword, @OptionsJson, @IsActive,
         NULL, NULL, NULL, @KeyVersion, SYSUTCDATETIME(), SYSUTCDATETIME());
    `;

    const r2 = await req2.query(q2);
    const connectionId = r2.recordset?.[0]?.ConnectionId;

    await insertConnectionAuditLog(tx, {
      connectionId,
      action: "CREATE_CONNECTION",
      actor: auditMeta?.actor ?? actor ?? "system",
      ipAddress: auditMeta?.ipAddress ?? null,
      userAgent: auditMeta?.userAgent ?? null,
      detailJson: auditMeta?.detailJson ?? null,
    });


    await tx.commit();
    return { customerId, connectionId };
  } catch (err) {
    await tx.rollback();
    throw err;
  }
}

async function updateCustomerWithConnection({ customerId, customerName, status, notes, actor, connection, auditMeta }) {
  const pool = await getPool();
  const tx = new sql.Transaction(pool);
  await tx.begin();

  try {
    // 1) update Customers
    const req1 = new sql.Request(tx);
    req1.input("CustomerId", sql.UniqueIdentifier, customerId);
    req1.input("CustomerName", sql.NVarChar(200), customerName);
    req1.input("Status", sql.VarChar(20), status);
    req1.input("Notes", sql.NVarChar(500), notes ?? null);
    req1.input("Actor", sql.NVarChar(100), actor ?? "system");

    const q1 = `
      UPDATE iFMSReportCustomers
      SET CustomerName=@CustomerName,
          Status=@Status,
          Notes=@Notes,
          UpdatedAt=SYSUTCDATETIME(),
          UpdatedBy=@Actor
      WHERE CustomerId=@CustomerId;
      SELECT @@ROWCOUNT AS Affected;
    `;
    const r1 = await req1.query(q1);
    const affectedCustomer = r1.recordset?.[0]?.Affected || 0;

    // 2) update CustomerDbConnections (ผูกกับ CustomerId ด้วยเพื่อกันแก้ข้าม tenant)
    const req2 = new sql.Request(tx);
    req2.input("ConnectionId", sql.UniqueIdentifier, connection.connectionId);
    req2.input("CustomerId", sql.UniqueIdentifier, customerId);
    req2.input("ConnectionName", sql.NVarChar(100), connection.connectionName);
    req2.input("DbType", sql.VarChar(20), connection.dbType);
    req2.input("Host", sql.NVarChar(255), connection.host);
    req2.input("Port", sql.Int, connection.port);
    req2.input("DatabaseName", sql.NVarChar(128), connection.databaseName);
    req2.input("AuthMode", sql.VarChar(20), connection.authMode);
    req2.input("OptionsJson", sql.NVarChar(sql.MAX), connection.optionsJson ?? null);
    req2.input("IsActive", sql.Bit, connection.isActive ? 1 : 0);

    // ถ้า encUsername/encPassword เป็น null = ไม่อัพเดท
    req2.input("EncUsername", sql.VarBinary(sql.MAX), connection.encUsername ?? null);
    req2.input("EncPassword", sql.VarBinary(sql.MAX), connection.encPassword ?? null);
    req2.input("KeyVersion", sql.Int, connection.keyVersion ?? null);

    const q2 = `
      UPDATE iFMSReportCustomerDbConnections
      SET ConnectionName=@ConnectionName,
          DbType=@DbType,
          Host=@Host,
          Port=@Port,
          DatabaseName=@DatabaseName,
          AuthMode=@AuthMode,
          OptionsJson=@OptionsJson,
          IsActive=@IsActive,
          EncUsername = CASE WHEN @EncUsername IS NULL THEN EncUsername ELSE @EncUsername END,
          EncPassword = CASE WHEN @EncPassword IS NULL THEN EncPassword ELSE @EncPassword END,
          KeyVersion  = CASE WHEN @EncUsername IS NULL AND @EncPassword IS NULL THEN KeyVersion ELSE @KeyVersion END,
          UpdatedAt=SYSUTCDATETIME()
      WHERE ConnectionId=@ConnectionId AND CustomerId=@CustomerId;
      SELECT @@ROWCOUNT AS Affected;
    `;
    const r2 = await req2.query(q2);
    const affectedConn = r2.recordset?.[0]?.Affected || 0;

    // ต้องเจอทั้งคู่
    if (affectedCustomer === 0 || affectedConn === 0) {
      await tx.rollback();
      return false;
    }

    await insertConnectionAuditLog(tx, {
      connectionId: connection.connectionId,
      action: "UPDATE_CONNECTION",
      actor: auditMeta?.actor ?? actor ?? "system",
      ipAddress: auditMeta?.ipAddress ?? null,
      userAgent: auditMeta?.userAgent ?? null,
      detailJson: auditMeta?.detailJson ?? null,
    });

    await tx.commit();
    return true;
  } catch (err) {
    await tx.rollback();
    throw err;
  }
}

async function getAllCustomers() {
  const pool = await getPool();
  const req = pool.request();

  const q = `
    SELECT
      c.CustomerId,
      c.CustomerName,
      c.Status,
      c.Notes,
      c.CreatedAt,
      c.UpdatedAt,

      cc.ConnectionId,
      cc.ConnectionName,
      cc.DbType,
      cc.Host,
      cc.Port,
      cc.DatabaseName,
      cc.AuthMode,
      cc.OptionsJson,
      cc.IsActive,
      cc.LastTestAt,
      cc.LastTestStatus,
      cc.LastTestMessage,
      cc.KeyVersion,
      cc.CreatedAt AS ConnectionCreatedAt,
      cc.UpdatedAt AS ConnectionUpdatedAt
    FROM iFMSReportCustomers c
    OUTER APPLY (
      SELECT TOP 1 *
      FROM iFMSReportCustomerDbConnections x
      WHERE x.CustomerId = c.CustomerId
      ORDER BY x.IsActive DESC, x.UpdatedAt DESC
    ) cc
    WHERE c.Status IN ('ACTIVE', 'INACTIVE', 'SUSPENDED')
    ORDER BY c.UpdatedAt DESC;
  `;

  const r = await req.query(q);
  return r.recordset || [];
}

async function insertCustomerReport(customerId, items) {
  const pool = await getPool();
  const tx = new sql.Transaction(pool);
  await tx.begin();

  try {
    for (const item of items) {
      const req = new sql.Request(tx);

      req.input("CustomerId", sql.UniqueIdentifier, customerId);
      req.input("ReportId", sql.UniqueIdentifier, item.reportId);
      req.input("MenuName", sql.NVarChar(200), item.menuName);
      req.input("SortOrder", sql.Int, item.sortOrder);
      req.input("IsActive", sql.Bit, item.isActive ? 1 : 0);
      // req.input("ConnectionId", sql.UniqueIdentifier, item.connectionId);
      req.input("OverrideJson", sql.NVarChar(sql.MAX), item.overrideJson ?? null);

      const q = `
        INSERT INTO iFMSReportCustomerReports
          (CustomerReportId, CustomerId, ReportId, MenuName, SortOrder, IsActive, OverrideJson, CreatedAt, UpdatedAt)
        VALUES
          (NEWID(), @CustomerId, @ReportId, @MenuName, @SortOrder, @IsActive, @OverrideJson, SYSUTCDATETIME(), SYSUTCDATETIME());
      `;

      await req.query(q);
    }

    await tx.commit();
    return true;

  } catch (err) {
    await tx.rollback();
    throw err;
  }
}

async function getCustomerReports(customerId) {
  const pool = await getPool();
  const req = pool.request();

  req.input("CustomerId", sql.UniqueIdentifier, customerId);

  const q = `
    SELECT
      cr.CustomerReportId,
      cr.CustomerId,
      cr.ReportId,
      cr.MenuName,
      cr.SortOrder,
      cr.IsActive,
      cr.ConnectionId,
      cr.OverrideJson,

      r.ReportKey,
      r.ReportName,
      r.TemplateKey,
      r.DataSourceKey,
      r.ExportModes
    FROM iFMSReportCustomerReports cr
    JOIN iFMSReport r ON r.ReportId = cr.ReportId
    WHERE
      cr.CustomerId = @CustomerId
      AND cr.IsActive IN (0, 1)
      AND r.IsActive = 1
    ORDER BY
      ISNULL(cr.SortOrder, 999999) ASC,
      cr.UpdatedAt DESC;
  `;

  const result = await req.query(q);
  return result.recordset || [];
}

async function softDeleteCustomer({ customerId, actor }) {
  const pool = await getPool();
  const req = pool.request();

  req.input("CustomerId", sql.UniqueIdentifier, customerId);
  req.input("Actor", sql.NVarChar(100), actor ?? "system");

  const q = `
    UPDATE iFMSReportCustomers
    SET
      Status = 'INACTIVE',
      UpdatedAt = SYSUTCDATETIME(),
      UpdatedBy = @Actor
    WHERE CustomerId = @CustomerId;

    SELECT @@ROWCOUNT AS Affected;
  `;

  const r = await req.query(q);
  return (r.recordset?.[0]?.Affected || 0) > 0;
}

module.exports = { getAllCustomers, insertCustomerWithConnection, updateCustomerWithConnection, softDeleteCustomer, insertConnectionAuditLog, insertCustomerReport, getCustomerReports };