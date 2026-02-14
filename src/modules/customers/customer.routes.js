const express = require("express");
const asyncHandler = require("../../middlewares/asyncHandler");
const { postCustomer, putCustomer, getCustomers } = require("./customer.contoller");

const router = express.Router();

router.get("/", asyncHandler(getCustomers)); 
router.post("/", asyncHandler(postCustomer));
router.put("/:customerId", asyncHandler(putCustomer));

module.exports = router;
