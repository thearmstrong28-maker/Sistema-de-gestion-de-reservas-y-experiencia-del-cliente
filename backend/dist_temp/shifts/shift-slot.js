"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getShiftWindow = exports.extractShiftSlot = exports.buildShiftName = exports.isShiftSlot = exports.createLocalDateTime = exports.formatLocalTimeKey = exports.formatLocalDateKey = exports.SHIFT_SLOT_WINDOWS = exports.DEFAULT_SHIFT_SLOTS = void 0;
exports.DEFAULT_SHIFT_SLOTS = ['matutino', 'vespertino'];
exports.SHIFT_SLOT_WINDOWS = {
    matutino: {
        startsAt: '06:00:00',
        endsAt: '14:00:00',
    },
    vespertino: {
        startsAt: '14:00:00',
        endsAt: '22:00:00',
    },
};
const LEGACY_SHIFT_NAMES = {
    breakfast: 'matutino',
    lunch: 'vespertino',
    dinner: 'vespertino',
};
const padTimePart = (value) => String(value).padStart(2, '0');
const formatLocalDateKey = (value) => `${value.getFullYear()}-${padTimePart(value.getMonth() + 1)}-${padTimePart(value.getDate())}`;
exports.formatLocalDateKey = formatLocalDateKey;
const formatLocalTimeKey = (value) => `${padTimePart(value.getHours())}:${padTimePart(value.getMinutes())}:${padTimePart(value.getSeconds())}`;
exports.formatLocalTimeKey = formatLocalTimeKey;
const createLocalDateTime = (date, time) => new Date(`${date}T${time}`);
exports.createLocalDateTime = createLocalDateTime;
const isShiftSlot = (value) => value === 'matutino' || value === 'vespertino';
exports.isShiftSlot = isShiftSlot;
const buildShiftName = (shiftDate, slot) => `${shiftDate}:${slot}`;
exports.buildShiftName = buildShiftName;
const extractShiftSlot = (shiftName) => {
    if (!shiftName) {
        return null;
    }
    if (shiftName in LEGACY_SHIFT_NAMES) {
        return LEGACY_SHIFT_NAMES[shiftName];
    }
    const candidate = shiftName.split(':').pop();
    return (0, exports.isShiftSlot)(candidate) ? candidate : null;
};
exports.extractShiftSlot = extractShiftSlot;
const getShiftWindow = (shiftName) => {
    const slot = (0, exports.extractShiftSlot)(shiftName);
    return slot ? exports.SHIFT_SLOT_WINDOWS[slot] : null;
};
exports.getShiftWindow = getShiftWindow;
//# sourceMappingURL=shift-slot.js.map