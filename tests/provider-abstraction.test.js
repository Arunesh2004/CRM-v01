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
var provider_factory_1 = require("../src/lib/providers/provider.factory");
var webhook_security_1 = require("../src/lib/providers/webhook/webhook-security");
function runTests() {
    return __awaiter(this, void 0, void 0, function () {
        var emailProvider, telephonyProvider, messagingProvider, emailResult, callResult, msgResult, security, validTimestamp, isTimeValid, staleTimestamp, isStaleTimeValid;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    console.log('--- Running Provider Abstraction Tests ---');
                    emailProvider = provider_factory_1.ProviderFactory.getEmailProvider();
                    telephonyProvider = provider_factory_1.ProviderFactory.getTelephonyProvider();
                    messagingProvider = provider_factory_1.ProviderFactory.getMessagingProvider();
                    if (!emailProvider || !telephonyProvider || !messagingProvider) {
                        throw new Error('Factory failed to instantiate providers');
                    }
                    console.log('✔ Provider Factory successfully instantiated interfaces');
                    return [4 /*yield*/, emailProvider.sendEmail('test-tenant', { to: 'test@example.com', subject: 'Subject', html: '<p>Body</p>' })];
                case 1:
                    emailResult = _a.sent();
                    if (!emailResult.success)
                        throw new Error('Email provider failed');
                    console.log('✔ Email provider abstraction returned successfully:', emailResult);
                    return [4 /*yield*/, telephonyProvider.makeCall('+1234567890', '+0987654321')];
                case 2:
                    callResult = _a.sent();
                    if (!callResult.success)
                        throw new Error('Telephony provider failed');
                    console.log('✔ Telephony provider abstraction returned successfully:', callResult);
                    return [4 /*yield*/, messagingProvider.sendMessage('test-tenant', { to: '+1234567890', text: 'Hello from CRM', type: 'text' })];
                case 3:
                    msgResult = _a.sent();
                    if (!msgResult.success)
                        throw new Error('Messaging provider failed');
                    console.log('✔ Messaging provider abstraction returned successfully:', msgResult);
                    security = new webhook_security_1.WebhookSecurity();
                    validTimestamp = Math.floor(Date.now() / 1000).toString();
                    isTimeValid = security.verifyTimestamp(validTimestamp, 300);
                    if (!isTimeValid)
                        throw new Error('Webhook timestamp validation failed for valid time');
                    staleTimestamp = (Math.floor(Date.now() / 1000) - 1000).toString();
                    isStaleTimeValid = security.verifyTimestamp(staleTimestamp, 300);
                    if (isStaleTimeValid)
                        throw new Error('Webhook timestamp validation failed to reject stale time');
                    console.log('✔ Webhook Security replay protection validated correctly');
                    console.log('--- Tests Completed Successfully ---');
                    return [2 /*return*/];
            }
        });
    });
}
runTests().catch(function (e) {
    console.error(e);
    process.exit(1);
});
