const express = require("express");
const asyncHandler = require("../../middlewares/asyncHandler");
const { getReportSeaShipment, getReportSeaShipment2 } = require("./customerreport.controller");

const router = express.Router();
router.get("/SeaShipment", asyncHandler(getReportSeaShipment));
router.get("/SeaShipment2", asyncHandler(getReportSeaShipment2));
module.exports = router;