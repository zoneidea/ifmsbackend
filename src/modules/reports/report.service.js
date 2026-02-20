const { insertReportWithSettings, getAllReports, getViewerInit } = require("./report.repo");

function t(v) {
    return (v === undefined || v === null) ? "" : String(v).trim();
}

function toBool(v, fallback = true) {
    if (v === undefined || v === null) return fallback;
    return !!v;
}

function normalizeExportModes(v) {
    const raw = t(v) || "PDF,EXCEL";
    // รับได้ทั้ง "PDF,EXCEL" หรือ "PDF" หรือ "EXCEL"
    const parts = raw
        .split(",")
        .map((x) => x.trim().toUpperCase())
        .filter(Boolean);

    const allowed = new Set(["PDF", "EXCEL"]);
    const clean = [...new Set(parts)].filter((x) => allowed.has(x));

    // ถ้าไม่มีอะไรเลย ให้ default
    return clean.length ? clean.join(",") : "PDF,EXCEL";
}

function isValidJsonOrNull(s) {
    if (s === null || s === undefined) return true;
    const txt = String(s).trim();
    if (!txt) return true;
    try {
        JSON.parse(txt);
        return true;
    } catch {
        return false;
    }
}

function isGuid(v) {
    return /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/.test(String(v || ""));
}

function isGuid(v) {
    return /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/.test(String(v || ""));
}

async function createReport(payload) {
    const reportKey = t(payload.reportKey);
    const reportName = t(payload.reportName);
    const reportPath = payload.reportPath === undefined || payload.reportPath === null ? null : String(payload.reportPath).trim();
    const templateKey = t(payload.templateKey);
    const dataSourceKey = t(payload.dataSourceKey);
    const exportModes = normalizeExportModes(payload.exportModes);
    const isActive = toBool(payload.isActive, true);

    if (!reportKey || reportKey.length > 80) {
        return { ok: false, status: 400, code: "INVALID_REPORT_KEY", message: "reportKey ไม่ถูกต้อง" };
    }
    if (!reportName || reportName.length > 200) {
        return { ok: false, status: 400, code: "INVALID_REPORT_NAME", message: "reportName ไม่ถูกต้อง" };
    }
    if (reportPath !== null && reportPath.length > 300) {
        return { ok: false, status: 400, code: "INVALID_REPORT_PATH", message: "reportPath ยาวเกิน 300" };
    }
    if (!templateKey || templateKey.length > 120) {
        return { ok: false, status: 400, code: "INVALID_TEMPLATE_KEY", message: "templateKey ไม่ถูกต้อง" };
    }
    if (!dataSourceKey || dataSourceKey.length > 120) {
        return { ok: false, status: 400, code: "INVALID_DATASOURCE_KEY", message: "dataSourceKey ไม่ถูกต้อง" };
    }
    if (exportModes.length > 50) {
        return { ok: false, status: 400, code: "INVALID_EXPORT_MODES", message: "exportModes ยาวเกิน 50" };
    }

    const settings = payload.settings || {};
    const paramSchemaJson = settings.paramSchemaJson ?? null;
    const columnsJson = settings.columnsJson ?? null;
    const defaultConfigJson = settings.defaultConfigJson ?? null;

    // ✅ กัน JSON พัง (เพราะตารางเป็น nvarchar(max) แต่ควรเป็น JSON ถูกต้อง)
    if (!isValidJsonOrNull(paramSchemaJson)) {
        return { ok: false, status: 400, code: "INVALID_PARAM_SCHEMA_JSON", message: "settings.paramSchemaJson ต้องเป็น JSON ที่ถูกต้อง" };
    }
    if (!isValidJsonOrNull(columnsJson)) {
        return { ok: false, status: 400, code: "INVALID_COLUMNS_JSON", message: "settings.columnsJson ต้องเป็น JSON ที่ถูกต้อง" };
    }
    if (!isValidJsonOrNull(defaultConfigJson)) {
        return { ok: false, status: 400, code: "INVALID_DEFAULT_CONFIG_JSON", message: "settings.defaultConfigJson ต้องเป็น JSON ที่ถูกต้อง" };
    }

    const { reportId } = await insertReportWithSettings({
        reportKey,
        reportName,
        reportPath,
        templateKey,
        dataSourceKey,
        exportModes,
        isActive,
        settings: { paramSchemaJson, columnsJson, defaultConfigJson },
    });

    return { ok: true, reportId };
}

async function listReports(query) {
    const q = query || {};
    // ?isActive=1 หรือ 0
    const isActive =
        q.isActive === "1" || q.isActive === 1 || q.isActive === true
            ? true
            : q.isActive === "0" || q.isActive === 0 || q.isActive === false
                ? false
                : undefined;

    const rows = await getAllReports({ isActive });

    return {
        ok: true,
        data: rows.map((x) => ({
            reportId: x.ReportId,
            reportKey: x.ReportKey,
            reportName: x.ReportName,
            reportPath: x.ReportPath ?? null,
            templateKey: x.TemplateKey,
            dataSourceKey: x.DataSourceKey,
            exportModes: x.ExportModes,
            isActive: !!x.IsActive,
            hasSettings: !!x.HasSettings,
            settingsUpdatedAt: x.SettingsUpdatedAt ?? null,
            createdAt: x.CreatedAt,
            updatedAt: x.UpdatedAt,
        })),
    };
}

async function viewerInit({ customerId }) {
    if (!isGuid(customerId)) {
        const err = new Error("INVALID_CUSTOMER_ID");
        err.statusCode = 400;
        throw err;
    }

    const rows = await getViewerInit(customerId);

    if (rows.length === 0) {
        return { customer: null, reports: [] };
    }

    const first = normalizeRow(rows[0]).customer;

    const reports = rows
        .map((r) => normalizeRow(r).report)
        // กัน config ว่าง (optional)
        .map((x) => ({
            ...x,
            settings: {
                paramSchemaJson: x.settings.paramSchemaJson || "{}",
                columnsJson: x.settings.columnsJson || "[]",
                defaultConfigJson: x.settings.defaultConfigJson || "{}",
            },
        }));

    return { customer: first, reports };
}

module.exports = { createReport, listReports, viewerInit };
