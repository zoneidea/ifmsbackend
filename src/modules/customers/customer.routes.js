const express = require("express");
const asyncHandler = require("../../middlewares/asyncHandler");
const { postCustomer, putCustomer, getCustomers, postCustomerReport, getCustomerReportsHandler, softDeleteHandler } = require("./customer.contoller");

const router = express.Router();

router.get("/", asyncHandler(getCustomers)); 
router.post("/", asyncHandler(postCustomer));
router.delete("/:customerId", softDeleteHandler);
router.put("/:customerId", asyncHandler(putCustomer));
router.post("/:customerId/reports", asyncHandler(postCustomerReport));
router.get("/:customerId/reports", getCustomerReportsHandler);

module.exports = router;
