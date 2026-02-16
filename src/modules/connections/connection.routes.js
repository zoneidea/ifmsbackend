const express = require("express");
const asyncHandler = require("../../middlewares/asyncHandler");
const { testConnection } = require("./connection.controller");

const router = express.Router();

router.post("/test", asyncHandler(testConnection));

module.exports = router;
