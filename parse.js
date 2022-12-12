const fetch = require('node-fetch');

const url = 'https://p2p.binance.com/bapi/c2c/v2/friendly/c2c/adv/search';
const banks = {
    'privat': 'PrivatBank',
    'abank': 'ABank', 
    'izi': 'izibank',
    'pumb': 'PUMBBank',
    'mono': 'Monobank',
    'sport': 'Sportbank',
}

const curlBinanceP2P = async (min = 0, max = 100000, bankArr = null) => {
    let response = await fetch(url, {
        hostname: 'p2p.binance.com',
        port: 443,
        path: '/bapi/c2c/v2/friendly/c2c/adv/search',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            "page": 1,
            "rows": 10,
            "payTypes": bankArr,
            "countries": [],
            "publisherType": null,
            "transAmount": null,
            "asset": "USDT",
            "fiat": "UAH",
            "tradeType": "SELL"
        })
    });
    let advObj = await response.json();

    let resArr = [];
    for (const adv of advObj.data) {
        if(!(adv.adv.minSingleTransAmount > max || adv.adv.dynamicMaxSingleTransAmount < min))
            resArr.push({
                "price": parseFloat(adv.adv.price),
                "min": adv.adv.minSingleTransAmount,
                "max": adv.adv.dynamicMaxSingleTransAmount,
                "name": adv.advertiser.nickName,
                "banks": adv.adv.tradeMethods.map(m => m.identifier),
            })
    }

    return resArr;
}

const getWhiteBitSpotRate = async () => {
    let response = await fetch('https://whitebit.com/api/v4/public/ticker');
    let jsonObj = await response.json();
    return parseFloat(jsonObj.USDT_UAH.last_price);
}
const getBinanceSpotRate = async () => {
    let response = await fetch('https://www.binance.com/api/v3/ticker/price');
    let jsonObj = await response.json();
    return parseFloat(jsonObj.find(v => v.symbol === 'USDTUAH').price);
}

const getArbitrageArr = (sellOptions, buyOptions) => {
    let array = [];
    for (const sell of sellOptions) {
        for (const buy of buyOptions) {
            const coeff = 1 - (buy.comissionFee + sell.comissionFee) / 100;
            const profitUAH = sell.price * coeff - buy.price;
            const profitPercent = profitUAH * 100 / buy.price;
            array.push({
                'sellOption': sell.title,
                'sellPrice': sell.price,
                'sellRange': `${Math.round(sell.min)} - ${Math.round(sell.max)} ₴`,
                'sellNickName': sell.name,
                'sellBanks': sell.banks,
                'buyOption': buy.title,
                'buyPrice': buy.price,
                'profitUAH': Math.round(profitUAH * 100) / 100,
                'profitPercent': Math.round(profitPercent * 100) / 100
            });
        }
    }
    return array;
}

const update = async () => {

    let privatP2P = (await curlBinanceP2P(20000, 40000, [banks.privat]))[0];
    let otherP2P = (await curlBinanceP2P(20000, 40000, [banks.abank, banks.izi, banks.mono, banks.pumb, banks.sport]))[0];

    const sellOptions = [
        {'title': 'Binance P2P', 'comissionFee': 0.5, ...privatP2P},
        {'title': 'Binance P2P', 'comissionFee': 0.0, ...otherP2P}
    ]

    const buyOptions = [
        {'title': 'WhiteBit Spot', 'comissionFee': 0.1, 'price': await getWhiteBitSpotRate()},
        {'title':  'Binance Spot', 'comissionFee': 0.5, 'price': await getBinanceSpotRate()}
    ]

    return getArbitrageArr(sellOptions, buyOptions).sort((a, b) => b.profitPercent - a.profitPercent);
}

module.exports = {
    update: update,
    getWhiteBitSpotRate: getWhiteBitSpotRate,
    getBinanceSpotRate: getBinanceSpotRate,
    curlBinanceP2P: curlBinanceP2P
}