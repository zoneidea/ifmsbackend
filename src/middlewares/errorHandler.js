module.exports = function errorHandler(err, req, res, next) {
    console.error("❌ ERROR:", err);

    // mssql duplicate key / unique constraint มักเป็น 2627 หรือ 2601
    const sqlNumber = err?.number;
    if (sqlNumber === 2627 || sqlNumber === 2601) {
        return res.status(409).json({
            ok: false,
            code: "DUPLICATE",
            message: "ข้อมูลซ้ำในระบบ",
        });
    }

    return res.status(500).json({
        ok: false,
        code: "INTERNAL_ERROR",
        message: "เกิดข้อผิดพลาดในระบบ",
    });
};
