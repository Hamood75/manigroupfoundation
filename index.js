require("dotenv").config();
const express = require("express");
const axios = require("axios");

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

// Mpesa Credentials
const consumerKey = process.env.CONSUMER_KEY;
const consumerSecret = process.env.CONSUMER_SECRET;
const shortCode = process.env.SHORT_CODE;
const passKey = process.env.PASS_KEY;
const callbackUrl = process.env.CALLBACK_URL;
const baseUrl = process.env.BASE_URL || "https://sandbox.safaricom.co.ke";

// Generate Mpesa Access Token
const getAccessToken = async () => {
  const auth = Buffer.from(`${consumerKey}:${consumerSecret}`).toString("base64");

  try {
    const response = await axios.get(`${baseUrl}/oauth/v1/generate?grant_type=client_credentials`, {
      headers: { Authorization: `Basic ${auth}` },
    });

    return response.data.access_token;
  } catch (error) {
    console.error("Error fetching access token:", error.response ? error.response.data : error.message);
    return null;
  }
};

// STK Push (M-Pesa Express)
app.post("/stkpush", async (req, res) => {
  const { phone, amount } = req.body;

  if (!phone || !amount) {
    return res.status(400).json({ message: "Phone number and amount are required" });
  }

  const accessToken = await getAccessToken();
  if (!accessToken) return res.status(500).json({ message: "Failed to get access token" });

  const timestamp = new Date().toISOString().replace(/[-T:Z.]/g, "");
  const password = Buffer.from(`${shortCode}${passKey}${timestamp}`).toString("base64");

  const stkPushData = {
    BusinessShortCode: shortCode,
    Password: password,
    Timestamp: timestamp,
    TransactionType: "CustomerPayBillOnline",
    Amount: amount,
    PartyA: phone,
    PartyB: shortCode,
    PhoneNumber: phone,
    CallBackURL: callbackUrl,
    AccountReference: "Donation",
    TransactionDesc: "Charity Donation",
  };

  try {
    const response = await axios.post(`${baseUrl}/mpesa/stkpush/v1/processrequest`, stkPushData, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    });

    return res.json(response.data);
  } catch (error) {
    console.error("STK Push Error:", error.response ? error.response.data : error.message);
    return res.status(500).json({ message: "STK Push request failed" });
  }
});

// Home Route
app.get("/", (req, res) => {
  res.send("M-Pesa STK Push API is running...");
});

// Start Server
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
