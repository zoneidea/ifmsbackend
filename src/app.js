const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");

const errorHandler = require("./middlewares/errorHandler");
const customerRoutes = require("./modules/customers/customer.routes");
const usersRoutes = require("./modules/users/user.routes")
const customerReportRoutes = require('./modules/customerreports/customerreport.routes')

const app = express();
app.set("trust proxy", false);

app.use(helmet());
app.use(express.json({ limit: "1024mb" }));

const whiteList = ['localhost:3000', 'http://localhost:3000', 'http://localhost:8080', 'http://141.98.17.228:8080'];
var corsOptionsDelegate = function (req, callback) {
    var corsOptions;
    if (whiteList.indexOf(req.header('Origin')) !== -1) {
        corsOptions = { origin: true }
    } else {
        corsOptions = { origin: false }
    }

    callback(null, corsOptions)
}

app.use(cors(corsOptionsDelegate));

app.use(
    rateLimit({
        windowMs: 15 * 60 * 1000,
        max: 100,
        validate: { trustProxy: false }, // ปิดการตรวจสอบแจ้งเตือนนี้
    })
);

app.get("/health", (req, res) => {
    res.json({ ok: true, ts: new Date().toISOString() });
});

const connectionRoutes = require("./modules/connections/connection.routes");
app.use("/connections", connectionRoutes);

const reportRoutes = require("./modules/reports/report.routes");
app.use("/reports", reportRoutes);

// ✅ POST /customers
app.use("/customers", customerRoutes);
app.use('/users', usersRoutes)

app.use('/ExternalReports', customerReportRoutes);

// ✅ error handler ต้องท้ายสุด
app.use(errorHandler);

module.exports = app;
