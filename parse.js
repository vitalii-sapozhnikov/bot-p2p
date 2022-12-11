const fs = require('fs');

const url = 'https://p2p.binance.com/bapi/c2c/v2/friendly/c2c/adv/search';
const banks = {
    'privat': 'PrivatBank',
    'abank': 'ABank', 
    'izi': 'izibank',
    'pumb': 'PUMBBank',
    'mono': 'Monobank',
    'sport': 'Sportbank',
}

const curlBinanceP2P = async (min, bankArr) => {
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

    // dynamicMaxSingleTransAmount - max
    // minSingleTransAmount - min
    for (const adv of advObj.data) {
        if(adv.adv.minSingleTransAmount <= min && adv.adv.dynamicMaxSingleTransAmount > min)
            return {
                "price": parseFloat(adv.adv.price),
                "min": adv.adv.minSingleTransAmount,
                "max": adv.adv.dynamicMaxSingleTransAmount,
                "name": adv.advertiser.nickName,
                "banks": adv.adv.tradeMethods.map(m => m.tradeMethodName) 
            }
    }
}

const update = async () => {
    // Curling binance p2p for privat24
    let privatP2P = await curlBinanceP2P(20000, [banks.privat]);

    // Curling binance p2p for other banks
    let otherP2P = await curlBinanceP2P(20000, [banks.abank, banks.izi, banks.mono, banks.pumb, banks.sport]);

    // Curling WhiteBit USDT price spot
    let response = await fetch('https://whitebit.com/api/v4/public/ticker');
    let jsonObj = await response.json();
    let priceUSDTwhiteBit = parseFloat(jsonObj.USDT_UAH.last_price);

    // Curling Binance USDT price spot
    response = await fetch('https://www.binance.com/api/v3/ticker/price');
    jsonObj = await response.json();
    let priceUSDTbinance = parseFloat(jsonObj.find(v => v.symbol === 'USDTUAH').price);

    let res = [
        {
            "title": "SELL Privat24 -> BUY Binance Spot",
            "sellPrice": privatP2P.price,
            "range": `${privatP2P.min} - ${privatP2P.max}`,
            "name": privatP2P.name,
            "buyPrice": priceUSDTbinance,
            "banks": privatP2P.banks,
            "profitUAH": Math.round((privatP2P.price * 0.991 - priceUSDTbinance) * 100) / 100,
            "profitPercent": Math.round(((privatP2P.price * 0.991 - priceUSDTbinance) * 100 / privatP2P.price) * 100) / 100,
        },
        {
            "title": "SELL Privat24 -> BUY WhiteBit Spot",
            "sellPrice": privatP2P.price,
            "range": `${privatP2P.min} - ${privatP2P.max}`,
            "name": privatP2P.name,
            "buyPrice": priceUSDTwhiteBit,
            "banks": privatP2P.banks,
            "profitUAH": Math.round((privatP2P.price * 0.995 - priceUSDTwhiteBit) * 100) / 100,
            "profitPercent": Math.round(((privatP2P.price * 0.995 - priceUSDTwhiteBit) * 100 / privatP2P.price) * 100) / 100,
        },
        {
            "title": "SELL OtherBanks -> BUY Binance Spot",
            "sellPrice": otherP2P.price,
            "range": `${otherP2P.min} - ${otherP2P.max}`,
            "name": otherP2P.name,
            "buyPrice": priceUSDTbinance,
            "banks": otherP2P.banks,
            "profitUAH": Math.round((otherP2P.price * 0.996 - priceUSDTbinance) * 100) / 100,
            "profitPercent": Math.round(((otherP2P.price * 0.996 - priceUSDTbinance) * 100 / otherP2P.price) * 100) / 100,
        },
        {
            "title": "SELL OtherBanks -> BUY WhiteBit",
            "sellPrice": otherP2P.price,
            "range": `${otherP2P.min} - ${otherP2P.max}`,
            "name": otherP2P.name,
            "buyPrice": priceUSDTwhiteBit,
            "banks": otherP2P.banks,
            "profitUAH": Math.round((otherP2P.price - priceUSDTwhiteBit) * 100) / 100,
            "profitPercent": Math.round(((otherP2P.price - priceUSDTwhiteBit) * 100 / otherP2P.price) * 100) / 100,
        },
    ];
    res.sort((a, b) => b.profitPercent - a.profitPercent);
    return res;
}

module.exports = {
    update: update
}