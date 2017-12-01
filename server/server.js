const express = require('express');                                  // import express
const app = express();                                              // start module express
const PORT = 5000;
const server = require('http').Server(app);
const io = require('socket.io')(server, {serveClient : true});     //serveClient - whether to serve the client files (true)
const path = require('path');
const bots = require('./bots.js');
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
const db = require('monk')('mongodb://nika:6321897@ds127842.mlab.com:27842/heroku_m6gmwcn0');  //const db = require('monk')('localhost/mydb');       // for localhost
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
                return msgLow;
            })
            .then((msg) => {
            return bots(msg);
            })
            .then((messageBot) => {
                messages.insert(messageBot)
                    .then((mesBot) => {
                       emitChatMessage(mesBot, message.username);
                    })
                    .catch(error => {
                        logger.error(error.message);
                    });
            })
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

function emitChatMessage(botMessage, username){
    anotherLogger.debug('bot in database', botMessage);
    io.emit('chat message', botMessage.msg, botMessage.username, botMessage.type, botMessage.time,  botMessage.shortDate, username);
    anotherLogger.info('botMessage: ' + botMessage.username + ' | Message: ' + botMessage.msg + '|||  ' + botMessage.type, botMessage.time,  botMessage.shortDate, username);
}

/*
socket.emit('event') — отправляет на сервер\клиент
socket.on — прослушивает события на клиенте
io.on — прослушивает события на сервере
socket.broadcast.emit('newUser', name); — отправка события 'newUser' всем кроме текущего сокета, с переменной name (текущего сокета).
socket.emit('userName', name); — отправляет событие 'userName' только текущему сокету c переменной name.
*/



