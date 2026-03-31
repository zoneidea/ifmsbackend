require("dotenv").config();
const app = require("./app");
const { getPool } = require("./db");

app.use(express.json());

const whiteList = ['localhost:3000', 'http://localhost:3000', 'http://localhost:8080'];
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
