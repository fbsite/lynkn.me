// ...

app.post('/create-checkout-session', async (req, res) => {
  const { userId, userEmail, planType } = req.body; // A variável 'planType' é nova

  if (!userId || !planType) {
    return res.status(400).send({ error: 'ID do utilizador e tipo de plano são obrigatórios.' });
  }

  // IDs dos seus preços no Stripe
  const prices = {
    monthly: 'price_1RYOZ9Pnabtqgpvo8qAN4KFw', // <-- ATUALIZE AQUI
    annual:  'price_1RaQblPnabtqgpvoxuC9iEAu'   // <-- ATUALIZE AQUI
  };

  const priceId = prices[planType];

  if (!priceId) {
    return res.status(400).send({ error: 'Tipo de plano inválido.' });
  }
  
  // ... (o restante da sua lógica do Stripe continua igual)
  
  try {
    const session = await stripe.checkout.sessions.create({
        // ...
        line_items: [{ price: priceId, quantity: 1 }],
        // ...
    });
    res.json({ id: session.id });
  } catch (error) {
    // ...
  }
});

// ...
