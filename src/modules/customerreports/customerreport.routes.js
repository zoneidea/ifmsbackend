const express = require("express");
const asyncHandler = require("../../middlewares/asyncHandler");
const { getReportSeaShipment } = require("./customerreport.controller");

const router = express.Router();
router.get("/SeaShipment", asyncHandler(getReportSeaShipment)); 
module.exports = router;