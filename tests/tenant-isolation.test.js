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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var prisma_tenant_1 = require("../database/utils/prisma-tenant");
var prisma_1 = __importDefault(require("../database/utils/prisma"));
function runTests() {
    return __awaiter(this, void 0, void 0, function () {
        var tenantA, tenantB, userA, userB, prismaTenantA, usersA, error_1, error_2;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    console.log('--- Running Tenant Isolation Tests ---');
                    return [4 /*yield*/, prisma_1.default.tenant.create({ data: { name: 'Tenant A' } })];
                case 1:
                    tenantA = _a.sent();
                    return [4 /*yield*/, prisma_1.default.tenant.create({ data: { name: 'Tenant B' } })];
                case 2:
                    tenantB = _a.sent();
                    return [4 /*yield*/, prisma_1.default.user.create({ data: { clerkId: 'user_a_' + Date.now(), email: 'a@a.com', tenantId: tenantA.id } })];
                case 3:
                    userA = _a.sent();
                    return [4 /*yield*/, prisma_1.default.user.create({ data: { clerkId: 'user_b_' + Date.now(), email: 'b@b.com', tenantId: tenantB.id } })];
                case 4:
                    userB = _a.sent();
                    prismaTenantA = (0, prisma_tenant_1.withTenant)(tenantA.id);
                    return [4 /*yield*/, prismaTenantA.user.findMany()];
                case 5:
                    usersA = _a.sent();
                    if (!(usersA.length === 1 && usersA[0].id === userA.id))
                        throw new Error('Tenant A should only see User A');
                    console.log('✔ Tenant isolation successful (findMany)');
                    _a.label = 6;
                case 6:
                    _a.trys.push([6, 8, , 9]);
                    return [4 /*yield*/, prismaTenantA.user.update({
                            where: { id: userB.id },
                            data: { status: 'INACTIVE' }
                        })];
                case 7:
                    _a.sent();
                    throw new Error('Should not be able to update another tenant\'s user');
                case 8:
                    error_1 = _a.sent();
                    if (!error_1.message.includes('Record not found or access denied'))
                        throw error_1;
                    console.log('✔ Cross-tenant update prevented');
                    return [3 /*break*/, 9];
                case 9:
                    _a.trys.push([9, 11, , 12]);
                    return [4 /*yield*/, prismaTenantA.user.update({
                            where: { id: userA.id },
                            data: { tenantId: tenantB.id }
                        })];
                case 10:
                    _a.sent();
                    throw new Error('Should not be able to change tenantId');
                case 11:
                    error_2 = _a.sent();
                    if (error_2.message !== 'Tenant ID is immutable')
                        throw error_2;
                    console.log('✔ TenantId immutability enforced');
                    return [3 /*break*/, 12];
                case 12: 
                // 4. Cleanup
                return [4 /*yield*/, prisma_1.default.tenant.deleteMany({ where: { id: { in: [tenantA.id, tenantB.id] } } })];
                case 13:
                    // 4. Cleanup
                    _a.sent();
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
