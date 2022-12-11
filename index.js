const TelegramApi = require('node-telegram-bot-api')
const Parse = require('./parse')


const token = '5975262233:AAEUfVIcGTN2ybc_mctN_o_ZZpJuRIMmbpU';
const bot = new TelegramApi(token, {polling: true});
let notifyArr = [];
let lastArbObj;
let percent = 0.5;

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
            let string = await buildResultString(res);
            return bot.sendMessage(chatId, string);
        }
    }));
}

const addNotify = (chatId) =>{
    const checkFrequency = 10000;
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
    const res = await Parse.update();
    let string = await buildResultString(res);
    if(JSON.stringify(lastArbObj) === JSON.stringify(res[0]))
        return;
    if(res[0].profitPercent < percent){
        return;
    }
    lastArbObj = res[0];
    await bot.sendMessage(chatId, string);
}

async function buildResultString(res) {
    let string = '';
    for (const opt of res) {
        string += `${opt.title}\n`;
        string += `Sell price: ${opt.sellPrice}\n`;
        string += `Range: ${opt.range}\n`;
        string += `Nickname: ${opt.name}\n`;
        string += `Buy price: ${opt.buyPrice}\n`;
        string += `Banks: ${opt.banks.join(', ')}\n`;
        string += `Profit UAH: ${opt.profitUAH} (${opt.profitPercent} %)\n\n`;
    }
    return string;
}

start();
