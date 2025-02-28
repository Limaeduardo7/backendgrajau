"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.InternalServerError = exports.ValidationError = exports.ConflictError = exports.NotFoundError = exports.ForbiddenError = exports.UnauthorizedError = exports.BadRequestError = exports.ApiError = void 0;
var ApiError = /** @class */ (function (_super) {
    __extends(ApiError, _super);
    function ApiError(statusCode, message, errors, isOperational, stack) {
        if (isOperational === void 0) { isOperational = true; }
        if (stack === void 0) { stack = ''; }
        var _this = _super.call(this, message) || this;
        _this.statusCode = statusCode;
        _this.errors = errors;
        _this.isOperational = isOperational;
        if (stack) {
            _this.stack = stack;
        }
        else {
            Error.captureStackTrace(_this, _this.constructor);
        }
        return _this;
    }
    return ApiError;
}(Error));
exports.ApiError = ApiError;
var BadRequestError = /** @class */ (function (_super) {
    __extends(BadRequestError, _super);
    function BadRequestError(message, errors) {
        if (message === void 0) { message = 'Requisição inválida'; }
        return _super.call(this, 400, message, errors) || this;
    }
    return BadRequestError;
}(ApiError));
exports.BadRequestError = BadRequestError;
var UnauthorizedError = /** @class */ (function (_super) {
    __extends(UnauthorizedError, _super);
    function UnauthorizedError(message, errors) {
        if (message === void 0) { message = 'Não autorizado'; }
        return _super.call(this, 401, message, errors) || this;
    }
    return UnauthorizedError;
}(ApiError));
exports.UnauthorizedError = UnauthorizedError;
var ForbiddenError = /** @class */ (function (_super) {
    __extends(ForbiddenError, _super);
    function ForbiddenError(message, errors) {
        if (message === void 0) { message = 'Acesso negado'; }
        return _super.call(this, 403, message, errors) || this;
    }
    return ForbiddenError;
}(ApiError));
exports.ForbiddenError = ForbiddenError;
var NotFoundError = /** @class */ (function (_super) {
    __extends(NotFoundError, _super);
    function NotFoundError(message, errors) {
        if (message === void 0) { message = 'Recurso não encontrado'; }
        return _super.call(this, 404, message, errors) || this;
    }
    return NotFoundError;
}(ApiError));
exports.NotFoundError = NotFoundError;
var ConflictError = /** @class */ (function (_super) {
    __extends(ConflictError, _super);
    function ConflictError(message, errors) {
        if (message === void 0) { message = 'Conflito de dados'; }
        return _super.call(this, 409, message, errors) || this;
    }
    return ConflictError;
}(ApiError));
exports.ConflictError = ConflictError;
var ValidationError = /** @class */ (function (_super) {
    __extends(ValidationError, _super);
    function ValidationError(message, errors) {
        if (message === void 0) { message = 'Erro de validação'; }
        return _super.call(this, 422, message, errors) || this;
    }
    return ValidationError;
}(ApiError));
exports.ValidationError = ValidationError;
var InternalServerError = /** @class */ (function (_super) {
    __extends(InternalServerError, _super);
    function InternalServerError(message, errors) {
        if (message === void 0) { message = 'Erro interno do servidor'; }
        return _super.call(this, 500, message, errors, false) || this;
    }
    return InternalServerError;
}(ApiError));
exports.InternalServerError = InternalServerError;
