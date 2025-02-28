"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resend = void 0;
// Importar o Resend usando require
var Resend = require('resend').Resend;
var dotenv_1 = require("dotenv");
(0, dotenv_1.config)();
var RESEND_API_KEY = process.env.RESEND_API_KEY;
if (!RESEND_API_KEY) {
    throw new Error('Missing RESEND_API_KEY');
}
exports.resend = new Resend(RESEND_API_KEY);
