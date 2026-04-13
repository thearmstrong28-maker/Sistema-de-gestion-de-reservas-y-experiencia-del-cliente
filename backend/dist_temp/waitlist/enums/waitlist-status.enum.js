"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ACTIVE_WAITLIST_STATUSES = exports.WaitlistStatus = void 0;
var WaitlistStatus;
(function (WaitlistStatus) {
    WaitlistStatus["Waiting"] = "waiting";
    WaitlistStatus["Notified"] = "notified";
    WaitlistStatus["Accepted"] = "accepted";
    WaitlistStatus["Expired"] = "expired";
    WaitlistStatus["Cancelled"] = "cancelled";
})(WaitlistStatus || (exports.WaitlistStatus = WaitlistStatus = {}));
exports.ACTIVE_WAITLIST_STATUSES = [
    WaitlistStatus.Waiting,
    WaitlistStatus.Notified,
];
//# sourceMappingURL=waitlist-status.enum.js.map