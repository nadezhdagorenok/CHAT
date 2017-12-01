const rp = require('request-promise');
const log4js = require('log4js');
log4js.configure({                                                  // log the cheese logger messages to a file, and the console ones as well.
    appenders: {
        cheeseLogs: { type: 'file', filename: 'cheese.log' },
        console: { type: 'console' }
    },
    categories: {
        cheese: { appenders: ['cheeseLogs'], level: 'error' },
        another: { appenders: ['console'], level: 'trace' },
        default: { appenders: ['console', 'cheeseLogs'], level: 'trace' }
    }
});
const logger = log4js.getLogger('cheese');
const anotherLogger = log4js.getLogger('another');

function compareMessageWithBot(msg) {

    let messageArray = msg.split(' ');

    if (msg in collectionNews) {
        return createBotMessage(collectionNews[msg], 'journalist', collectionNews);
    }
    else if (msg in collectionProperty){
        return createBotMessage(collectionProperty[msg], 'agent', collectionProperty);
    }
    else if (messageArray.length === 4 && messageArray[1] in collectionMoney && messageArray[messageArray.length-1] in collectionMoney) {
        let currencyValue = messageArray[0];
        let currencyInitial = messageArray[1];
        let currencyDestination = messageArray[messageArray.length-1];
        let currencyRateMessage;
        let currencyInitialValueToByn;
        let bynToCurrencyDestination;

        return rp('http://www.nbrb.by/API/ExRates/Rates/' + collectionMoney[currencyInitial])
            .then(currencyInitialBankData => {
                anotherLogger.debug(JSON.parse(currencyInitialBankData));
                return currencyInitialBankData;
            })
            .then (currencyInitialBankInfo =>{
                if (collectionMoney[currencyInitial] === 298 || collectionMoney[currencyInitial] === 290) {
                    currencyInitialValueToByn = ((Number(JSON.parse(currencyInitialBankInfo)['Cur_OfficialRate']) / 100) * currencyValue).toFixed(2);
                    anotherLogger.debug(currencyInitialValueToByn);

                    return getCurrencyRate(currencyDestination, currencyInitialValueToByn, currencyValue, currencyInitialBankInfo);
                    // return rp('http://www.nbrb.by/API/ExRates/Rates/' + collectionMoney[currencyDestination])
                    //     .then(currencyDestinationBankData => {
                    //         anotherLogger.debug(JSON.parse(currencyDestinationBankData));
                    //         bynToCurrencyDestination = (currencyInitialValueToByn / (Number(JSON.parse(currencyDestinationBankData)['Cur_OfficialRate']))).toFixed(2);
                    //         anotherLogger.debug(bynToCurrencyDestination);
                    //         currencyRateMessage = `${currencyValue}  ${JSON.parse(currencyInitialBankInfo)['Cur_Abbreviation']}  =  ${bynToCurrencyDestination} ${JSON.parse(currencyDestinationBankData)['Cur_Abbreviation']} `;
                    //         anotherLogger.debug(currencyRateMessage);
                    //         return currencyRateMessage;
                    //
                    //     })
                }
                else if (collectionMoney[currencyInitial] === 293) {

                    currencyInitialValueToByn = ((Number(JSON.parse(currencyInitialBankInfo)['Cur_OfficialRate']) / 10) * currencyValue).toFixed(2);
                    return getCurrencyRate(currencyDestination, currencyInitialValueToByn, currencyValue, currencyInitialBankInfo);
                    // return rp('http://www.nbrb.by/API/ExRates/Rates/' + collectionMoney[currencyDestination])
                    //     .then(currencyDestinationBankData => {
                    //         anotherLogger.debug(JSON.parse(currencyDestinationBankData));
                    //         bynToCurrencyDestination = (currencyInitialValueToByn / (Number(JSON.parse(currencyDestinationBankData)['Cur_OfficialRate']))).toFixed(2);
                    //         currencyRateMessage = `${currencyValue}  ${JSON.parse(currencyInitialBankInfo)['Cur_Abbreviation']}  =  ${bynToCurrencyDestination} ${JSON.parse(currencyDestinationBankData)['Cur_Abbreviation']} `;
                    //         return currencyRateMessage;
                    //
                    //     });
                }
                else {
                    currencyInitialValueToByn = (Number(JSON.parse(currencyInitialBankInfo)['Cur_OfficialRate']) * currencyValue).toFixed(2);
                    return getCurrencyRate(currencyDestination, currencyInitialValueToByn, currencyValue, currencyInitialBankInfo);
                    // return rp('http://www.nbrb.by/API/ExRates/Rates/' + collectionMoney[currencyDestination])
                    //     .then(currencyDestinationBankData => {
                    //         anotherLogger.debug(JSON.parse(currencyDestinationBankData));
                    //         bynToCurrencyDestination = (currencyInitialValueToByn / (Number(JSON.parse(currencyDestinationBankData)['Cur_OfficialRate']))).toFixed(2);
                    //         currencyRateMessage = `${currencyValue}  ${JSON.parse(currencyInitialBankInfo)['Cur_Abbreviation']}  =  ${bynToCurrencyDestination} ${JSON.parse(currencyDestinationBankData)['Cur_Abbreviation']} `;
                    //         return currencyRateMessage;
                    //
                    //     });
                }


            })
            .then ((currencyRateMessageBank) => {
                return createBotMessage(currencyRateMessageBank, 'bank', collectionMoney);
            })
            .catch(handleError => {
                logger.error(handleError);
            });
    }
    else if (messageArray.length === 2 && messageArray[1] in collectionMoney){
        let currencyRateMessage;
        let currencyInitial = messageArray[1];
        let currencyInitialValueToByn;
        let currencyValue = messageArray[0];
        return rp('http://www.nbrb.by/API/ExRates/Rates/' + collectionMoney[currencyInitial])
            .then(currencyInitialBankData => {
                anotherLogger.debug(JSON.parse(currencyInitialBankData));
                if (collectionMoney[currencyInitial] === 298 || collectionMoney[currencyInitial] === 295) {
                    currencyInitialValueToByn = ((Number(JSON.parse(currencyInitialBankData)['Cur_OfficialRate']) / 100) * currencyValue).toFixed(2);
                    currencyRateMessage = `${currencyValue}  ${JSON.parse(currencyInitialBankData)['Cur_Abbreviation']}  =  ${currencyInitialValueToByn} BYN `;

                }
                else {
                    currencyInitialValueToByn = (Number(JSON.parse(currencyInitialBankData)['Cur_OfficialRate']) * currencyValue).toFixed(2);
                    currencyRateMessage = `${currencyValue}  ${JSON.parse(currencyInitialBankData)['Cur_Abbreviation']}  =  ${currencyInitialValueToByn} BYN `;
                }
                return currencyRateMessage;
            })
            .then((currencyRateMessageBank) => {
                return createBotMessage(currencyRateMessageBank, 'bank', collectionMoney);
            })

    }
    else {
        for (let i = 0; i < messageArray.length; i++) {
            if (messageArray[i] in collectionHello) {
                return createBotMessage(collectionHello[messageArray[i]], 'bot', collectionHello);
            }
            else if (messageArray[i] in collectionPhysics) {
                return createBotMessage(collectionPhysics[messageArray[i]], 'physicist', collectionPhysics);
            }
        }
    }

};

function createBotMessage(mes, botName, collection){
    anotherLogger.debug(mes);
    let msgBot = {};
    msgBot.date = new Date;
    msgBot.time = (new Date()).toLocaleTimeString();
    msgBot.shortDate = (new Date()).toDateString();
    msgBot.msg = mes;
    msgBot.username = botName;
    msgBot.type = collection["type"];
    anotherLogger.debug(msgBot.username);
    return msgBot;
}

function getCurrencyRate(currencyEnd, firstCurencyExchange, currencyValue, currencyInitialBankInfo) {

   return rp('http://www.nbrb.by/API/ExRates/Rates/' + collectionMoney[currencyEnd])
        .then(currencyDestinationBankData => {
            anotherLogger.debug(JSON.parse(currencyDestinationBankData));
            let bynToCurrencyDestination = (firstCurencyExchange / (Number(JSON.parse(currencyDestinationBankData)['Cur_OfficialRate']))).toFixed(2);
            anotherLogger.debug(bynToCurrencyDestination);
            anotherLogger.debug(currencyInitialBankInfo);
            currencyRateMessage = `${currencyValue}  ${JSON.parse(currencyInitialBankInfo)['Cur_Abbreviation']}  =  ${bynToCurrencyDestination} ${JSON.parse(currencyDestinationBankData)['Cur_Abbreviation']} `;
            anotherLogger.debug(currencyRateMessage);
            return currencyRateMessage;

        })
}


    const collectionHello = {
        "type" : 'hello',
        "hello" : 'Hi! How are you?',
        "i'm fine" : 'Oh! It\'s good. I\'m happy for you!' ,
        "ok" : 'Oh! It\'s good. I\'m happy for you!',
        "super" : 'Oh! It\'s good. I\'m happy for you!',
        "bad" : 'Oh! Why? What\'s happend?',
        "buy" : 'See you later!',
        "goodbuy" : 'Buy! Come back again soon!',
        "see you later" : 'Have a nice day!'
    };
    const collectionPhysics = {
        "type" : 'physic',
        "kilogram" : '1 kg = 1000 gram',
        "meter" : '1 meter = 100 cm = 1000 mm',
        "liter" : '1 liter = 1000 ml = 0,001 cub. m.'
    };
    const collectionMoney = {
        "type" : 'money',
        "usd" : 145,
        "$" : 145,
        "eur" : 292,
        "rub" : 298,
        "pln" : 293,
        "uah" : 290,
        "chf" : 130
    };

    const collectionNews = {
        "type" : 'href',
        "news" : 'http://www.euronews.com/',
        "russia news" : 'http://xn----ctbsbazhbctieai.ru-an.info/',
        "belarus news" : 'https://news.tut.by/?om',
        "world news" : 'http://www.bbc.com/news/world'
    };
    const collectionProperty = {
        "type" : 'href',
        "property" : 'https://nadezhdagorenok.github.io/index_property.html',
        "property rent" : 'https://nadezhdagorenok.github.io/index_rent.html',
        "property sale" : 'https://nadezhdagorenok.github.io/index_sale.html',
        "property news" : 'http://www.bbc.com/news/world',
        "home sale" : 'https://nadezhdagorenok.github.io/index_sale.html',
        "home rent" : 'https://nadezhdagorenok.github.io/index_rent.html',
        "house" : 'https://nadezhdagorenok.github.io/index_OldHouse.html',
        "besthome" : 'https://nadezhdagorenok.github.io/about.html'
    };

    module.exports = compareMessageWithBot;