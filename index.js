const TelegramApi = require('node-telegram-bot-api')
const Parse = require('./parse')


const token = '5975262233:AAEUfVIcGTN2ybc_mctN_o_ZZpJuRIMmbpU';
const bot = new TelegramApi(token, {polling: true});
let notifyArr = [];
let lastArbObj;
let percent = 0.5;

function start() {
    bot.setMyCommands([
        {command: '/get', description: 'Get Arbitrage now'},
        {command: '/subscribe', description: 'Subscribe to notifications'},
        {command: '/unsubscribe', description: 'Unsubscribe from notifications'},
        {command: '/rates', description: 'Get current exchange rates'},
        {command: '/p2p', description: 'Get first 10 orders on Binance P2P'}
    ])
    bot.on('message', (async (msg) => {
        const text = msg.text;
        const chatId = msg.chat.id;
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
            let string = buildResultString(res);
            return bot.sendMessage(chatId, string, options={parse_mode: 'html'});
        }
        if(text === '/rates'){
            const wbRate = await Parse.getWhiteBitSpotRate();
            const binanceRate = await Parse.getBinanceSpotRate();
            let msg = `Whitebit:\t<code> ${wbRate}</code>\nBinance:\t<code> ${binanceRate} (${Math.round(binanceRate * 1.005 * 100) / 100})</code>`;
            return bot.sendMessage(chatId, msg, options={parse_mode: 'html'});
        }
        if(text == '/p2p'){
            let adverts = await Parse.curlBinanceP2P();
            let msg = '';
            for (const ad of adverts) {
                msg += `Price:   <code> ${ad.price}</code>\n`;
                msg += `Range: <code> ${ad.min} - ${ad.max} ₴</code>\n`;
                msg += `Name:  <code> ${ad.name}</code>\n`;
                msg += `Banks:  <code> ${ad.banks.join(', ')}</code>\n\n`;
            }
            return bot.sendMessage(chatId, msg, options = {parse_mode: 'html'});
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
    if(JSON.stringify(lastArbObj) === JSON.stringify(res[0]))
        return;
    if(res[0].profitPercent < percent)
        return;

    lastArbObj = res[0];
    await bot.sendMessage(chatId, buildResultString(res), options={parse_mode: 'html'});
}

const buildResultString = (res) => {
    let string = '';
    for (let i = 0; i < 2; i++) {
        const opt = res[i];
        string += `Sell:       <code>${opt.sellBanks.join(', ')} -- ${opt.sellPrice}</code>\n`;
        string += `Range:  <code>${opt.sellRange}</code>\n`;
        string += `Name:   <code>${opt.sellNickName}</code>\n`;
        string += `Buy:       <code>${opt.buyOption} -- <i>${opt.buyPrice}</i></code>\n`;
        string += `<b>Profit:    ${opt.profitUAH} ₴  (${opt.profitPercent} %)</b>\n\n`;        
    }
    return string;
}

start();