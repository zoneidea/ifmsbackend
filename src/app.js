const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");

const errorHandler = require("./middlewares/errorHandler");
const customerRoutes = require("./modules/customers/customer.routes");

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: "1mb" }));

app.use(
    rateLimit({
        windowMs: 60 * 1000,
        max: 120,
    })
);

app.get("/health", (req, res) => {
    res.json({ ok: true, ts: new Date().toISOString() });
});

// ✅ POST /customers
app.use("/customers", customerRoutes);

// ✅ error handler ต้องท้ายสุด
app.use(errorHandler);

module.exports = app;
