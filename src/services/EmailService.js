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
var resend_1 = require("../config/resend");
var EmailService = /** @class */ (function () {
    function EmailService() {
        this.defaultFrom = 'no-reply@anunciargrajau.com.br';
    }
    // Enviar email genérico
    EmailService.prototype.sendEmail = function (data) {
        return __awaiter(this, void 0, void 0, function () {
            var to, subject, html, _a, from, text, cc, bcc, replyTo, error_1;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        _b.trys.push([0, 2, , 3]);
                        to = data.to, subject = data.subject, html = data.html, _a = data.from, from = _a === void 0 ? this.defaultFrom : _a, text = data.text, cc = data.cc, bcc = data.bcc, replyTo = data.replyTo;
                        return [4 /*yield*/, resend_1.resend.emails.send({
                                from: from,
                                to: to,
                                subject: subject,
                                html: html,
                                text: text,
                                cc: cc,
                                bcc: bcc,
                                reply_to: replyTo,
                            })];
                    case 1:
                        _b.sent();
                        return [2 /*return*/, true];
                    case 2:
                        error_1 = _b.sent();
                        console.error('Erro ao enviar email:', error_1);
                        return [2 /*return*/, false];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    // Email de boas-vindas
    EmailService.prototype.sendWelcomeEmail = function (to, name) {
        return __awaiter(this, void 0, void 0, function () {
            var subject, html;
            return __generator(this, function (_a) {
                subject = 'Bem-vindo ao Anunciar Grajaú';
                html = "\n      <div style=\"font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;\">\n        <h1 style=\"color: #4a6da7;\">Bem-vindo ao Anunciar Graja\u00FA!</h1>\n        <p>Ol\u00E1, ".concat(name, "!</p>\n        <p>Estamos muito felizes em t\u00EA-lo conosco. O Anunciar Graja\u00FA \u00E9 a plataforma ideal para conectar empresas, profissionais e clientes na regi\u00E3o do Graja\u00FA.</p>\n        <p>Com sua conta, voc\u00EA pode:</p>\n        <ul>\n          <li>Explorar ofertas de trabalho</li>\n          <li>Conectar-se com profissionais qualificados</li>\n          <li>Divulgar sua empresa ou servi\u00E7os</li>\n          <li>Acompanhar as novidades da regi\u00E3o</li>\n        </ul>\n        <p>Se tiver qualquer d\u00FAvida, basta responder a este email.</p>\n        <p>Atenciosamente,<br>Equipe Anunciar Graja\u00FA</p>\n      </div>\n    ");
                return [2 /*return*/, this.sendEmail({ to: to, subject: subject, html: html })];
            });
        });
    };
    // Email de aprovação do cadastro
    EmailService.prototype.sendApprovalEmail = function (to, name, type) {
        return __awaiter(this, void 0, void 0, function () {
            var subject, html;
            return __generator(this, function (_a) {
                subject = 'Seu cadastro foi aprovado!';
                html = "\n      <div style=\"font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;\">\n        <h1 style=\"color: #4a6da7;\">Cadastro Aprovado!</h1>\n        <p>Ol\u00E1, ".concat(name, "!</p>\n        <p>Temos o prazer de informar que seu cadastro como ").concat(type === 'business' ? 'empresa' : 'profissional', " foi <strong>aprovado</strong> no Anunciar Graja\u00FA.</p>\n        <p>A partir de agora, voc\u00EA pode desfrutar de todos os recursos da plataforma:</p>\n        <ul>\n          ").concat(type === 'business'
                    ? "\n                <li>Publicar vagas de emprego</li>\n                <li>Receber candidaturas</li>\n                <li>Destacar sua empresa no diret\u00F3rio</li>\n              "
                    : "\n                <li>Destacar seu perfil profissional</li>\n                <li>Receber propostas de trabalho</li>\n                <li>Candidatar-se a vagas dispon\u00EDveis</li>\n              ", "\n        </ul>\n        <p>Acesse agora mesmo e comece a explorar todas as funcionalidades!</p>\n        <p>Atenciosamente,<br>Equipe Anunciar Graja\u00FA</p>\n      </div>\n    ");
                return [2 /*return*/, this.sendEmail({ to: to, subject: subject, html: html })];
            });
        });
    };
    // Email de confirmação de pagamento
    EmailService.prototype.sendPaymentConfirmationEmail = function (to, name, planName, amount, endDate) {
        return __awaiter(this, void 0, void 0, function () {
            var subject, html;
            return __generator(this, function (_a) {
                subject = 'Confirmação de Pagamento';
                html = "\n      <div style=\"font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;\">\n        <h1 style=\"color: #4a6da7;\">Pagamento Confirmado!</h1>\n        <p>Ol\u00E1, ".concat(name, "!</p>\n        <p>Seu pagamento do plano <strong>").concat(planName, "</strong> foi processado com sucesso.</p>\n        <p><strong>Valor:</strong> R$ ").concat(amount, "</p>\n        <p><strong>V\u00E1lido at\u00E9:</strong> ").concat(endDate, "</p>\n        <p>Voc\u00EA j\u00E1 pode desfrutar de todos os benef\u00EDcios do seu plano. Obrigado pela confian\u00E7a!</p>\n        <p>Atenciosamente,<br>Equipe Anunciar Graja\u00FA</p>\n      </div>\n    ");
                return [2 /*return*/, this.sendEmail({ to: to, subject: subject, html: html })];
            });
        });
    };
    // Email de notificação de nova candidatura
    EmailService.prototype.sendNewApplicationEmail = function (to, jobTitle, applicantName) {
        return __awaiter(this, void 0, void 0, function () {
            var subject, html;
            return __generator(this, function (_a) {
                subject = "Nova candidatura para: ".concat(jobTitle);
                html = "\n      <div style=\"font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;\">\n        <h1 style=\"color: #4a6da7;\">Nova Candidatura Recebida!</h1>\n        <p>Voc\u00EA recebeu uma nova candidatura para a vaga <strong>".concat(jobTitle, "</strong>.</p>\n        <p><strong>Candidato:</strong> ").concat(applicantName, "</p>\n        <p>Acesse a plataforma para ver mais detalhes e o curr\u00EDculo do candidato.</p>\n        <p>Atenciosamente,<br>Equipe Anunciar Graja\u00FA</p>\n      </div>\n    ");
                return [2 /*return*/, this.sendEmail({ to: to, subject: subject, html: html })];
            });
        });
    };
    // Email de candidatura a vaga
    EmailService.prototype.sendJobApplicationEmail = function (to, name, jobTitle, professionalOccupation) {
        return __awaiter(this, void 0, void 0, function () {
            var subject, html;
            return __generator(this, function (_a) {
                subject = "Nova candidatura para a vaga: ".concat(jobTitle);
                html = "\n      <div style=\"font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;\">\n        <h1 style=\"color: #4a6da7;\">Nova Candidatura Recebida!</h1>\n        <p>Ol\u00E1, ".concat(name, "!</p>\n        <p>Voc\u00EA recebeu uma nova candidatura para a vaga <strong>").concat(jobTitle, "</strong>.</p>\n        <p><strong>Profissional:</strong> ").concat(professionalOccupation, "</p>\n        <p>Acesse a plataforma para ver mais detalhes sobre o candidato e seu curr\u00EDculo.</p>\n        <p>Atenciosamente,<br>Equipe Anunciar Graja\u00FA</p>\n      </div>\n    ");
                return [2 /*return*/, this.sendEmail({ to: to, subject: subject, html: html })];
            });
        });
    };
    // Email de atualização de status de candidatura
    EmailService.prototype.sendJobApplicationStatusEmail = function (to, name, subject, message) {
        return __awaiter(this, void 0, void 0, function () {
            var html;
            return __generator(this, function (_a) {
                html = "\n      <div style=\"font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;\">\n        <h1 style=\"color: #4a6da7;\">".concat(subject, "</h1>\n        <p>Ol\u00E1, ").concat(name, "!</p>\n        <p>").concat(message, "</p>\n        <p>Atenciosamente,<br>Equipe Anunciar Graja\u00FA</p>\n      </div>\n    ");
                return [2 /*return*/, this.sendEmail({ to: to, subject: subject, html: html })];
            });
        });
    };
    // Email de cancelamento de candidatura
    EmailService.prototype.sendJobApplicationCancelEmail = function (to, name, jobTitle) {
        return __awaiter(this, void 0, void 0, function () {
            var subject, html;
            return __generator(this, function (_a) {
                subject = "Candidatura cancelada para a vaga: ".concat(jobTitle);
                html = "\n      <div style=\"font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;\">\n        <h1 style=\"color: #4a6da7;\">Candidatura Cancelada</h1>\n        <p>Ol\u00E1, ".concat(name, "!</p>\n        <p>Um candidato cancelou sua candidatura para a vaga <strong>").concat(jobTitle, "</strong>.</p>\n        <p>Acesse a plataforma para ver mais detalhes.</p>\n        <p>Atenciosamente,<br>Equipe Anunciar Graja\u00FA</p>\n      </div>\n    ");
                return [2 /*return*/, this.sendEmail({ to: to, subject: subject, html: html })];
            });
        });
    };
    // Email de cancelamento de assinatura
    EmailService.prototype.sendSubscriptionCancelationEmail = function (to, name, planName) {
        return __awaiter(this, void 0, void 0, function () {
            var subject, html;
            return __generator(this, function (_a) {
                subject = 'Confirmação de Cancelamento de Assinatura';
                html = "\n      <div style=\"font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;\">\n        <h1 style=\"color: #4a6da7;\">Assinatura Cancelada</h1>\n        <p>Ol\u00E1, ".concat(name, "!</p>\n        <p>Confirmamos o cancelamento da sua assinatura do plano <strong>").concat(planName, "</strong>.</p>\n        <p>Voc\u00EA ainda poder\u00E1 utilizar os recursos do plano at\u00E9 o final do per\u00EDodo j\u00E1 pago.</p>\n        <p>Sentiremos sua falta! Se desejar reativar sua assinatura no futuro, estaremos aqui para ajudar.</p>\n        <p>Atenciosamente,<br>Equipe Anunciar Graja\u00FA</p>\n      </div>\n    ");
                return [2 /*return*/, this.sendEmail({ to: to, subject: subject, html: html })];
            });
        });
    };
    // Email de notificação de assinatura prestes a expirar
    EmailService.prototype.sendSubscriptionExpiringEmail = function (to, name, planName, expirationDate) {
        return __awaiter(this, void 0, void 0, function () {
            var subject, html;
            return __generator(this, function (_a) {
                subject = 'Sua assinatura está prestes a expirar';
                html = "\n      <div style=\"font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;\">\n        <h1 style=\"color: #4a6da7;\">Assinatura Prestes a Expirar</h1>\n        <p>Ol\u00E1, ".concat(name, "!</p>\n        <p>Gostar\u00EDamos de informar que sua assinatura do plano <strong>").concat(planName, "</strong> expirar\u00E1 em <strong>").concat(expirationDate, "</strong>.</p>\n        <p>Para continuar desfrutando de todos os benef\u00EDcios, recomendamos que renove sua assinatura antes desta data.</p>\n        <p>Se voc\u00EA ativou a renova\u00E7\u00E3o autom\u00E1tica, n\u00E3o precisa se preocupar - sua assinatura ser\u00E1 renovada automaticamente.</p>\n        <p>Atenciosamente,<br>Equipe Anunciar Graja\u00FA</p>\n      </div>\n    ");
                return [2 /*return*/, this.sendEmail({ to: to, subject: subject, html: html })];
            });
        });
    };
    return EmailService;
}());
exports.default = new EmailService();
