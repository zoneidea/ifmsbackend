const crypto = require("crypto");

function getActiveKey() {
    const v = Number(process.env.ENC_ACTIVE_KEY_VERSION || 1);
    const key = process.env[`ENC_KEY_V${v}`];
    if (!key) throw new Error(`Missing ENC_KEY_V${v} in .env`);
    return { version: v, key: Buffer.from(key, "utf8") };
}

// เก็บเป็น Buffer: [iv(12)][tag(16)][ciphertext]
function encryptToVarbinary(plainText) {
    if (plainText === null || plainText === undefined) return null;
    const text = String(plainText);

    const { version, key } = getActiveKey();
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv("aes-256-gcm", crypto.createHash("sha256").update(key).digest(), iv);

    const ciphertext = Buffer.concat([cipher.update(text, "utf8"), cipher.final()]);
    const tag = cipher.getAuthTag();

    return { version, data: Buffer.concat([iv, tag, ciphertext]) };
}

module.exports = { encryptToVarbinary };
