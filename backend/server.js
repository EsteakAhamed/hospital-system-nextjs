const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
require("dotenv").config();
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");

const app = express();
const port = process.env.PORT || 4000;

// Middleware
app.use(cors());
app.use(helmet());
app.use(express.json());

// MongoDB Connection URI
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.rwdp740.mongodb.net/?appName=Cluster0`;
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    },
});

let usersCollection;
let doctorsCollection;

async function run() {
    try {
        usersCollection = client.db("hospitalDB").collection("users");
        doctorsCollection = client.db("hospitalDB").collection("doctors");
        console.log("Connected to MongoDB");

        // Root route
        app.get("/", (req, res) => {
            res.send("Hospital Management System Backend is running");
        });

        // Health check endpoint
        app.get("/health", (req, res) => {
            res.json({ success: true, message: "Backend is running" });
        });

        // Register User
        app.post("/api/auth/register", async (req, res) => {
            try {
                const { name, email, password } = req.body;

                if (!name || !email || !password) {
                    return res.status(400).json({ success: false, message: "Name, email, and password required" });
                }

                const existingUser = await usersCollection.findOne({ email });
                if (existingUser) {
                    return res.status(409).json({ success: false, message: "User already exists" });
                }

                const user = {
                    name,
                    email,
                    password,
                    role: "admin",
                    createdAt: new Date()
                };

                const result = await usersCollection.insertOne(user);

                res.status(201).json({
                    success: true,
                    message: "User registered successfully",
                    data: { id: result.insertedId, name, email, role: "admin" },
                    token: "token-" + result.insertedId
                });
            } catch (error) {
                res.status(500).json({ success: false, message: "Server error", error: error.message });
            }
        });

        // Login User
        app.post("/api/auth/login", async (req, res) => {
            try {
                const { email, password } = req.body;

                if (!email || !password) {
                    return res.status(400).json({ success: false, message: "Email and password required" });
                }

                const user = await usersCollection.findOne({ email });
                if (!user || user.password !== password) {
                    return res.status(401).json({ success: false, message: "Invalid email or password" });
                }

                res.json({
                    success: true,
                    message: "Login successful",
                    data: { id: user._id, name: user.name, email: user.email, role: user.role },
                    token: "token-" + user._id
                });
            } catch (error) {
                res.status(500).json({ success: false, message: "Server error", error: error.message });
            }
        });

        // Get all doctors
        app.get("/api/doctors", async (req, res) => {
            try {
                const doctors = await doctorsCollection.find().toArray();
                res.json({ success: true, data: doctors });
            } catch (error) {
                res.status(500).json({ success: false, message: "Server error", error: error.message });
            }
        });

        // Get latest 6 doctors
        app.get("/api/doctors/latest", async (req, res) => {
            try {
                const doctors = await doctorsCollection
                    .find()
                    .sort({ createdAt: -1 })
                    .limit(6)
                    .toArray();
                res.json({ success: true, data: doctors });
            } catch (error) {
                res.status(500).json({ success: false, message: "Server error", error: error.message });
            }
        });

        // Get doctor by ID
        app.get("/api/doctors/:id", async (req, res) => {
            try {
                const id = req.params.id;
                const doctor = await doctorsCollection.findOne({ _id: new ObjectId(id) });

                if (!doctor) {
                    return res.status(404).json({ success: false, message: "Doctor not found" });
                }

                res.json({ success: true, data: doctor });
            } catch (error) {
                res.status(500).json({ success: false, message: "Server error", error: error.message });
            }
        });

        // Create new doctor
        app.post("/api/doctors", async (req, res) => {
            try {
                const { name, specialty, email, phone, experience, bio, imageUrl } = req.body;

                if (!name || !specialty || !email || !phone || experience === undefined || !bio) {
                    return res.status(400).json({ success: false, message: "All fields required" });
                }

                const existingDoctor = await doctorsCollection.findOne({ email });
                if (existingDoctor) {
                    return res.status(409).json({ success: false, message: "Doctor with this email already exists" });
                }

                const doctor = {
                    name,
                    specialty,
                    email,
                    phone,
                    experience: parseInt(experience),
                    bio,
                    imageUrl: imageUrl || null,
                    createdAt: new Date(),
                    updatedAt: new Date()
                };

                const result = await doctorsCollection.insertOne(doctor);

                res.status(201).json({
                    success: true,
                    message: "Doctor added successfully",
                    data: { _id: result.insertedId, ...doctor }
                });
            } catch (error) {
                res.status(500).json({ success: false, message: "Server error", error: error.message });
            }
        });

        // Update doctor by ID
        app.put("/api/doctors/:id", async (req, res) => {
            try {
                const id = req.params.id;
                const updateData = req.body;
                updateData.updatedAt = new Date();

                const result = await doctorsCollection.updateOne(
                    { _id: new ObjectId(id) },
                    { $set: updateData }
                );

                if (result.matchedCount === 0) {
                    return res.status(404).json({ success: false, message: "Doctor not found" });
                }

                res.json({ success: true, message: "Doctor updated successfully" });
            } catch (error) {
                res.status(500).json({ success: false, message: "Server error", error: error.message });
            }
        });

        // Delete doctor by ID
        app.delete("/api/doctors/:id", async (req, res) => {
            try {
                const id = req.params.id;
                const result = await doctorsCollection.deleteOne({ _id: new ObjectId(id) });

                if (result.deletedCount === 0) {
                    return res.status(404).json({ success: false, message: "Doctor not found" });
                }

                res.json({ success: true, message: "Doctor deleted successfully" });
            } catch (error) {
                res.status(500).json({ success: false, message: "Server error", error: error.message });
            }
        });

        // Get doctors by specialty
        app.get("/api/doctors/specialty/:specialty", async (req, res) => {
            try {
                const specialty = req.params.specialty;
                const doctors = await doctorsCollection.find({ specialty }).toArray();
                res.json({ success: true, data: doctors });
            } catch (error) {
                res.status(500).json({ success: false, message: "Server error", error: error.message });
            }
        });

    } finally {
        // Cleanup if needed
    }
}

run().catch(console.dir);

// Start server
app.listen(port, () => {
    console.log("Server started on port " + port);
    console.log("Database: hospitalDB");
    console.log("Health check: GET /health");
});
