const express = require("express");
const asyncHandler = require("../../middlewares/asyncHandler");
const { postReport, getReports } = require("./report.controller");

const router = express.Router();
router.get("/", asyncHandler(getReports)); 
router.post("/", asyncHandler(postReport));
module.exports = router;
