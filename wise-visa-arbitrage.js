class Currency{
    static globalCounter = 0;
    constructor(countryCode, currencySymbol){
        this.countryCode = countryCode;
        this.currencySymbol = currencySymbol;
        this.id = Currency.globalCounter++;
        this.euroAmount = undefined;
        this.currencyAmount = undefined;
        this.currencyRate = undefined;
    }
}

const transferFN = 'transferGoRates.json';
const wiseFN = 'wiseRates.json';
const visaFN = 'visaRates.json'
const euroAmount = 500;

const delay = (ms = 1000) => new Promise(r => setTimeout(r, ms));

const getTransferGoRates = async () => {
    let currencyList = [];

    // Initializing currencyList with available countries
    const urlCountries = 'https://my.transfergo.com/api/classifiers/all';
    const response = await fetch(urlCountries);
    const data = await response.json();
    data.corridors.destinations.forEach(country => {
        country.currencies.forEach(currency => {
            if(currency != 'EUR' && currency != 'NGN')
            currencyList.push(new Currency(country.countryCode, currency))
        });
    });
    

    // Getting Rates
    for (const cur of currencyList) {
        cur.euroAmount = euroAmount;
        let urlCurrency = `https://my.transfergo.com/api/transfers/quote?&calculationBase=sendAmount&amount=${cur.euroAmount}&fromCountryCode=LT&toCountryCode=${cur.countryCode}&fromCurrencyCode=EUR&toCurrencyCode=${cur.currencySymbol}`;
        await delay(800);
        const response = await fetch(urlCurrency);
        const data = await response.json();
        cur.currencyAmount = data?.deliveryOptions?.standard?.paymentOptions?.card?.quote?.receivingAmount; 
        cur.currencyRate = data?.deliveryOptions?.standard?.paymentOptions?.card?.quote?.rate;
        console.log(cur);
    }

    return currencyList;
}

const WiseRates = async (currencyList) => {
    for (const cur of currencyList) {
        let urlWise = `https://wise.com/us/currency-converter/${cur.currencySymbol}-to-EUR-rate?amount=${cur.currencyAmount}`;
        let response = await fetch(urlWise);
        let data = await response.blob();
        let html = await data.text();
        let value;
        try{
            value = parseFloat((/Converted to<\/label><div>(.*?)<!-- --> <!-- -->eur/igm).exec(html)[1]); 
        } catch{}
        cur.wiseEuro = value;
        console.log(cur);
        await delay(800);
    }

    return currencyList.sort((a, b) => b?.wiseEuro - a?.wiseEuro);
}

const VisaRates = async (currencyList) => {
    for (const cur of currencyList) {
        const date = new Date();
        let urlVisa = `https://www.visa.com.ua/ru_UA/support/consumer/travel-support/exchange-rate-calculator.html?amount=${cur.currencyAmount}&fee=0.0&utcConvertedDate=&exchangedate=${date.getUTCMonth()}%2F${date.getUTCDay()}%2F${date.getUTCFullYear()}&fromCurr=EUR&toCurr=${cur.currencySymbol}&submitButton=`;
        let response = await fetch(urlVisa);
        let data = await response.blob();
        let html = await data.text();
        let value;
        try{
            value = Math.round(parseFloat((/<strong class="converted-amount-value">(.*?) Euro<\/strong>/igm).exec(html)[1].replace(',','')) * 100) / 100; 
        } catch{}
        cur.visaEuro = value;
        console.log(cur);
    }

    return currencyList.sort((a, b) => b?.visaEuro - a?.visaEuro);
}

const Arbitrage = async () => {
    let transferRates = await getTransferGoRates();
    let wiseRates = await wiseRates(transferRates);
    let visaRates = await visaRates(wiseRates);
    let filteredData = visaRates.filter(v => v.wiseEuro > v.euroAmount || v.visaEuro > v.euroAmount);
    filteredData.sort((a, b) => Math.max(b.visaEuro, b.wiseEuro) - Math.max(a.visaEuro, a.wiseEuro));
    return filteredData;
}

module.exports = { Arbitrage }