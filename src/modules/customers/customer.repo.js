const { sql, getPool } = require("../../db");

async function insertCustomerWithConnection({
  customerName,
  status,
  notes,
  actor,
  connection, // object ที่ผ่านการ validate + encrypt แล้ว
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
      INSERT INTO Customers
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
      INSERT INTO CustomerDbConnections
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

    await tx.commit();
    return { customerId, connectionId };
  } catch (err) {
    await tx.rollback();
    throw err;
  }
}

async function updateCustomerWithConnection({ customerId, customerName, status, notes, actor, connection }) {
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
      UPDATE Customers
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
    req2.input("EncUsername", sql.VarBinary(sql.MAX), connection.encUsername);
    req2.input("EncPassword", sql.VarBinary(sql.MAX), connection.encPassword);
    req2.input("KeyVersion", sql.Int, connection.keyVersion);

    const q2 = `
      UPDATE CustomerDbConnections
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

    await tx.commit();
    return true;
  } catch (err) {
    await tx.rollback();
    throw err;
  }
}

module.exports = { insertCustomerWithConnection, updateCustomerWithConnection };
