// Returns a new object containing only the allowed keys that are present on `source`.
// Used to keep server-controlled fields (ownership, relationships, counters) out of
// create/update payloads regardless of Mongoose schema strictness.
const pickFields = (source, allowedFields) => {
    const picked = {};

    if (!source || typeof source !== 'object') {
        return picked;
    }

    for (const field of allowedFields) {
        if (Object.prototype.hasOwnProperty.call(source, field) && source[field] !== undefined) {
            picked[field] = source[field];
        }
    }

    return picked;
};

module.exports = pickFields;
