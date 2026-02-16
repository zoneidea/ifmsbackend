const express = require("express");
const asyncHandler = require("../../middlewares/asyncHandler");
const { postUser, login } = require("./user.controller");

const router = express.Router();

router.post("/", asyncHandler(postUser));
router.post("/login", asyncHandler(login));

module.exports = router;
