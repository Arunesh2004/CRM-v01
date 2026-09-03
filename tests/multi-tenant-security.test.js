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
var fs_1 = __importDefault(require("fs"));
var path_1 = __importDefault(require("path"));
function runTests() {
    return __awaiter(this, void 0, void 0, function () {
        function walk(dir, ext, cb) {
            if (!fs_1.default.existsSync(dir))
                return;
            var files = fs_1.default.readdirSync(dir);
            for (var _i = 0, files_1 = files; _i < files_1.length; _i++) {
                var file = files_1[_i];
                var fullPath = path_1.default.join(dir, file);
                if (fs_1.default.statSync(fullPath).isDirectory()) {
                    walk(fullPath, ext, cb);
                }
                else if (fullPath.endsWith(ext)) {
                    cb(fullPath, fs_1.default.readFileSync(fullPath, 'utf8'));
                }
            }
        }
        var srcDir, violations, schemaPath, schemaContent, models, _i, models_1, modelDef, modelName, authLibPath, authContent;
        return __generator(this, function (_a) {
            console.log('--- Running Multi-Tenant Security Audit Tests ---');
            srcDir = path_1.default.join(process.cwd(), '/src');
            violations = 0;
            console.log('\\n[1] Verifying Server Actions...');
            walk(path_1.default.join(srcDir, 'app'), '.ts', function (filepath, content) {
                // Only check files that appear to have server actions
                if (content.includes('"use server"') || content.includes("'use server'")) {
                    if (content.includes('prisma.') && !content.includes('requireAuth')) {
                        console.error("Violation: Server action missing requireAuth() check in ".concat(filepath));
                        violations++;
                    }
                    // Specifically check if Prisma queries explicitly use tenantId
                    if (content.match(/prisma\.[a-zA-Z0-9]+\.(findMany|findUnique|findFirst|update|delete|create)\(/)) {
                        if (!content.includes('tenantId') && !content.includes('where: {') && !content.includes('id:')) {
                            // Basic heuristics: if doing DB operations, must scope by tenantId
                            console.warn("Warning: Potential unscoped Prisma query in ".concat(filepath));
                        }
                    }
                }
            });
            console.log('\\n[2] Verifying API Routes...');
            walk(path_1.default.join(srcDir, 'app/api'), 'route.ts', function (filepath, content) {
                if (filepath.includes('webhooks') || filepath.includes('health'))
                    return; // Webhooks use Svix, Health is public
                if (content.includes('prisma.') && !content.includes('requireAuth')) {
                    console.error("Violation: API route missing requireAuth() check in ".concat(filepath));
                    violations++;
                }
            });
            console.log('\\n[3] Verifying Database Security (Prisma)...');
            schemaPath = path_1.default.join(process.cwd(), '/database/schema.prisma');
            if (fs_1.default.existsSync(schemaPath)) {
                schemaContent = fs_1.default.readFileSync(schemaPath, 'utf8');
                models = schemaContent.split('\nmodel ').slice(1);
                for (_i = 0, models_1 = models; _i < models_1.length; _i++) {
                    modelDef = models_1[_i];
                    modelName = modelDef.split(' ')[0].trim();
                    // Exclude global system models and infrastructure models
                    if (['Tenant', 'User', 'WebhookEvent', 'Permission', 'RolePermission', 'UserRole', 'Plan', 'CCTVNode', 'RecordingIngestionJob', 'RetentionDeletionJob', 'AIAnalysisJob', 'AITool'].includes(modelName))
                        continue;
                    if (!modelDef.includes('tenantId')) {
                        console.error("Violation: Model ".concat(modelName, " is missing tenantId relation!"));
                        violations++;
                    }
                }
            }
            console.log('\\n[4] Verifying RBAC Boundaries...');
            authLibPath = path_1.default.join(srcDir, 'lib/auth.ts');
            if (fs_1.default.existsSync(authLibPath)) {
                authContent = fs_1.default.readFileSync(authLibPath, 'utf8');
                if (!authContent.includes('requirePermission')) {
                    console.error('Violation: requirePermission logic missing from auth abstraction.');
                    violations++;
                }
            }
            if (violations > 0) {
                console.error("\\n\u274C Audit Failed with ".concat(violations, " violations."));
                process.exit(1);
            }
            else {
                console.log('\\n✔ Multi-Tenant Security checks passed.');
                console.log('--- Tests Completed Successfully ---');
            }
            return [2 /*return*/];
        });
    });
}
runTests().catch(console.error);
