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
var payment_1 = require("../config/payment");
var ApiError_1 = require("../utils/ApiError");
var prisma_1 = require("../config/prisma");
var EmailService_1 = require("./EmailService");
var PaymentService = /** @class */ (function () {
    function PaymentService() {
    }
    // Criar preferência de pagamento no Mercado Pago
    PaymentService.prototype.createPaymentPreference = function (_a) {
        return __awaiter(this, arguments, void 0, function (_b) {
            var plan, user, finalPrice, discountApplied, checkoutItem, startDate, endDate, subscription, externalReference, preferenceOptions, preference, error_1;
            var planId = _b.planId, userId = _b.userId, callbackUrl = _b.callbackUrl, paymentMethod = _b.paymentMethod, businessId = _b.businessId, professionalId = _b.professionalId, cardToken = _b.cardToken, couponCode = _b.couponCode;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        _c.trys.push([0, 6, , 7]);
                        return [4 /*yield*/, prisma_1.default.plan.findUnique({
                                where: { id: planId },
                                include: { subscriptions: true }
                            })];
                    case 1:
                        plan = _c.sent();
                        if (!plan) {
                            throw new ApiError_1.ApiError(404, 'Plano não encontrado');
                        }
                        return [4 /*yield*/, prisma_1.default.user.findUnique({
                                where: { id: userId },
                            })];
                    case 2:
                        user = _c.sent();
                        if (!user) {
                            throw new ApiError_1.ApiError(404, 'Usuário não encontrado');
                        }
                        // Verificar se o plano está ativo
                        if (!plan.active) {
                            throw new ApiError_1.ApiError(400, 'Este plano não está disponível no momento');
                        }
                        // Verificar tipo de plano e entidade relacionada
                        if (plan.type === 'BUSINESS' && !businessId) {
                            throw new ApiError_1.ApiError(400, 'ID da empresa é obrigatório para planos de empresa');
                        }
                        if (plan.type === 'PROFESSIONAL' && !professionalId) {
                            throw new ApiError_1.ApiError(400, 'ID do profissional é obrigatório para planos de profissional');
                        }
                        finalPrice = Number(plan.price);
                        discountApplied = false;
                        if (couponCode) {
                            // Buscar cupom no banco de dados
                            // Implementar lógica de cupom quando o modelo estiver disponível
                            // Por enquanto, não aplicamos desconto
                        }
                        checkoutItem = {
                            id: plan.id,
                            title: "Plano ".concat(plan.name),
                            description: plan.description,
                            quantity: 1,
                            currency_id: 'BRL',
                            unit_price: finalPrice,
                        };
                        startDate = new Date();
                        endDate = new Date();
                        endDate.setDate(endDate.getDate() + plan.duration);
                        return [4 /*yield*/, prisma_1.default.subscription.create({
                                data: {
                                    userId: userId,
                                    planId: planId,
                                    status: 'ACTIVE', // Começa como ativa
                                    startDate: startDate,
                                    endDate: endDate,
                                    autoRenew: true,
                                    businessId: businessId,
                                    professionalId: professionalId,
                                },
                            })];
                    case 3:
                        subscription = _c.sent();
                        externalReference = "sub_".concat(subscription.id);
                        preferenceOptions = {
                            items: [checkoutItem],
                            external_reference: externalReference,
                            back_urls: {
                                success: "".concat(callbackUrl, "/success"),
                                failure: "".concat(callbackUrl, "/failure"),
                                pending: "".concat(callbackUrl, "/pending"),
                            },
                            auto_return: 'approved',
                            payment_methods: {
                                excluded_payment_types: [],
                                installments: 1
                            },
                            notification_url: "".concat(process.env.API_URL, "/payments/webhook"),
                        };
                        // Configurar métodos de pagamento específicos
                        if (paymentMethod === 'credit_card') {
                            preferenceOptions.payment_methods.excluded_payment_types = [
                                { id: 'ticket' },
                                { id: 'atm' },
                                { id: 'bank_transfer' }
                            ];
                        }
                        else if (paymentMethod === 'pix') {
                            preferenceOptions.payment_methods.excluded_payment_types = [
                                { id: 'credit_card' },
                                { id: 'debit_card' },
                                { id: 'ticket' },
                                { id: 'atm' }
                            ];
                        }
                        else if (paymentMethod === 'boleto') {
                            preferenceOptions.payment_methods.excluded_payment_types = [
                                { id: 'credit_card' },
                                { id: 'debit_card' },
                                { id: 'bank_transfer' }
                            ];
                        }
                        return [4 /*yield*/, payment_1.default.preferences.create(preferenceOptions)];
                    case 4:
                        preference = _c.sent();
                        // Criar registro de pagamento
                        return [4 /*yield*/, prisma_1.default.payment.create({
                                data: {
                                    subscriptionId: subscription.id,
                                    amount: finalPrice,
                                    status: 'PENDING',
                                    paymentMethod: paymentMethod.toUpperCase(),
                                    paymentIntentId: preference.body.id,
                                },
                            })];
                    case 5:
                        // Criar registro de pagamento
                        _c.sent();
                        return [2 /*return*/, {
                                preferenceId: preference.body.id,
                                initPoint: preference.body.init_point,
                                subscriptionId: subscription.id,
                            }];
                    case 6:
                        error_1 = _c.sent();
                        console.error('Erro ao criar preferência de pagamento:', error_1);
                        throw error_1;
                    case 7: return [2 /*return*/];
                }
            });
        });
    };
    // Processar webhook de pagamento do Mercado Pago
    PaymentService.prototype.processPaymentWebhook = function (_a) {
        return __awaiter(this, arguments, void 0, function (_b) {
            var subscriptionId, subscription, payment, paymentStatus, subscriptionStatus, invoiceNumber, error_2;
            var id = _b.id, status = _b.status, external_reference = _b.external_reference, payment_method_id = _b.payment_method_id, payment_type_id = _b.payment_type_id, transaction_details = _b.transaction_details;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        _c.trys.push([0, 12, , 13]);
                        console.log("Processando webhook de pagamento: ID ".concat(id, ", Status ").concat(status));
                        // Verificar se é uma referência de assinatura
                        if (!external_reference || !external_reference.startsWith('sub_')) {
                            throw new ApiError_1.ApiError(400, 'Referência externa inválida');
                        }
                        subscriptionId = external_reference.replace('sub_', '');
                        return [4 /*yield*/, prisma_1.default.subscription.findUnique({
                                where: { id: subscriptionId },
                                include: {
                                    user: true,
                                    plan: true,
                                    business: true,
                                    professional: true,
                                },
                            })];
                    case 1:
                        subscription = _c.sent();
                        if (!subscription) {
                            throw new ApiError_1.ApiError(404, 'Assinatura não encontrada');
                        }
                        return [4 /*yield*/, prisma_1.default.payment.findFirst({
                                where: { subscriptionId: subscriptionId },
                                orderBy: { createdAt: 'desc' }
                            })];
                    case 2:
                        payment = _c.sent();
                        if (!payment) {
                            throw new ApiError_1.ApiError(404, 'Pagamento não encontrado');
                        }
                        paymentStatus = void 0;
                        subscriptionStatus = void 0;
                        switch (status) {
                            case 'approved':
                                paymentStatus = 'PAID';
                                subscriptionStatus = 'ACTIVE';
                                break;
                            case 'rejected':
                            case 'cancelled':
                                paymentStatus = 'FAILED';
                                subscriptionStatus = 'CANCELED';
                                break;
                            case 'refunded':
                                paymentStatus = 'REFUNDED';
                                subscriptionStatus = 'CANCELED';
                                break;
                            case 'pending':
                            case 'in_process':
                                paymentStatus = 'PENDING';
                                subscriptionStatus = 'ACTIVE';
                                break;
                            default:
                                paymentStatus = 'PENDING';
                                subscriptionStatus = 'ACTIVE';
                                break;
                        }
                        // Atualizar pagamento com detalhes adicionais
                        return [4 /*yield*/, prisma_1.default.payment.update({
                                where: { id: payment.id },
                                data: {
                                    status: paymentStatus,
                                    paidAt: paymentStatus === 'PAID' ? new Date() : null,
                                },
                            })];
                    case 3:
                        // Atualizar pagamento com detalhes adicionais
                        _c.sent();
                        if (!(paymentStatus === 'PAID')) return [3 /*break*/, 10];
                        invoiceNumber = "INV-".concat(Date.now());
                        return [4 /*yield*/, prisma_1.default.invoice.create({
                                data: {
                                    paymentId: payment.id,
                                    number: invoiceNumber,
                                },
                            })];
                    case 4:
                        _c.sent();
                        if (!subscription.businessId) return [3 /*break*/, 6];
                        return [4 /*yield*/, prisma_1.default.business.update({
                                where: { id: subscription.businessId },
                                data: {
                                    status: 'APPROVED',
                                    featured: true
                                }
                            })];
                    case 5:
                        _c.sent();
                        _c.label = 6;
                    case 6:
                        if (!subscription.professionalId) return [3 /*break*/, 8];
                        return [4 /*yield*/, prisma_1.default.professional.update({
                                where: { id: subscription.professionalId },
                                data: {
                                    status: 'APPROVED',
                                    featured: true
                                }
                            })];
                    case 7:
                        _c.sent();
                        _c.label = 8;
                    case 8:
                        if (!(subscription.user && subscription.plan)) return [3 /*break*/, 10];
                        return [4 /*yield*/, EmailService_1.default.sendPaymentConfirmationEmail(subscription.user.email, subscription.user.name, subscription.plan.name, payment.amount.toString(), subscription.endDate.toLocaleDateString('pt-BR'))];
                    case 9:
                        _c.sent();
                        _c.label = 10;
                    case 10: 
                    // Atualizar status da assinatura
                    return [4 /*yield*/, prisma_1.default.subscription.update({
                            where: { id: subscriptionId },
                            data: { status: subscriptionStatus },
                        })];
                    case 11:
                        // Atualizar status da assinatura
                        _c.sent();
                        return [2 /*return*/, { success: true }];
                    case 12:
                        error_2 = _c.sent();
                        console.error('Erro ao processar webhook de pagamento:', error_2);
                        throw error_2;
                    case 13: return [2 /*return*/];
                }
            });
        });
    };
    // Renovar assinatura
    PaymentService.prototype.renewSubscription = function (_a) {
        return __awaiter(this, arguments, void 0, function (_b) {
            var subscription, newEndDate, checkoutItem, externalReference, preferenceOptions, preference, error_3;
            var subscriptionId = _b.subscriptionId, paymentMethod = _b.paymentMethod, cardToken = _b.cardToken;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        _c.trys.push([0, 4, , 5]);
                        return [4 /*yield*/, prisma_1.default.subscription.findUnique({
                                where: { id: subscriptionId },
                                include: {
                                    user: true,
                                    plan: true,
                                },
                            })];
                    case 1:
                        subscription = _c.sent();
                        if (!subscription) {
                            throw new ApiError_1.ApiError(404, 'Assinatura não encontrada');
                        }
                        if (subscription.status !== 'ACTIVE') {
                            throw new ApiError_1.ApiError(400, 'Apenas assinaturas ativas podem ser renovadas');
                        }
                        newEndDate = new Date(subscription.endDate);
                        newEndDate.setDate(newEndDate.getDate() + subscription.plan.duration);
                        checkoutItem = {
                            id: subscription.plan.id,
                            title: "Renova\u00E7\u00E3o: ".concat(subscription.plan.name),
                            description: subscription.plan.description,
                            quantity: 1,
                            currency_id: 'BRL',
                            unit_price: Number(subscription.plan.price),
                        };
                        externalReference = "renew_".concat(subscription.id, "_").concat(Date.now());
                        preferenceOptions = {
                            items: [checkoutItem],
                            external_reference: externalReference,
                            auto_return: 'approved',
                            payment_methods: {
                                excluded_payment_types: [],
                                installments: 1
                            },
                            notification_url: "".concat(process.env.API_URL, "/payments/webhook"),
                        };
                        // Configurar métodos de pagamento específicos
                        if (paymentMethod === 'credit_card') {
                            preferenceOptions.payment_methods.excluded_payment_types = [
                                { id: 'ticket' },
                                { id: 'atm' },
                                { id: 'bank_transfer' }
                            ];
                        }
                        else if (paymentMethod === 'pix') {
                            preferenceOptions.payment_methods.excluded_payment_types = [
                                { id: 'credit_card' },
                                { id: 'debit_card' },
                                { id: 'ticket' },
                                { id: 'atm' }
                            ];
                        }
                        else if (paymentMethod === 'boleto') {
                            preferenceOptions.payment_methods.excluded_payment_types = [
                                { id: 'credit_card' },
                                { id: 'debit_card' },
                                { id: 'bank_transfer' }
                            ];
                        }
                        return [4 /*yield*/, payment_1.default.preferences.create(preferenceOptions)];
                    case 2:
                        preference = _c.sent();
                        // Criar registro de pagamento
                        return [4 /*yield*/, prisma_1.default.payment.create({
                                data: {
                                    subscriptionId: subscription.id,
                                    amount: Number(subscription.plan.price),
                                    status: 'PENDING',
                                    paymentMethod: paymentMethod.toUpperCase(),
                                    paymentIntentId: preference.body.id,
                                },
                            })];
                    case 3:
                        // Criar registro de pagamento
                        _c.sent();
                        return [2 /*return*/, {
                                preferenceId: preference.body.id,
                                initPoint: preference.body.init_point,
                                subscriptionId: subscription.id,
                            }];
                    case 4:
                        error_3 = _c.sent();
                        console.error('Erro ao renovar assinatura:', error_3);
                        throw error_3;
                    case 5: return [2 /*return*/];
                }
            });
        });
    };
    // Cancelar assinatura
    PaymentService.prototype.cancelSubscription = function (subscriptionId, userId, reason) {
        return __awaiter(this, void 0, void 0, function () {
            var subscription, error_4;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 5, , 6]);
                        return [4 /*yield*/, prisma_1.default.subscription.findUnique({
                                where: { id: subscriptionId },
                                include: {
                                    user: true,
                                    plan: true,
                                },
                            })];
                    case 1:
                        subscription = _a.sent();
                        if (!subscription) {
                            throw new ApiError_1.ApiError(404, 'Assinatura não encontrada');
                        }
                        // Verificar se o usuário tem permissão para cancelar a assinatura
                        if (subscription.userId !== userId) {
                            throw new ApiError_1.ApiError(403, 'Você não tem permissão para cancelar esta assinatura');
                        }
                        // Verificar se a assinatura já está cancelada
                        if (subscription.status === 'CANCELED') {
                            throw new ApiError_1.ApiError(400, 'Esta assinatura já está cancelada');
                        }
                        // Atualizar status da assinatura
                        return [4 /*yield*/, prisma_1.default.subscription.update({
                                where: { id: subscriptionId },
                                data: {
                                    status: 'CANCELED',
                                    autoRenew: false,
                                    updatedAt: new Date(),
                                },
                            })];
                    case 2:
                        // Atualizar status da assinatura
                        _a.sent();
                        if (!(subscription.user && subscription.plan)) return [3 /*break*/, 4];
                        return [4 /*yield*/, EmailService_1.default.sendSubscriptionCancelationEmail(subscription.user.email, subscription.user.name, subscription.plan.name)];
                    case 3:
                        _a.sent();
                        _a.label = 4;
                    case 4: return [2 /*return*/, { canceled: true }];
                    case 5:
                        error_4 = _a.sent();
                        console.error('Erro ao cancelar assinatura:', error_4);
                        throw error_4;
                    case 6: return [2 /*return*/];
                }
            });
        });
    };
    // Verificar assinaturas prestes a expirar
    PaymentService.prototype.checkExpiringSubscriptions = function () {
        return __awaiter(this, void 0, void 0, function () {
            var today, nextWeek, expiringSubscriptions, _i, expiringSubscriptions_1, subscription, error_5;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 6, , 7]);
                        today = new Date();
                        nextWeek = new Date();
                        nextWeek.setDate(today.getDate() + 7);
                        return [4 /*yield*/, prisma_1.default.subscription.findMany({
                                where: {
                                    status: 'ACTIVE',
                                    endDate: {
                                        gte: today,
                                        lte: nextWeek
                                    }
                                },
                                include: {
                                    user: true,
                                    plan: true
                                }
                            })];
                    case 1:
                        expiringSubscriptions = _a.sent();
                        _i = 0, expiringSubscriptions_1 = expiringSubscriptions;
                        _a.label = 2;
                    case 2:
                        if (!(_i < expiringSubscriptions_1.length)) return [3 /*break*/, 5];
                        subscription = expiringSubscriptions_1[_i];
                        if (!(subscription.user && subscription.plan)) return [3 /*break*/, 4];
                        return [4 /*yield*/, EmailService_1.default.sendSubscriptionExpiringEmail(subscription.user.email, subscription.user.name, subscription.plan.name, subscription.endDate.toLocaleDateString('pt-BR'))];
                    case 3:
                        _a.sent();
                        _a.label = 4;
                    case 4:
                        _i++;
                        return [3 /*break*/, 2];
                    case 5: return [2 /*return*/, {
                            processed: expiringSubscriptions.length,
                            subscriptions: expiringSubscriptions.map(function (s) { return ({
                                id: s.id,
                                userId: s.userId,
                                planId: s.planId,
                                endDate: s.endDate
                            }); })
                        }];
                    case 6:
                        error_5 = _a.sent();
                        console.error('Erro ao verificar assinaturas prestes a expirar:', error_5);
                        throw error_5;
                    case 7: return [2 /*return*/];
                }
            });
        });
    };
    // Processar renovações automáticas
    PaymentService.prototype.processAutoRenewals = function () {
        return __awaiter(this, void 0, void 0, function () {
            var today, tomorrow, subscriptionsToRenew, results, _i, subscriptionsToRenew_1, subscription, lastPayment, paymentMethod, renewalResult, error_6, error_7;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 8, , 9]);
                        today = new Date();
                        tomorrow = new Date();
                        tomorrow.setDate(today.getDate() + 1);
                        return [4 /*yield*/, prisma_1.default.subscription.findMany({
                                where: {
                                    status: 'ACTIVE',
                                    autoRenew: true,
                                    endDate: {
                                        gte: today,
                                        lt: tomorrow
                                    }
                                },
                                include: {
                                    user: true,
                                    plan: true,
                                    payments: {
                                        orderBy: {
                                            createdAt: 'desc'
                                        },
                                        take: 1
                                    }
                                }
                            })];
                    case 1:
                        subscriptionsToRenew = _a.sent();
                        results = [];
                        _i = 0, subscriptionsToRenew_1 = subscriptionsToRenew;
                        _a.label = 2;
                    case 2:
                        if (!(_i < subscriptionsToRenew_1.length)) return [3 /*break*/, 7];
                        subscription = subscriptionsToRenew_1[_i];
                        _a.label = 3;
                    case 3:
                        _a.trys.push([3, 5, , 6]);
                        lastPayment = subscription.payments[0];
                        if (!lastPayment) {
                            return [3 /*break*/, 6];
                        }
                        paymentMethod = lastPayment.paymentMethod.toLowerCase();
                        return [4 /*yield*/, this.renewSubscription({
                                subscriptionId: subscription.id,
                                paymentMethod: paymentMethod
                            })];
                    case 4:
                        renewalResult = _a.sent();
                        results.push({
                            subscriptionId: subscription.id,
                            userId: subscription.userId,
                            planId: subscription.planId,
                            status: 'renewed',
                            preferenceId: renewalResult.preferenceId
                        });
                        return [3 /*break*/, 6];
                    case 5:
                        error_6 = _a.sent();
                        console.error("Erro ao renovar assinatura ".concat(subscription.id, ":"), error_6);
                        results.push({
                            subscriptionId: subscription.id,
                            userId: subscription.userId,
                            planId: subscription.planId,
                            status: 'error',
                            error: error_6 instanceof Error ? error_6.message : 'Erro desconhecido'
                        });
                        return [3 /*break*/, 6];
                    case 6:
                        _i++;
                        return [3 /*break*/, 2];
                    case 7: return [2 /*return*/, {
                            processed: subscriptionsToRenew.length,
                            results: results
                        }];
                    case 8:
                        error_7 = _a.sent();
                        console.error('Erro ao processar renovações automáticas:', error_7);
                        throw error_7;
                    case 9: return [2 /*return*/];
                }
            });
        });
    };
    // Obter informações de pagamento
    PaymentService.prototype.getPaymentInfo = function (paymentId_1) {
        return __awaiter(this, arguments, void 0, function (paymentId, source) {
            var payment, mpPaymentInfo, mpResponse, mpError_1, error_8;
            if (source === void 0) { source = 'api'; }
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 6, , 7]);
                        return [4 /*yield*/, prisma_1.default.payment.findUnique({
                                where: { id: paymentId },
                                include: {
                                    subscription: {
                                        include: {
                                            user: true,
                                            plan: true,
                                            business: true,
                                            professional: true
                                        }
                                    }
                                }
                            })];
                    case 1:
                        payment = _a.sent();
                        if (!payment) {
                            throw new ApiError_1.ApiError(404, 'Pagamento não encontrado');
                        }
                        mpPaymentInfo = null;
                        if (!payment.paymentIntentId) return [3 /*break*/, 5];
                        _a.label = 2;
                    case 2:
                        _a.trys.push([2, 4, , 5]);
                        return [4 /*yield*/, payment_1.default.preferences.get(payment.paymentIntentId)];
                    case 3:
                        mpResponse = _a.sent();
                        mpPaymentInfo = mpResponse.body;
                        return [3 /*break*/, 5];
                    case 4:
                        mpError_1 = _a.sent();
                        console.error('Erro ao buscar informações do Mercado Pago:', mpError_1);
                        return [3 /*break*/, 5];
                    case 5: return [2 /*return*/, {
                            payment: {
                                id: payment.id,
                                amount: payment.amount,
                                status: payment.status,
                                paymentMethod: payment.paymentMethod,
                                createdAt: payment.createdAt,
                                paidAt: payment.paidAt
                            },
                            subscription: payment.subscription ? {
                                id: payment.subscription.id,
                                status: payment.subscription.status,
                                startDate: payment.subscription.startDate,
                                endDate: payment.subscription.endDate,
                                plan: payment.subscription.plan ? {
                                    id: payment.subscription.plan.id,
                                    name: payment.subscription.plan.name,
                                    price: payment.subscription.plan.price
                                } : null,
                                user: payment.subscription.user ? {
                                    id: payment.subscription.user.id,
                                    name: payment.subscription.user.name,
                                    email: payment.subscription.user.email
                                } : null
                            } : null,
                            mercadoPago: mpPaymentInfo,
                            source: source
                        }];
                    case 6:
                        error_8 = _a.sent();
                        console.error('Erro ao obter informações de pagamento:', error_8);
                        throw error_8;
                    case 7: return [2 /*return*/];
                }
            });
        });
    };
    return PaymentService;
}());
exports.default = new PaymentService();
