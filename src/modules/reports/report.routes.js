const express = require("express");
const asyncHandler = require("../../middlewares/asyncHandler");
const { postReport } = require("./report.controller");

const router = express.Router();
router.post("/", asyncHandler(postReport));
module.exports = router;
