const TelegramApi = require('node-telegram-bot-api')
const Parse = require('./parse')
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

const token = '5975262233:AAEUfVIcGTN2ybc_mctN_o_ZZpJuRIMmbpU';
const bot = new TelegramApi(token, {polling: true});
let notifyArr = [];

function start() {
    bot.setMyCommands([
        {command: '/start', description: 'First greeting'},
        {command: '/get', description: 'Get Arbitrage now'},
        {command: '/subscribe', description: 'Subscribe to notifications'},
        {command: '/unsubscribe', description: 'Unsubscribe from notifications'}
    ])
    bot.on('message', (async (msg) => {
        const text = msg.text;
        const chatId = msg.chat.id;
        if(text === '/start'){
            return bot.sendMessage(chatId, 'Hallo! I will notify you whenever I see arbitrage situations.')
        }
        if(text === '/subscribe'){
            addNotify(chatId);
            return bot.sendMessage(chatId, 'You successfully subscribed!');
        }
        if(text === '/unsubscribe'){
            removeNotify(chatId);
            return bot.sendMessage(chatId, 'You successfully unsubscribed!');
        }
        if(text === '/get')
        {
            const res = await Parse.update();
            let string = '';
            for (const opt of res) {
                string += `${opt.title}\n`;
                string += `Sell price: ${opt.sellPrice}\n`;
                string += `Range: ${opt.range}\n`
                string += `Nickname: ${opt.name}\n`
                string += `Buy price: ${opt.buyPrice}\n`
                string += `Banks: ${opt.banks.join(', ')}\n`
                string += `Profit UAH: ${opt.profitUAH} (${opt.profitPercent} %)\n\n`;
            }
            return bot.sendMessage(chatId, string);
        }
    }));
}

const addNotify = (chatId) =>{
    const checkFrequency = 1000;
    if(!notifyArr.find(n => n.chatId === chatId)){
        notifyArr.push({'chatId': chatId, 'interval': setInterval(notificationFunc, checkFrequency, chatId)});
    }
}
const removeNotify = (chatId) => {
    for (const n of notifyArr) {
        if(n.chatId === chatId)
            clearInterval(n.interval);
    }
    notifyArr = notifyArr.filter(n => n.chatId != chatId);
}

const notificationFunc = async (chatId) => {
    await bot.sendMessage(chatId, 'alert');
}

start();