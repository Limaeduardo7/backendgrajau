"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var ApiError_1 = require("../utils/ApiError");
var PaymentService_1 = require("../services/PaymentService");
var prisma_1 = require("../config/prisma");
var payment_1 = require("../config/payment");
var PaymentController = /** @class */ (function () {
    function PaymentController() {
        var _this = this;
        // Criar uma nova assinatura
        this.createSubscription = function (req, res) { return __awaiter(_this, void 0, void 0, function () {
            var _a, planId, paymentMethod, businessId, professionalId, callbackUrl, userId, result, error_1;
            var _b;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        _c.trys.push([0, 2, , 3]);
                        _a = req.body, planId = _a.planId, paymentMethod = _a.paymentMethod, businessId = _a.businessId, professionalId = _a.professionalId, callbackUrl = _a.callbackUrl;
                        userId = (_b = req.user) === null || _b === void 0 ? void 0 : _b.id;
                        if (!userId) {
                            return [2 /*return*/, res.status(401).json({ error: 'Usuário não autenticado' })];
                        }
                        return [4 /*yield*/, PaymentService_1.default.createPaymentPreference({
                                planId: planId,
                                userId: userId,
                                callbackUrl: callbackUrl,
                                paymentMethod: paymentMethod,
                                businessId: businessId,
                                professionalId: professionalId
                            })];
                    case 1:
                        result = _c.sent();
                        return [2 /*return*/, res.json(result)];
                    case 2:
                        error_1 = _c.sent();
                        console.error('Erro ao criar assinatura:', error_1);
                        if (error_1 instanceof ApiError_1.ApiError) {
                            return [2 /*return*/, res.status(error_1.statusCode).json({ error: error_1.message })];
                        }
                        return [2 /*return*/, res.status(500).json({ error: 'Erro ao criar assinatura' })];
                    case 3: return [2 /*return*/];
                }
            });
        }); };
        // Processar webhook do Mercado Pago
        this.processWebhook = function (req, res) { return __awaiter(_this, void 0, void 0, function () {
            var _a, type, data, paymentId, mpPayment, result, error_2;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        _b.trys.push([0, 4, , 5]);
                        _a = req.query, type = _a.type, data = _a.data;
                        if (!(type === 'payment')) return [3 /*break*/, 3];
                        paymentId = typeof data === 'string' ? data : '';
                        if (!paymentId) {
                            return [2 /*return*/, res.status(400).json({ error: 'ID de pagamento não fornecido' })];
                        }
                        return [4 /*yield*/, payment_1.default.payment.get(paymentId)];
                    case 1:
                        mpPayment = _b.sent();
                        return [4 /*yield*/, PaymentService_1.default.processPaymentWebhook({
                                id: mpPayment.body.id,
                                status: mpPayment.body.status,
                                external_reference: mpPayment.body.external_reference,
                                payment_method_id: mpPayment.body.payment_method_id,
                                payment_type_id: mpPayment.body.payment_type_id,
                                transaction_details: mpPayment.body.transaction_details
                            })];
                    case 2:
                        result = _b.sent();
                        return [2 /*return*/, res.json(result)];
                    case 3: 
                    // Se não for uma notificação de pagamento, apenas retornar sucesso
                    return [2 /*return*/, res.json({ success: true })];
                    case 4:
                        error_2 = _b.sent();
                        console.error('Erro ao processar webhook:', error_2);
                        return [2 /*return*/, res.status(500).json({ error: 'Erro ao processar webhook' })];
                    case 5: return [2 /*return*/];
                }
            });
        }); };
        // Cancelar uma assinatura
        this.cancelSubscription = function (req, res) { return __awaiter(_this, void 0, void 0, function () {
            var id, reason, userId, result, error_3;
            var _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        _b.trys.push([0, 2, , 3]);
                        id = req.params.id;
                        reason = req.body.reason;
                        userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
                        if (!userId) {
                            return [2 /*return*/, res.status(401).json({ error: 'Usuário não autenticado' })];
                        }
                        return [4 /*yield*/, PaymentService_1.default.cancelSubscription(id, userId, reason)];
                    case 1:
                        result = _b.sent();
                        return [2 /*return*/, res.json(result)];
                    case 2:
                        error_3 = _b.sent();
                        console.error('Erro ao cancelar assinatura:', error_3);
                        if (error_3 instanceof ApiError_1.ApiError) {
                            return [2 /*return*/, res.status(error_3.statusCode).json({ error: error_3.message })];
                        }
                        return [2 /*return*/, res.status(500).json({ error: 'Erro ao cancelar assinatura' })];
                    case 3: return [2 /*return*/];
                }
            });
        }); };
        // Renovar assinatura manualmente
        this.renewSubscription = function (req, res) { return __awaiter(_this, void 0, void 0, function () {
            var id, _a, paymentMethod, cardToken, userId, subscription, result, error_4;
            var _b;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        _c.trys.push([0, 3, , 4]);
                        id = req.params.id;
                        _a = req.body, paymentMethod = _a.paymentMethod, cardToken = _a.cardToken;
                        userId = (_b = req.user) === null || _b === void 0 ? void 0 : _b.id;
                        if (!userId) {
                            return [2 /*return*/, res.status(401).json({ error: 'Usuário não autenticado' })];
                        }
                        return [4 /*yield*/, prisma_1.default.subscription.findUnique({
                                where: { id: id },
                            })];
                    case 1:
                        subscription = _c.sent();
                        if (!subscription) {
                            return [2 /*return*/, res.status(404).json({ error: 'Assinatura não encontrada' })];
                        }
                        if (subscription.userId !== userId) {
                            return [2 /*return*/, res.status(403).json({ error: 'Você não tem permissão para renovar esta assinatura' })];
                        }
                        return [4 /*yield*/, PaymentService_1.default.renewSubscription({
                                subscriptionId: id,
                                paymentMethod: paymentMethod,
                                cardToken: cardToken
                            })];
                    case 2:
                        result = _c.sent();
                        return [2 /*return*/, res.json(result)];
                    case 3:
                        error_4 = _c.sent();
                        console.error('Erro ao renovar assinatura:', error_4);
                        if (error_4 instanceof ApiError_1.ApiError) {
                            return [2 /*return*/, res.status(error_4.statusCode).json({ error: error_4.message })];
                        }
                        return [2 /*return*/, res.status(500).json({ error: 'Erro ao renovar assinatura' })];
                    case 4: return [2 /*return*/];
                }
            });
        }); };
        // Verificar assinaturas prestes a expirar (tarefa administrativa)
        this.checkExpiringSubscriptions = function (req, res) { return __awaiter(_this, void 0, void 0, function () {
            var result, error_5;
            var _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        _b.trys.push([0, 2, , 3]);
                        // Verificar se o usuário é administrador
                        if (((_a = req.user) === null || _a === void 0 ? void 0 : _a.role) !== 'admin') {
                            return [2 /*return*/, res.status(403).json({ error: 'Acesso negado' })];
                        }
                        return [4 /*yield*/, PaymentService_1.default.checkExpiringSubscriptions()];
                    case 1:
                        result = _b.sent();
                        return [2 /*return*/, res.json(result)];
                    case 2:
                        error_5 = _b.sent();
                        console.error('Erro ao verificar assinaturas:', error_5);
                        return [2 /*return*/, res.status(500).json({ error: 'Erro ao verificar assinaturas' })];
                    case 3: return [2 /*return*/];
                }
            });
        }); };
        // Processar renovações automáticas (tarefa administrativa)
        this.processAutoRenewals = function (req, res) { return __awaiter(_this, void 0, void 0, function () {
            var result, error_6;
            var _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        _b.trys.push([0, 2, , 3]);
                        // Verificar se o usuário é administrador
                        if (((_a = req.user) === null || _a === void 0 ? void 0 : _a.role) !== 'admin') {
                            return [2 /*return*/, res.status(403).json({ error: 'Acesso negado' })];
                        }
                        return [4 /*yield*/, PaymentService_1.default.processAutoRenewals()];
                    case 1:
                        result = _b.sent();
                        return [2 /*return*/, res.json(result)];
                    case 2:
                        error_6 = _b.sent();
                        console.error('Erro ao processar renovações:', error_6);
                        return [2 /*return*/, res.status(500).json({ error: 'Erro ao processar renovações' })];
                    case 3: return [2 /*return*/];
                }
            });
        }); };
    }
    return PaymentController;
}());
exports.default = new PaymentController();
