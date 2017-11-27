const express = require('express');                                  // import express
const app = express();                                              // start module express
const PORT = 5000;
const server = require('http').Server(app);
const io = require('socket.io')(server, {serveClient : true});     //serveClient - whether to serve the client files (true)
const path = require('path');
const bcrypt = require('bcryptjs');
const salt = bcrypt.genSaltSync(12);                                // salt - number of hash's raunds - 12, rounds=12: 2-3 hashes/sec
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

const rp = require('request-promise');
app.use(express.static(path.join(__dirname,'..','client')));
app.get('/', function(req, res){
    res.sendFile(path.join(__dirname, '..','client', 'index.html'));
});
const mongo = require('mongodb');
const monk = require('monk');
const db = require('monk')('mongodb://nika:6321897@ds127842.mlab.com:27842/heroku_m6gmwcn0');
//const db = require('monk')('localhost/mydb');       // for localhost

const users = db.get('users');
users.createIndex({"login" : 1, "email" : 1}, {"unique" : true})
const messages = db.get('messages');

io.on('connection', function(socket) {

    let name = 'U' + (socket.id).toString().substr(1, 4);
    anotherLogger.info('A user  ' + name + '  connected to chat! ', socket.id);

    socket.on('search user', function (logInfo) {

        anotherLogger.debug(logInfo);

        anotherLogger.debug(logInfo.password);
        users.findOne( { login: logInfo.login} )
            .then((user) => {                                                                 //mongodb возвращает курсор(=null),  если есть данные в БД
                anotherLogger.debug(user);
                anotherLogger.debug(user.login);
                let hash =  user.password;
                bcrypt.compare(logInfo.password,  hash)
                    .then( (res) => {
                            anotherLogger.info('user is in database', user.login);
                            socket.broadcast.emit('newUser', user.login);                     // Отсылает событие 'newUser' всем подключенным, кроме текущего. На клиенте навешаем обработчик на 'newUser' (Отправляет клиентам событие о подключении нового юзера)
                            socket.emit('userName', user.login);
                            anotherLogger.debug('userName   ' + user.login + '  go to client');
                    })
                    .catch(error => {
                        logger.error('user not in database ' + logInfo.login);
                        socket.emit('user not in database', logInfo.login);
                    });
            })
            .catch(error => {
                logger.error('user not in database ' + logInfo.login + error.message);
                socket.emit('user not in database', logInfo.login, error.message);
            });
    });


    socket.on('receive messagesHistory', () => {
        messages.find(
            {},
            {limit: 50},                           //sort: {username : -1, msg : -1},
            function (err, listOfMessages) {
                if (!err) {
                    socket.emit('history', listOfMessages);
                }
            });
    });

    socket.on('chat message', function (msg, name, timeMessage, dateMessage) {
        anotherLogger.info('User: ' + name + ' | Message: ' + msg + '   ' + timeMessage + '  ' + dateMessage);
        anotherLogger.debug('====> Sending message to other chaters...');
        const message = {
            date: new Date(),
            time: timeMessage,
            msg: msg,
            username: name,
            type: 'string',
            shortDate: dateMessage
        };

        messages.insert(message)
            .then((mes) => {
                anotherLogger.info('In DB  ' + mes.username + ' : ' + mes.msg + '   ' + mes.time + '  ' + mes.shortDate);
                io.emit('chat message', mes.msg, mes.username, mes.type, mes.time, mes.shortDate);

                let msgLow = mes.msg.toLowerCase();
                anotherLogger.debug(msgLow);

                let msgBot={};
                msgBot.date = new Date;
                msgBot.time = (new Date()).toLocaleTimeString();
                msgBot.shortDate = (new Date()).toDateString();
                let messageArray = msgLow.split(' ');

                if (msgLow in collectionNews) {
                    msgBot.msg = collectionNews[msgLow];
                    msgBot.username = 'journalist';
                    msgBot.type = collectionNews["type"];
                    anotherLogger.debug(msgBot.username);

                    messages.insert(msgBot)
                        .then((mesBot) => {
                            anotherLogger.debug('bot in database', mesBot);
                            io.emit('chat message', mesBot.msg, 'journalist', mesBot.type, mesBot.time,  msgBot.shortDate, mes.username);
                            anotherLogger.info('journalist: ' + mesBot.username + ' | Message: ' + mesBot.msg + '|||  ' + mesBot.type, mesBot.time,  msgBot.shortDate, mes.username);
                        })
                        .catch(error => {
                            logger.error(error.message);
                        });
                }
                else if (msgLow in collectionProperty){
                    msgBot.msg = collectionProperty[msgLow];
                    msgBot.username = 'agent';
                    msgBot.type = collectionProperty["type"];
                    anotherLogger.debug(msgBot.username);

                    messages.insert(msgBot)
                        .then((mesBot) => {
                            anotherLogger.debug('bot in database', mesBot);
                            io.emit('chat message', mesBot.msg, 'agent', mesBot.type, mesBot.time,  msgBot.shortDate, mes.username);
                            anotherLogger.info('agent: ' + mesBot.username + ' | Message: ' + mesBot.msg + '|||  ' + mesBot.type, mesBot.time,  msgBot.shortDate, mes.username);
                    })
                    .catch(error => {
                        logger.error(error.message);
                    });
                }

                else if (messageArray.length === 4 && messageArray[1] in collectionMoney && messageArray[messageArray.length-1] in collectionMoney) {

                        let currencyValue = messageArray[0];
                        let currencyInitial = messageArray[1];
                        let currencyDestination = messageArray[messageArray.length-1];
                        let currencyRateMessage;
                        let currencyInitialValueToByn;
                        let bynToCurrencyDestination;


                        rp('http://www.nbrb.by/API/ExRates/Rates/' + collectionMoney[currencyInitial])
                            .then(currencyInitialBankData => {
                                anotherLogger.debug(JSON.parse(currencyInitialBankData));

                                if (collectionMoney[currencyInitial] === 298 || collectionMoney[currencyInitial] === 290) {

                                    currencyInitialValueToByn = ((Number(JSON.parse(currencyInitialBankData)['Cur_OfficialRate'])/100) * currencyValue).toFixed(2);

                                    rp('http://www.nbrb.by/API/ExRates/Rates/' + collectionMoney[currencyDestination])
                                        .then(currencyDestinationBankData => {
                                            anotherLogger.debug(JSON.parse(currencyDestinationBankData));
                                            bynToCurrencyDestination = (currencyInitialValueToByn / (Number(JSON.parse(currencyDestinationBankData)['Cur_OfficialRate']))).toFixed(2);
                                            currencyRateMessage = `${currencyValue}  ${JSON.parse(currencyInitialBankData)['Cur_Abbreviation']}  =  ${bynToCurrencyDestination} ${JSON.parse(currencyDestinationBankData)['Cur_Abbreviation']} `;
                                            anotherLogger.debug(currencyRateMessage);
                                            msgBot.msg = currencyRateMessage;
                                            msgBot.username = 'bank';
                                            msgBot.type = collectionMoney["type"];
                                            anotherLogger.debug(msgBot.username);

                                            messages.insert(msgBot)
                                                .then((mesBot) => {
                                                    anotherLogger.debug('bot in database', mesBot);
                                                    io.emit('chat message', mesBot.msg, 'bank', mesBot.type, mesBot.time, msgBot.shortDate);
                                                    anotherLogger.info('bank: ' + mesBot.username + ' | Message: ' + mesBot.msg + '|||  ' + mesBot.type, mesBot.time, msgBot.shortDate);
                                                });
                                        });
                                }
                                else if (collectionMoney[currencyInitial] === 293) {

                                    currencyInitialValueToByn = ((Number(JSON.parse(data)['Cur_OfficialRate']) / 10) * currencyValue).toFixed(2);


                                    rp('http://www.nbrb.by/API/ExRates/Rates/' + collectionMoney[currencyDestination])
                                        .then(currencyDestinationBankData => {
                                            anotherLogger.debug(JSON.parse(currencyDestinationBankData));
                                            bynToCurrencyDestination = (currencyInitialValueToByn / (Number(JSON.parse(currencyDestinationBankData)['Cur_OfficialRate']))).toFixed(2);

                                            currencyRateMessage = `${currencyValue}  ${JSON.parse(currencyInitialBankData)['Cur_Abbreviation']}  =  ${bynToCurrencyDestination} ${JSON.parse(currencyDestinationBankData)['Cur_Abbreviation']} `;
                                            anotherLogger.debug(currencyRateMessage);
                                            msgBot.msg = currencyRateMessage;
                                            msgBot.username = 'bank';
                                            msgBot.type = collectionMoney["type"];
                                            anotherLogger.debug(msgBot.username);
                                            messages.insert(msgBot)
                                                .then((mesBot) => {
                                                    anotherLogger.debug('bot in database', mesBot);
                                                    io.emit('chat message', mesBot.msg, 'bank', mesBot.type, mesBot.time, msgBot.shortDate);
                                                    anotherLogger.info('bank: ' + mesBot.username + ' | Message: ' + mesBot.msg + '|||  ' + mesBot.type, mesBot.time, msgBot.shortDate);
                                            });
                                        });
                                }
                                else {
                                    currencyInitialValueToByn = (Number(JSON.parse(currencyInitialBankData)['Cur_OfficialRate'])*currencyValue).toFixed(2);
                                    rp('http://www.nbrb.by/API/ExRates/Rates/' + collectionMoney[currencyDestination])
                                        .then(currencyDestinationBankData => {
                                            anotherLogger.debug(JSON.parse(currencyDestinationBankData));
                                            bynToCurrencyDestination = (currencyInitialValueToByn / (Number(JSON.parse(currencyDestinationBankData)['Cur_OfficialRate']))).toFixed(2);

                                            currencyRateMessage = `${currencyValue}  ${JSON.parse(currencyInitialBankData)['Cur_Abbreviation']}  =  ${bynToCurrencyDestination} ${JSON.parse(currencyDestinationBankData)['Cur_Abbreviation']} `;
                                            anotherLogger.debug(currencyRateMessage);
                                            msgBot.msg = currencyRateMessage;
                                            msgBot.username = 'bank';
                                            msgBot.type = collectionMoney["type"];
                                            anotherLogger.debug(msgBot.username);
                                            messages.insert(msgBot)
                                                .then((mesBot) => {
                                                    anotherLogger.debug('bot in database', mesBot);
                                                    io.emit('chat message', mesBot.msg, 'bank', mesBot.type, mesBot.time, msgBot.shortDate);
                                                    anotherLogger.info('bank: ' + mesBot.username + ' | Message: ' + mesBot.msg + '|||  ' + mesBot.type, mesBot.time, msgBot.shortDate);
                                                });
                                        });
                                }

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
                        rp('http://www.nbrb.by/API/ExRates/Rates/' + collectionMoney[currencyInitial])
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
                                anotherLogger.debug(currencyRateMessage);
                                msgBot.msg = currencyRateMessage;
                                msgBot.username = 'bank';
                                msgBot.type = collectionMoney["type"];
                                anotherLogger.debug(msgBot.username);

                                messages.insert(msgBot)
                                    .then((mesBot) => {
                                        anotherLogger.debug('bot in database', mesBot);
                                        io.emit('chat message', mesBot.msg, 'bank', mesBot.type, mesBot.time, msgBot.shortDate);
                                        anotherLogger.info('bank: ' + mesBot.username + ' | Message: ' + mesBot.msg + '|||  ' + mesBot.type, mesBot.time, msgBot.shortDate);
                                    })
                                    .catch(error => {
                                        logger.error(error.message);
                                    });
                            })
                            .catch(handleError => {
                                logger.error(handleError.message);
                            });
                    }
                else {
                    for (let i = 0; i < messageArray.length; i++) {
                        if (messageArray[i] in collectionHello) {
                            msgBot.msg = collectionHello[messageArray[i]];
                            msgBot.username = 'bot';
                            msgBot.type = collectionHello["type"];
                            anotherLogger.debug(msgBot.username);

                            messages.insert(msgBot)
                                .then((mesBot) => {
                                anotherLogger.debug('bot in database', mesBot);

                                io.emit('chat message', mesBot.msg, 'bot', mesBot.type, mesBot.time, msgBot.shortDate, mes.username);
                                anotherLogger.info('bot: ' + mesBot.username + ' | Message: ' + mesBot.msg + '|||  ' + mesBot.type, mesBot.time, msgBot.shortDate, mes.username);
                                })
                                .catch(error => {
                                    logger.error(error.message);
                                });
                        }
                        else if (messageArray[i] in collectionPhysics) {
                            msgBot.msg = collectionPhysics[msgLow];
                            msgBot.username = 'physicist';
                            msgBot.type = collectionPhysics["type"];
                            anotherLogger.debug(msgBot.username);

                            messages.insert(msgBot)
                                .then((mesBot) => {
                                    anotherLogger.debug('bot in database', mesBot);
                                    io.emit('chat message', mesBot.msg, 'physicist', mesBot.type, mesBot.time, msgBot.shortDate, mes.username);
                                    anotherLogger.info('physicist: ' + mesBot.username + ' | Message: ' + mesBot.msg + '|||  ' + mesBot.type, mesBot.time, msgBot.shortDate, mes.username);
                                })
                                .catch(error => {
                                    logger.error(error.message);
                                });

                        }
                    }


                }
            });
    });

    socket.on('insert user', function (logInfo) {
        bcrypt.hash(logInfo.password, 12)
            .then(function(hash) {
                console.log(logInfo.password);
                logInfo.password = hash;
                console.log(logInfo.password);

            users.insert(logInfo)
                .then((user) => {
                    anotherLogger.info('user is in database', user.login);
                    socket.broadcast.emit('newUser', user.login);          // Отсылает событие 'newUser' всем подключенным, кроме текущего. На клиенте навешаем обработчик на 'newUser' (Отправляет клиентам событие о подключении нового юзера)
                    socket.emit('userName', user.login);
                    anotherLogger.debug('userName   ' + user.login + '  go to client');
                })
                .catch(err => {
                    logger.error(err);
                    socket.emit('dublicate userLogin', logInfo, err.message);
                });
            });
    });


    socket.on('disconnect', function(user){
        anotherLogger.info('user disconnected', user);
    });

});

server.listen(process.env.PORT || 5000, () => {                         // чтение на 5000 порту
    anotherLogger.info('server started on port: ', PORT);
});


 function getOptionDate(optionDate) {
     if (optionDate < 10) {
         return optionDate = '0' + optionDate;
     }
 }
         // function getCurrencyRate(currency){
         //     rp('http://www.nbrb.by/API/ExRates/Rates/' + collectionMoney[currency])
         //         .then(currencyBankData => {
         //             anotherLogger.debug(JSON.parse(currencyBankData));
         //             return JSON.parse(currencyBankData);
         //         }
         //         .catch(error => {
         //             anotherLogger.error(error.message);
         //         });
         // }
         //
         // function getCurrencyConversion (currencyBankData, ){
         //
         //             bynToCurrencyDestination = (summa * (Number(JSON.parse(currencyDestinationBankData)['Cur_OfficialRate']))).toFixed(2);
         //             d = JSON.parse(currencyDestinationBankData)['Cur_Abbreviation'];
         //             currencyRateMessage = `${array[0]}  ${JSON.parse(data)['Cur_Abbreviation']}  =  ${bynToCurrencyDestination} ${d} `;
         //             anotherLogger.debug(currencyRateMessage);
         //             msgBot.msg = currencyRateMessage;
         //             msgBot.username = 'bank';
         //             msgBot.type = collectionMoney["type"];
         //             anotherLogger.debug(msgBot.username);
         //             messages.insert(msgBot).then((mesBot) => {
         //                 anotherLogger.debug('bot in database', mesBot);
         //                 io.emit('chat message', mesBot.msg, 'bank', mesBot.type, mesBot.time, msgBot.shortDate);
         //                 anotherLogger.info('bank: ' + mesBot.username + ' | Message: ' + mesBot.msg + '|||  ' + mesBot.type, mesBot.time, msgBot.shortDate);
         //             });
         //         });
         //
         // }


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



/*
socket.emit('event') — отправляет на сервер\клиент
socket.on — прослушивает события на клиенте
io.on — прослушивает события на сервере
socket.broadcast.emit('newUser', name); — отправка события 'newUser' всем кроме текущего сокета, с переменной name (текущего сокета).
socket.emit('userName', name); — отправляет событие 'userName' только текущему сокету c переменной name.
*/



