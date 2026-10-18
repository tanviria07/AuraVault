const express = require('express');
const cors = require('cors');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

app.post('/api/visa/authorize', (req, res) => {
  const { cartTotal } = req.body ?? {};

  if (typeof cartTotal !== 'number' || cartTotal <= 0) {
    return res.status(400).json({ status: 'declined', reason: 'invalid cartTotal' });
  }

  res.json({ status: 'authorized', transactionId: 'visa_tx_12345' });
});

app.listen(PORT, () => {
  console.log(`AuraVault Visa server listening on http://localhost:${PORT}`);
});
