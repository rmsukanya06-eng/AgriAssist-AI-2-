const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const path = require("path");
const db = require("./db");
require("dotenv").config();

const User = require("./models/User");
const Farm = require("./models/Farm");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Serve the existing AgriAssist HTML/CSS/JS files from the project root.
app.use(express.static(path.join(__dirname, "..")));

mongoose
    .connect(process.env.MONGO_URI)
    .then(() => console.log("MongoDB connected successfully"))
    .catch((error) => console.error("MongoDB connection failed:", error.message));

app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "..", "landing.html"));
});

// REGISTER
app.post("/api/register", async (req, res) => {
    try {
        const { name, username, email, password } = req.body;

        if (!name || !username || !email || !password) {
            return res.status(400).json({ message: "All fields are required" });
        }

        const existingUsername = await User.findOne({ username });
        if (existingUsername) {
            return res.status(400).json({ message: "Username already exists" });
        }

        const existingEmail = await User.findOne({ email: email.toLowerCase() });
        if (existingEmail) {
            return res.status(400).json({ message: "Email already registered" });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const user = await User.create({
            name,
            username,
            email,
            password: hashedPassword
        });

        console.log("New user registered:", username);

        res.status(201).json({
            message: "Registration successful",
            user: {
                id: user._id,
                name: user.name,
                username: user.username,
                email: user.email
            }
        });
    } catch (error) {
        console.error("Registration error:", error.message);
        res.status(500).json({ message: "Registration failed" });
    }
});

// LOGIN
app.post("/api/login", async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ message: "Username and password are required" });
        }

        const user = await User.findOne({ username });

        if (!user) {
            return res.status(401).json({ message: "Invalid username or password" });
        }

        const passwordMatches = await bcrypt.compare(password, user.password);

        if (!passwordMatches) {
            return res.status(401).json({ message: "Invalid username or password" });
        }

        console.log("User logged in:", username);

        res.status(200).json({
            message: "Login successful",
            user: {
                id: user._id,
                name: user.name,
                username: user.username,
                email: user.email
            }
        });
    } catch (error) {
        console.error("Login error:", error.message);
        res.status(500).json({ message: "Login failed" });
    }
});

// ADD FARM
app.post("/api/farms", async (req, res) => {
    try {
        const { userId, farmName, crop, area, location, description } = req.body;

        if (!userId || !farmName || !crop || area === undefined || area === "" || !location) {
            return res.status(400).json({ message: "Please fill all required farm fields" });
        }

        if (!mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(400).json({ message: "Invalid user" });
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: "User not found. Please login again." });
        }

        const farm = await Farm.create({
            userId,
            farmName,
            crop,
            area: Number(area),
            location,
            description: description || "",
            status: "Active"
        });

        console.log("Farm added:", farmName);

        res.status(201).json({
            message: "Farm added successfully",
            farm
        });
    } catch (error) {
        console.error("Add farm error:", error.message);
        res.status(500).json({ message: "Failed to add farm" });
    }
});

// GET LOGGED-IN USER'S FARMS
app.get("/api/farms", async (req, res) => {
    try {
        const { userId } = req.query;

        if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(400).json({ message: "Valid userId is required" });
        }

        const farms = await Farm.find({ userId }).sort({ createdAt: -1 });
        res.status(200).json(farms);
    } catch (error) {
        console.error("Fetch farms error:", error.message);
        res.status(500).json({ message: "Failed to fetch farms" });
    }
});

// UPDATE USER'S FARM
app.put("/api/farms/:id", async (req, res) => {
    try {
        const { userId, farmName, crop, area, location, description, status } = req.body;

        if (!userId || !farmName || !crop || area === undefined || area === "" || !location) {
            return res.status(400).json({ message: "Please fill all required farm fields" });
        }

        if (!mongoose.Types.ObjectId.isValid(userId) || !mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ message: "Invalid user or farm ID" });
        }

        if (Number(area) <= 0) {
            return res.status(400).json({ message: "Farm area must be greater than 0" });
        }

        const updatedFarm = await Farm.findOneAndUpdate(
            { _id: req.params.id, userId },
            {
                farmName: farmName.trim(),
                crop: crop.trim(),
                area: Number(area),
                location: location.trim(),
                description: (description || "").trim(),
                status: status || "Active"
            },
            { new: true, runValidators: true }
        );

        if (!updatedFarm) {
            return res.status(404).json({ message: "Farm not found" });
        }

        console.log("Farm updated:", updatedFarm.farmName);

        res.status(200).json({
            message: "Farm updated successfully",
            farm: updatedFarm
        });
    } catch (error) {
        console.error("Update farm error:", error.message);
        res.status(500).json({ message: "Failed to update farm" });
    }
});

// DELETE USER'S FARM
app.delete("/api/farms/:id", async (req, res) => {
    try {
        const { userId } = req.query;

        if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(400).json({ message: "Valid userId is required" });
        }

        const deletedFarm = await Farm.findOneAndDelete({
            _id: req.params.id,
            userId
        });

        if (!deletedFarm) {
            return res.status(404).json({ message: "Farm not found" });
        }

        res.status(200).json({ message: "Farm deleted successfully" });
    } catch (error) {
        console.error("Delete farm error:", error.message);
        res.status(500).json({ message: "Failed to delete farm" });
    }
});

// DEBUGGING DEMO ROUTE
app.get("/api/error", (req, res, next) => {
    try {
        throw new Error("Demo error for debugging");
    } catch (error) {
        next(error);
    }
});
// SAVE CONTACT MESSAGE TO MYSQL
app.post("/api/contact", (req, res) => {
    const { name, email, message } = req.body;

    if (!name || !email || !message) {
        return res.status(400).json({
            message: "All fields are required"
        });
    }

    const sql = `
        INSERT INTO contacts (name, email, message)
        VALUES (?, ?, ?)
    `;

    db.query(sql, [name, email, message], (err, result) => {
        if (err) {
            console.error("Contact error:", err.message);

            return res.status(500).json({
                message: "Failed to save message"
            });
        }

        res.status(201).json({
            message: "Message saved successfully"
        });
    });
});
// ADMIN LOGIN
app.post("/api/admin/login", (req, res) => {

    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({
            message: "Username and password are required"
        });
    }

    const sql = `
        SELECT * FROM admins
        WHERE username = ? AND password = ?
    `;

    db.query(sql, [username, password], (err, results) => {

        if (err) {
            console.error("Admin login error:", err.message);

            return res.status(500).json({
                message: "Database error"
            });
        }

        if (results.length === 0) {
            return res.status(401).json({
                message: "Invalid username or password"
            });
        }

        const admin = results[0];

        console.log("Admin logged in:", admin.username);

        res.status(200).json({
            message: "Admin login successful",
            admin: {
                id: admin.id,
                name: admin.name,
                username: admin.username,
                email: admin.email
            }
        });
    });
});
app.use((error, req, res, next) => {
    console.error("ERROR:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
});
app.listen(PORT, () => {
    console.log(`AgriAssist backend running at http://localhost:${PORT}`);
});
