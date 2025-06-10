// Importação dos módulos necessários
const express = require('express');
const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const cors = require('cors');
require('dotenv').config(); // Para carregar variáveis de ambiente de um ficheiro .env

// --- CONFIGURAÇÃO INICIAL ---

// 1. Configuração do Firebase Admin
// Descarregue o seu ficheiro de chave da conta de serviço no Firebase Console:
// Definições do projeto -> Contas de serviço -> Gerar nova chave privada
const serviceAccount = require('./path/to/serviceAccountKey.json'); // <-- ATUALIZE AQUI: Coloque o caminho para o seu ficheiro de chave

initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();

// 2. Configuração do Stripe
// Instale o Stripe: npm install stripe
// A sua chave secreta do Stripe deve estar num ficheiro .env para segurança
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

// 3. Configuração do Express
const app = express();
app.use(express.json()); // Middleware para interpretar JSON
app.use(cors()); // Permite pedidos de outros domínios (o seu frontend)

const PORT = process.env.PORT || 4242;

// --- ROTAS DA API ---

/**
 * Rota para criar uma sessão de checkout do Stripe.
 * O frontend irá chamar esta rota quando o utilizador clicar em "Fazer Upgrade".
 */
app.post('/create-checkout-session', async (req, res) => {
  const { userId, userEmail } = req.body;

  if (!userId) {
    return res.status(400).send({ error: 'O ID do utilizador é obrigatório.' });
  }

  try {
    // ID do Preço do seu produto de assinatura no Stripe
    // Crie um produto e um preço no seu Stripe Dashboard
    const priceId = 'price_...evt_1RYOZ9PnabtqgpvoKcMUpRX6'; // <-- ATUALIZE AQUI: Cole o ID do Preço do seu plano no Stripe

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'subscription', // Define o pagamento como uma assinatura
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      // Passa o ID do utilizador e o email para o Stripe.
      // Usaremos isto no webhook para saber quem fez o pagamento.
      client_reference_id: userId,
      customer_email: userEmail,
      success_url: `https://fpimentel35.github.io/lynkn.me/sucesso?session_id={CHECKOUT_SESSION_ID}`, // <-- ATUALIZE AQUI: URL de sucesso
      cancel_url: `https://fpimentel35.github.io/lynkn.me/cancelamento`, // <-- ATUALIZE AQUI: URL de cancelamento
    });

    res.json({ id: session.id });
  } catch (error) {
    console.error("Erro ao criar a sessão do Stripe:", error);
    res.status(500).send({ error: error.message });
  }
});

/**
 * Webhook para receber eventos do Stripe.
 * O Stripe envia uma notificação para esta rota quando um pagamento é bem-sucedido.
 */
app.post('/stripe-webhook', express.raw({type: 'application/json'}), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET; // <-- OBTENHA NO SEU STRIPE DASHBOARD

  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
  } catch (err) {
    console.log(`⚠️  Erro na verificação da assinatura do webhook:`, err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Lidar com o evento checkout.session.completed
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    
    // O client_reference_id é o ID do utilizador do Firebase que definimos anteriormente
    const userId = session.client_reference_id; 

    if (!userId) {
      console.error('ID do utilizador não encontrado na sessão do Stripe.');
      return res.status(400).send('ID do utilizador não encontrado.');
    }
    
    console.log(`Pagamento bem-sucedido para o utilizador: ${userId}`);

    try {
      // Atualiza o plano do utilizador no Firestore para "premium"
      const appId = '1:74692137411:web:da0a98fe48dc0c7341ed76'; // <-- ATUALIZE AQUI: Cole o App ID do seu projeto Firebase
      const userProfileRef = db.collection('artifacts').doc(appId).collection('users').doc(userId);
      await userProfileRef.update({
        plan: 'premium',
        stripeCustomerId: session.customer, // Opcional: guarde o ID de cliente do Stripe
      });
      console.log(`Plano do utilizador ${userId} atualizado para Premium.`);
    } catch (error) {
      console.error(`Falha ao atualizar o plano do utilizador ${userId}:`, error);
      return res.status(500).send('Erro interno do servidor.');
    }
  }

  // Devolve uma resposta 200 para o Stripe saber que recebemos o evento
  res.status(200).send();
});


// --- INICIAR O SERVIDOR ---
app.listen(PORT, () => console.log(`Servidor a correr na porta ${PORT}`));
