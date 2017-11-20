const express = require('express');   // импортируем express
const app = express();     // запускаем модуль express
const PORT = 3000;
const server = require('http').Server(app);
const io = require('socket.io')(server, {serveClient : true});     //serveClient - whether to serve the client files (true)
const path = require('path');
const bcrypt = require('bcryptjs');      // this.password = bcrypt.hashSync(this.password, 12);
const salt = bcrypt.genSaltSync(12);   // salt - number of hash's raunds - 12
const log4js = require('log4js');  //  Подключаем логгер
log4js.configure({                                                // log the cheese logger messages to a file, and the console ones as well.
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
    res.sendFile(path.join(__dirname, '..','client', 'index.html'));        // не нужен res.render('index.html', {date: new Date()});  для nunjucks
});
const mongo = require('mongodb');
const monk = require('monk');
const db = require('monk')('mongodb://<dbuser>:<dbpassword>@ds113566.mlab.com:13566/heroku_2c580g3h');
//const db = require('monk')('localhost/mydb');
const users = db.get('users');
users.createIndex({"login" : 1, "email" : 1}, {"unique" : true})
const messages = db.get('messages');

/*
socket.emit('event') — отправляет на сервер\клиент
socket.on — прослушивает события на клиенте
io.on — прослушивает события на сервере
socket.broadcast.emit('newUser', name); — отправка события 'newUser' всем кроме текущего сокета, с переменной name (текущего сокета).
socket.emit('userName', name); — отправляет событие 'userName' только текущему сокету c переменной name.
*/

io.on('connection', function(socket) {
    let name = 'U' + (socket.id).toString().substr(1, 4);
    anotherLogger.info('A user  ' + name + '  connected to chat! ', socket.id);
    // io.emit('chat message','User ' + socket.id + ' connected', 'System : ');
    socket.on('search user', function (logInfo) {

        anotherLogger.debug(logInfo);

        anotherLogger.debug(logInfo.password);
        users.findOne( { login: logInfo.login} ).then((user) => {         //mongodb возвращает курсор(=null),  если есть данные в БД
            anotherLogger.debug(user);
            anotherLogger.debug(user.login);
            let hash =  user.password;
            bcrypt.compare(logInfo.password,  hash).then( (res) => {
                if(res){




            //if (user) {

            anotherLogger.info('user is in database', user.login);  // ???нужно заменить на logInfo.login???
            //io.emit('user in database', logInfo.login);

            socket.broadcast.emit('newUser', user.login);  // Отсылает событие 'newUser' всем подключенным, кроме текущего. На клиенте навешаем обработчик на 'newUser' (Отправляет клиентам событие о подключении нового юзера)

            socket.emit('userName', user.login);
            anotherLogger.debug('userName   ' + user.login + '  go to client');
         }
         else {
                    logger.error('user not in database ' + logInfo.login);
                    socket.emit('user not in database', logInfo.login);
                }
        });

        })
            .catch(error => {
                //else {
                logger.error('user not in database ' + logInfo.login + error.message);
                socket.emit('user not in database', logInfo.login, error.message);
            });
    });

    //});
    socket.on('receive messagesHistory', () => {
        messages.find(
            {},
            {limit: 50},                           //sort: {username : -1, msg : -1},
            function (err, listOfMessages) {
                if (!err) {
                    //let date = (new Date()).toDateString();
                    socket.emit('history', listOfMessages); //,date);
                    //anotherLogger.debug(listOfMessages);
                }
            });
    });
    //socket.broadcast.emit('newUser', name);  // Отсылает событие 'newUser' всем подключенным, кроме текущего. На клиенте навешаем обработчик на 'newUser' (Отправляет клиентам событие о подключении нового юзера)
    //socket.emit('userName', name);          // Отправляем текущему клиенту событие 'userName' с его ником (name) (Отправляем клиенту его юзернейм)

    socket.on('chat message', function (msg, name, timeMessage, dateMessage) {        //обработчик на событие chat message
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
        messages.insert(message).then((mes) => {
            anotherLogger.info('In DB  ' + mes.username + ' : ' + mes.msg + '   ' + mes.time + '  ' + mes.shortDate);
            io.emit('chat message', mes.msg, mes.username, mes.type, mes.time, mes.shortDate);

            /*let dateNow = new Date();
              let date = dateNow.getDate();
             getOptionDate(date);
             let month = dateNow.getMonth();
             let hours = dateNow.getHours();
             getOptionDate(hours);
             let minutes = dateNow.getMinutes();
             getOptionDate(minutes);
             let messageDate = date + ' : ' + month + ' ' + hours + ':' + minutes;
              let timeMessage = dateNow.toLocaleTimeString();*/
            let msgLow = mes.msg.toLowerCase();
            anotherLogger.debug(msgLow);
            let msgBot={};
            msgBot.date = new Date;
            msgBot.time = (new Date()).toLocaleTimeString();
            msgBot.shortDate = (new Date()).toDateString();
            let arr = msgLow.split(' ');
            let number; // значение - цифра валюты
            if (msgLow in collectionNews) {
                msgBot.msg = collectionNews[msgLow];
                msgBot.username = 'journalist';
                msgBot.type = collectionNews["type"];
                anotherLogger.debug(msgBot.username);

                messages.insert(msgBot).then((mesBot) => {
                    anotherLogger.debug('bot in database', mesBot);
                    io.emit('chat message', mesBot.msg, 'journalist', mesBot.type, mesBot.time,  msgBot.shortDate, mes.username);
                    anotherLogger.info('journalist: ' + mesBot.username + ' | Message: ' + mesBot.msg + '|||  ' + mesBot.type, mesBot.time,  msgBot.shortDate, mes.username);
                })
                    .catch(error => {
                        logger.error(error.message);
                    });
                // io.emit('chat message', collectionNews[msgLow], 'journalist', collectionNews["type"], mes.time);
                // anotherLogger.info('journalist: ' + mes.username + ' | Message: ' + collectionNews[msgLow]+ '|||  ' + collectionNews["type"], mes.time);
            }
            else if (msgLow in collectionProperty){
                msgBot.msg = collectionProperty[msgLow];
                msgBot.username = 'agent';
                msgBot.type = collectionProperty["type"];
                anotherLogger.debug(msgBot.username);

                messages.insert(msgBot).then((mesBot) => {
                    anotherLogger.debug('bot in database', mesBot);
                    io.emit('chat message', mesBot.msg, 'agent', mesBot.type, mesBot.time,  msgBot.shortDate, mes.username);
                    anotherLogger.info('agent: ' + mesBot.username + ' | Message: ' + mesBot.msg + '|||  ' + mesBot.type, mesBot.time,  msgBot.shortDate, mes.username);
                })
                    .catch(error => {
                        logger.error(error.message);
                    });
                // io.emit('chat message', collectionNews[msgLow], 'journalist', collectionNews["type"], mes.time);
                // anotherLogger.info('journalist: ' + mes.username + ' | Message: ' + collectionNews[msgLow]+ '|||  ' + collectionNews["type"], mes.time);
            }

            else {
                for (let i = 0; i < arr.length; i++) {
                    if (arr[i] in collectionHello) {
                        msgBot.msg = collectionHello[arr[i]];
                        msgBot.username = 'bot';
                        msgBot.type = collectionHello["type"];
                        anotherLogger.debug(msgBot.username);

                        messages.insert(msgBot).then((mesBot) => {
                            anotherLogger.debug('bot in database', mesBot);

                            io.emit('chat message', mesBot.msg, 'bot', mesBot.type, mesBot.time, msgBot.shortDate, mes.username);
                            anotherLogger.info('bot: ' + mesBot.username + ' | Message: ' + mesBot.msg + '|||  ' + mesBot.type, mesBot.time, msgBot.shortDate, mes.username);
                        })
                            .catch(error => {
                                logger.error(error.message);
                            });
                        //io.emit('chat message', mes.msg, mes.username, mes.type, mes.time);//, timeMessage);
                        // io.emit('chat message', collectionHello[arr[i]], 'bot', collectionHello['type'], mes.time);//, timeMessage);
                        // anotherLogger.info('bot: ' + mes.username + ' | Message: ' + collectionHello[arr[i]], mes.time);
                    }

                    else if (arr[i] in collectionPhysics) {
                        msgBot.msg = collectionPhysics[msgLow];
                        msgBot.username = 'physicist';
                        msgBot.type = collectionPhysics["type"];
                        anotherLogger.debug(msgBot.username);

                        messages.insert(msgBot).then((mesBot) => {
                            anotherLogger.debug('bot in database', mesBot);
                            io.emit('chat message', mesBot.msg, 'physicist', mesBot.type, mesBot.time,  msgBot.shortDate, mes.username);
                            anotherLogger.info('physicist: ' + mesBot.username + ' | Message: ' + mesBot.msg + '|||  ' + mesBot.type, mesBot.time,  msgBot.shortDate, mes.username);
                        })
                            .catch(error => {
                                logger.error(error.message);
                            });
                        //io.emit('chat message', mes.msg, mes.username, mes.type, mes.time);//, timeMessage);
                        // io.emit('chat message', collectionPhysics[arr[i]], 'physicist', collectionPhysics['type'], mes.time);//, mes.time);
                        // anotherLogger.info('physicist: ' + mes.username + ' | Message: ' + collectionPhysics[arr[i]], mes.time);
                    }

                    else if (arr[i] in collectionMoney) {
                        // io.emit('chat message', mes.msg, mes.username, mes.type, mes.time);//, mes.time);
                        //io.emit('chat message', collectionMoney[arr[i]], 'bank', collectionMoney['type']);//, mes.time);


                        rp('http://www.nbrb.by/API/ExRates/Rates/' + collectionMoney[arr[i]])
                            .then(data => {
                                anotherLogger.debug(JSON.parse(data));
                                let item;
                                if (collectionMoney[arr[i]] === 298) {
                                    k = ((Number(JSON.parse(data)['Cur_OfficialRate'])/100)*arr[0]).toFixed(2);
                                    item = `${arr[0]}  ${JSON.parse(data)['Cur_Abbreviation']}  =  ${k} BYN `;
                                }
                                else {
                                    let k;
                                    k = (Number(JSON.parse(data)['Cur_OfficialRate'])*arr[0]).toFixed(2);
                                    item = `${arr[0]}  ${JSON.parse(data)['Cur_Abbreviation']}  =  ${k} BYN `;
                                }
                                anotherLogger.debug(item);
                                msgBot.msg = item;
                                msgBot.username = 'bank';
                                msgBot.type = collectionMoney["type"];
                                anotherLogger.debug(msgBot.username);

                                messages.insert(msgBot).then((mesBot) => {
                                    anotherLogger.debug('bot in database', mesBot);
                                    io.emit('chat message', mesBot.msg, 'bank', mesBot.type, mesBot.time, msgBot.shortDate);
                                    anotherLogger.info('bank: ' + mesBot.username + ' | Message: ' + mesBot.msg + '|||  ' + mesBot.type, mesBot.time, msgBot.shortDate);
                                })
                                    .catch(error => {
                                        logger.error(error.message);
                                    });
                                //io.emit('chat message', item, 'bank', collectionMoney['type'], mes.time);
                            })
                            .catch(handleError => {
                                logger.error(handleError);
                            });

                        //anotherLogger.info('bank: ' + mes.username + ' | Message: ' + collectionMoney[arr[i]], mes.time);
                    }
                    // else io.emit('chat message', mes.msg, mes.username, mes.type, mes.time);
                }
            }


            //                      //        отправка всем сокетам сообщения, включая отправи

        });
    });

    socket.on('insert user', function (logInfo) {
        bcrypt.hash(logInfo.password, 12).then(function(hash) {
            console.log(logInfo.password);
            logInfo.password = hash;
            console.log(logInfo.password);

        users.insert(logInfo).then((user) => {
            if (user) {
                anotherLogger.info('user is in database', user.login);
                //io.emit('user in database', logInfo.login);
                socket.broadcast.emit('newUser', user.login);  // Отсылает событие 'newUser' всем подключенным, кроме текущего. На клиенте навешаем обработчик на 'newUser' (Отправляет клиентам событие о подключении нового юзера)
                socket.emit('userName', user.login);
                anotherLogger.debug('userName   ' + user.login + '  go to client');
                /*socket.on('chat message', function(msg){        //обработчик на событие chat message
                    console.log('User: ' + user.login + ' | Message: ' + msg);
                    console.log('====> Sending message to other chaters...');

                    let dateNow = new Date();
                    let date = dateNow.getDate();
                    getOptionDate(date);
                    let month = dateNow.getMonth();
                    let hours = dateNow.getHours();
                    getOptionDate(hours);
                    let minutes = dateNow.getMinutes();
                    getOptionDate(minutes);
                    let messageDate = date + ' : ' + month + ' ' + hours + ':' + minutes;

                    if (msg.toLowerCase() in collectionHello){
                        io.emit('chat message', msg, user.login, messageDate);
                        io.emit('chat message', collectionHello[msg], 'bot', messageDate);
                        console.log('bot: ' + name + ' | Message: ' + collectionHello[msg]);
                    }
                    else if (msg.toLowerCase() in collectionPhysics){
                        io.emit('chat message', msg, user.login, messageDate);
                        io.emit('chat message', collectionPhysics[msg], 'physicist', messageDate);
                        console.log('physicist: ' + name + ' | Message: ' + collectionPhysics[msg]);
                    }
                    else if (msg.toLowerCase() in collectionNews){
                        io.emit('chat message', msg, user.login, messageDate);
                        io.emit('chat message', collectionNews[msg], 'journalist', messageDate);
                        console.log('journalist: ' + name + ' | Message: ' + collectionNews[msg]);
                    }
                    else
                        io.emit('chat message', msg, user.login, messageDate);                 //        отправка всем сокетам сообщения, включая отправителя
                });*/
            }
            // else {
            //     console.log('Error from dataBase');
            //     socket.emit('user not in database', user);  // Если придет ошибка, т е не запишится в БД, то можно снова вернуть форму регистрации или вывести на стороне клиента сообщение об ошибке
            // }

        }, (err) => {
            logger.error(err);
            socket.emit('dublicate userLogin', logInfo, err.message);

        });
     });

    });


    socket.on('disconnect', function(user){
        anotherLogger.info('user disconnected', user);
    });
});



server.listen(PORT, ()=>{                         // чтение на 3000 порту
    anotherLogger.info('server started on port: ', PORT);
});






 function getOptionDate(optionDate){
     if (optionDate < 10) {
         return optionDate = '0' + optionDate;
     }
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
    "euro" : 292,
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



