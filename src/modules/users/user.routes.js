const express = require("express");
const asyncHandler = require("../../middlewares/asyncHandler");
const { postUser, login, getUsers, deleteUser } = require("./user.controller");

const router = express.Router();

router.get("/", asyncHandler(getUsers));
router.post("/", asyncHandler(postUser));
router.post("/login", asyncHandler(login));
router.delete("/:username", asyncHandler(deleteUser));

module.exports = router;
