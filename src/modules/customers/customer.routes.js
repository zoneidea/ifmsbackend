const express = require("express");
const asyncHandler = require("../../middlewares/asyncHandler");
const { postCustomer, putCustomer, getCustomers, testConnection } = require("./customer.contoller");

const router = express.Router();

router.get("/", asyncHandler(getCustomers)); 
router.post("/", asyncHandler(postCustomer));
router.put("/:customerId", asyncHandler(putCustomer));
router.post("/:customerId/connections/:connectionId/test", asyncHandler(testConnection));

module.exports = router;
