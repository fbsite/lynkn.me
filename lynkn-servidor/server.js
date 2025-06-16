const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(express.json());
app.use(cors());

const PORT = process.env.PORT || 4242;

const paymentLinks = {
    monthly: process.env.STRIPE_PAYMENT_LINK_ID_MONTHLY,
    annual: process.env.STRIPE_PAYMENT_LINK_ID_ANNUAL
};

app.post('/create-checkout-link', (req, res) => {
    const { planType } = req.body;
    const linkId = paymentLinks[planType];

    if (!linkId) {
        return res.status(400).send({ error: 'Tipo de plano inválido.' });
    }

    // Simplesmente devolve o URL do link de pagamento do Stripe
    // O URL completo é: https://buy.stripe.com/ + ID
    res.json({ url: `https://buy.stripe.com/${linkId}` });
});

app.listen(PORT, () => console.log(`Servidor a correr na porta ${PORT}`));
