require('dotenv').config();
const { Telegraf, Markup, session } = require('telegraf');
const mongoose = require('mongoose');
const { handleStart, handleMainMenu } = require('./handlers/menuHandler');
const { handlePayment } = require('./handlers/paymentHandler');
const { handleKRAFlow } = require('./handlers/kraHandler');
const { handleAdmin } = require('./handlers/adminHandler');
const { isAdmin } = require('./utils/helpers');

const bot = new Telegraf(process.env.BOT_TOKEN);

// Connect MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ MongoDB connected'))
  .catch(err => console.error('❌ MongoDB error:', err));

// Session middleware
bot.use(session({
  defaultSession: () => ({
    step: null,
    kraPin: null,
    kraPassword: null,
    txCode: null,
    returnYear: null,
    returnType: null,
  })
}));

// /start command
bot.start(async (ctx) => {
  await handleStart(ctx);
});

// /admin command
bot.command('admin', async (ctx) => {
  if (!isAdmin(ctx.from.id)) {
    return ctx.reply('❌ Unauthorized.');
  }
  await handleAdmin(ctx, 'menu');
});

// Handle callback queries (button taps)
bot.on('callback_query', async (ctx) => {
  const data = ctx.callbackQuery.data;
  await ctx.answerCbQuery();

  // Admin callbacks
  if (data.startsWith('admin_')) {
    if (!isAdmin(ctx.from.id)) return ctx.reply('❌ Unauthorized.');
    return handleAdmin(ctx, data);
  }

  // Main menu
  if (data === 'main_menu') return handleMainMenu(ctx);

  // Payment flow
  if (data === 'start_filing') return handlePayment(ctx, 'initiate');
  if (data === 'verify_payment') return handlePayment(ctx, 'request_code');
  if (data === 'cancel') {
    ctx.session = { step: null };
    return ctx.reply('❌ Cancelled. Send /start to begin again.');
  }

  // KRA flow
  if (data === 'start_kra') return handleKRAFlow(ctx, 'ask_pin');
  if (data === 'file_nil') return handleKRAFlow(ctx, 'confirm_nil');
  if (data === 'confirm_nil_yes') return handleKRAFlow(ctx, 'submit_nil');
});

// Handle text messages (multi-step flow)
bot.on('text', async (ctx) => {
  const step = ctx.session?.step;
  const text = ctx.message.text.trim();

  if (step === 'awaiting_tx_code') return handlePayment(ctx, 'verify_code', text);
  if (step === 'awaiting_kra_pin') return handleKRAFlow(ctx, 'got_pin', text);
  if (step === 'awaiting_kra_password') return handleKRAFlow(ctx, 'got_password', text);

  // Default
  await handleMainMenu(ctx);
});

// Launch
bot.launch().then(() => {
  console.log('🤖 KRA Bot is running...');
});

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
