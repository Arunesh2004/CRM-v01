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
var twilio_provider_1 = require("../src/lib/providers/telephony/twilio.provider");
var gemini_provider_1 = require("../src/lib/providers/ai/gemini.provider");
function testMissingCredentials() {
    return __awaiter(this, void 0, void 0, function () {
        var errors, provider, res, e_1, provider, res, e_2;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    console.log('--- Running S7 Missing Credentials Matrix ---');
                    // Clear env vars
                    delete process.env.TWILIO_ACCOUNT_SID;
                    delete process.env.TWILIO_AUTH_TOKEN;
                    delete process.env.GEMINI_API_KEY;
                    delete process.env.AWS_ACCESS_KEY_ID;
                    delete process.env.PUSHER_APP_ID;
                    errors = 0;
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, , 4]);
                    provider = new twilio_provider_1.TwilioProvider();
                    return [4 /*yield*/, provider.makeCall('+123', '+456')];
                case 2:
                    res = _a.sent();
                    if (res.success !== false) {
                        console.error('❌ Twilio should fail gracefully without credentials');
                        errors++;
                    }
                    else {
                        console.log('✔ Twilio degraded safely:', res.error);
                    }
                    return [3 /*break*/, 4];
                case 3:
                    e_1 = _a.sent();
                    console.error('❌ Twilio threw an exception instead of degrading safely:', e_1.message);
                    errors++;
                    return [3 /*break*/, 4];
                case 4:
                    _a.trys.push([4, 6, , 7]);
                    provider = new gemini_provider_1.GeminiProvider();
                    return [4 /*yield*/, provider.generateResponse('test', [])];
                case 5:
                    res = _a.sent();
                    if (res !== null && res.success !== false) {
                        console.error('❌ Gemini should fail gracefully without credentials');
                        errors++;
                    }
                    else {
                        console.log('✔ Gemini degraded safely');
                    }
                    return [3 /*break*/, 7];
                case 6:
                    e_2 = _a.sent();
                    if (!e_2.message.includes('API key not valid') && !e_2.message.includes('API key')) {
                        console.error('❌ Gemini threw unexpected exception:', e_2.message);
                        errors++;
                    }
                    else {
                        console.log('✔ Gemini degraded safely (API error trapped by caller):', e_2.message);
                    }
                    return [3 /*break*/, 7];
                case 7:
                    // If no fatal crashes happened during instantiation, it's safe.
                    if (errors > 0) {
                        console.error("\u274C S7 Matrix Failed with ".concat(errors, " errors."));
                        process.exit(1);
                    }
                    else {
                        console.log('✔ S7 Matrix passed. Providers degrade gracefully without credentials.');
                    }
                    return [2 /*return*/];
            }
        });
    });
}
testMissingCredentials().catch(function (e) {
    console.error('Unhandled crash:', e);
    process.exit(1);
});
