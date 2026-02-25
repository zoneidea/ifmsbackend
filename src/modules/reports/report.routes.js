const express = require("express");
const asyncHandler = require("../../middlewares/asyncHandler");
const { postReport, getReports, getInit, updateStatusHandler } = require("./report.controller");

const router = express.Router();
router.get("/init", getInit);
router.get("/", asyncHandler(getReports)); 
router.post("/", asyncHandler(postReport));
router.put("/:customerReportId/status", updateStatusHandler);
module.exports = router;
