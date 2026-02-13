require("dotenv").config();
const app = require("./app");
const { getPool } = require("./db");

const PORT = Number(process.env.PORT || 3000);

async function start() {
    try {
        await getPool();
        console.log("✅ MSSQL connected");

        app.listen(PORT, () => {
            console.log(`🚀 Server running on http://localhost:${PORT}`);
        });
    } catch (err) {
        console.error("❌ Failed to start:", err);
        process.exit(1);
    }
}

start();
