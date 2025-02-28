"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// Importar o Mercado Pago usando require
var mercadopago = require('mercadopago');
var dotenv_1 = require("dotenv");
(0, dotenv_1.config)();
// Configurar o Mercado Pago com o token de acesso
mercadopago.configure({
    access_token: process.env.MERCADO_PAGO_ACCESS_TOKEN || '',
});
exports.default = mercadopago;
