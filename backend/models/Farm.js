const mongoose = require("mongoose");

const farmSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },
        farmName: {
            type: String,
            required: true,
            trim: true
        },
        crop: {
            type: String,
            required: true,
            trim: true
        },
        area: {
            type: Number,
            required: true,
            min: 0
        },
        location: {
            type: String,
            required: true,
            trim: true
        },
        description: {
            type: String,
            trim: true,
            default: ""
        },
        status: {
            type: String,
            default: "Active"
        }
    },
    { timestamps: true }
);

module.exports = mongoose.model("Farm", farmSchema);
