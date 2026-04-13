"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ALL_ROLES = exports.Role = void 0;
var Role;
(function (Role) {
    Role["Admin"] = "admin";
    Role["Host"] = "host";
    Role["Manager"] = "manager";
    Role["Customer"] = "customer";
})(Role || (exports.Role = Role = {}));
exports.ALL_ROLES = [
    Role.Admin,
    Role.Host,
    Role.Manager,
    Role.Customer,
];
//# sourceMappingURL=role.enum.js.map