const express = require("express");
const asyncHandler = require("../../middlewares/asyncHandler");
const { postCustomer, putCustomer } = require("./customer.contoller");

const router = express.Router();

router.post("/", asyncHandler(postCustomer));
router.put("/:customerId", asyncHandler(putCustomer));

module.exports = router;
