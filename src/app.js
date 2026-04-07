const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");

const errorHandler = require("./middlewares/errorHandler");
const customerRoutes = require("./modules/customers/customer.routes");
const usersRoutes = require("./modules/users/user.routes")
const customerReportRoutes = require('./modules/customerreports/customerreport.routes')

const reportRoutes = require("./modules/reports/report.routes");
const connectionRoutes = require("./modules/connections/connection.routes");

const app = express();
app.set("trust proxy", false);

app.use(helmet());
app.use(express.json({ limit: "10mb" }));

const whiteList = ['http://localhost:8080', 'http://141.98.17.228:8080'];
const corsOptionsDelegate = (req, callback) => {
    const origin = req.header('Origin');
    const isWhitelisted = whiteList.includes(origin);

    callback(null, {
        origin: isWhitelisted,
        credentials: true
    });
};
app.use(cors(corsOptionsDelegate));

app.use(
    rateLimit({
        windowMs: 15 * 60 * 1000,
        max: 500,
        standardHeaders: true,
        legacyHeaders: false,
        validate: { trustProxy: false }, // ปิดการตรวจสอบแจ้งเตือนนี้
    })
);

app.get("/health", (req, res) => {
    res.json({ ok: true, ts: new Date().toISOString() });
});


app.use("/connections", connectionRoutes);
app.use("/reports", reportRoutes);
// ✅ POST /customers
app.use("/customers", customerRoutes);
app.use('/users', usersRoutes)
app.use('/ExternalReports', customerReportRoutes);

// ✅ error handler ต้องท้ายสุด
app.use(errorHandler);

module.exports = app;
