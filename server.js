// server.js
require('dotenv').config(); // Load environment variables from .env file
const express = require('express');
const axios = require('axios');
const app = express();

// Middleware to parse JSON bodies
app.use(express.json());

// Safaricom M-Pesa credentials and configuration from environment variables
const consumerKey = process.env.CONSUMER_KEY;
const consumerSecret = process.env.CONSUMER_SECRET;
const shortCode = process.env.SHORT_CODE; // e.g., 3224910
const passKey = process.env.PASS_KEY;
const baseURL = process.env.BASE_URL || 'https://sandbox.safaricom.co.ke';

// Donation endpoint: expects { amount, phone } in the POST body
app.post('/donate', async (req, res) => {
  const { amount, phone } = req.body;
  if (!amount || !phone) {
    return res.status(400).json({ error: 'Amount and phone number are required.' });
  }

  try {
    // Generate access token
    const auth = Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64');
    const tokenResponse = await axios.get(`${baseURL}/oauth/v1/generate?grant_type=client_credentials`, {
      headers: { Authorization: `Basic ${auth}` }
    });
    const accessToken = tokenResponse.data.access_token;

    // Generate timestamp (format: YYYYMMDDHHMMSS) and password
    const timestamp = new Date().toISOString().replace(/[-:TZ.]/g, '').slice(0, 14);
    const password = Buffer.from(`${shortCode}${passKey}${timestamp}`).toString('base64');

    // Prepare the STK push request payload
    const payload = {
      BusinessShortCode: shortCode,
      Password: password,
      Timestamp: timestamp,
      TransactionType: "CustomerPayBillOnline",
      Amount: amount,
      PartyA: phone, // Donor's phone number in the format 2547XXXXXXXX
      PartyB: shortCode,
      PhoneNumber: phone,
      CallBackURL: process.env.CALLBACK_URL, // URL to receive payment notifications
      AccountReference: "Donation",
      TransactionDesc: "Donation to Mani Group Foundation"
    };

    // Send STK push request to Safaricom
    const stkResponse = await axios.post(`${baseURL}/mpesa/stkpush/v1/processrequest`, payload, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });

    res.json(stkResponse.data);
  } catch (error) {
    console.error(error.response ? error.response.data : error);
    res.status(500).json({ error: 'Error processing donation.' });
  }
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
