"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ACTIVE_RESERVATION_STATUSES = exports.ReservationStatus = void 0;
var ReservationStatus;
(function (ReservationStatus) {
    ReservationStatus["Pending"] = "PENDING";
    ReservationStatus["Confirmed"] = "CONFIRMED";
    ReservationStatus["Cancelled"] = "CANCELLED";
    ReservationStatus["NoShow"] = "NO_SHOW";
    ReservationStatus["Seated"] = "SEATED";
    ReservationStatus["Completed"] = "COMPLETED";
})(ReservationStatus || (exports.ReservationStatus = ReservationStatus = {}));
exports.ACTIVE_RESERVATION_STATUSES = [
    ReservationStatus.Pending,
    ReservationStatus.Confirmed,
    ReservationStatus.Seated,
];
//# sourceMappingURL=reservation-status.enum.js.map