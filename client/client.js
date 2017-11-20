let APP = {};
window.addEventListener('DOMContentLoaded', ready = () => {
    window.location.hash = 'tologin';
    const port = 5000; // Указываем порт на котором у на стоит сокет
    let socket = io.connect('http://localhost:' + port);   //объявляем socket и подключаемся сразу к серверу через порт
    const chat = document.getElementById('container');
    const login = document.getElementsByClassName('login');
    const registration = document.getElementsByClassName('registration');
    const registrationForm = document.getElementById('registrationForm');
    registrationForm.addEventListener('submit',validateRegistrationForm);
    const loginForm = document.getElementById('loginForm');
    loginForm.addEventListener('submit',validateLoginForm);
    let error = document.createElement('span');
    const formsContainer = document.getElementById('box');
    const logout = document.getElementById('logout');
    logout.addEventListener('click', logoutChat);
    const name = document.createElement('span');
    chat.appendChild(name);

    function logoutChat(){
        chat.style.display = 'none';
        name.textContent = "";
        formsContainer.style.display = 'block';
        document.forms['login'].reset();
        socket.emit('disconnect', APP.login);
        window.location.hash='tologin';
    }

function validateLoginForm(e) {
    try {
        const formLogin = document.forms['login'];
        let nickLog = document.getElementById('nickLog');
        let passwordLog = document.getElementById('passwordLog');
        let nick = document.getElementsByClassName('nick');
        let pass = document.getElementsByClassName('pass');

        if (nickLog.value === '') {
            console.log('Empty login field!');
            let errorMessage = 'Empty login field!';
            showErrorMessage(nickLog,errorMessage);
            nickLog.focus();
            e.preventDefault();
            return;
        }
        resetError(nickLog);
        if (/^[а-яё]/gi.test(nickLog.value)) {
            console.log('Invalid value!');
            let errorMessage = 'Invalid value!';
            showErrorMessage(nickLog, errorMessage);
            nickLog.focus();
            e.preventDefault();
            return;
        }
        resetError(nickLog);
        if (passwordLog.value === '') {
            console.log('Empty password field!');
            let errorMessage = 'Empty password field!';
            showErrorMessage(passwordLog,errorMessage);
            passwordLog.focus();
            e.preventDefault();
            return;
        }
        resetError(passwordLog);
        resetError(nickLog);

        if (passwordLog.value.length < 7) {
            console.log('Password\'s length should be more than 7 symbols!');
            let errorMessage = 'Password\'s length should be more than 7 symbols!';
            showErrorMessage(passwordLog,errorMessage);
            passwordLog.focus();
            e.preventDefault();
            return;
        }
        resetError(nickLog);
        resetError(passwordLog);
        socket.emit('search user', {login : nickLog.value, password : passwordLog.value});
    }
    catch (Ex) {
        e.preventDefault();
        document.getElementById('nickLog').scrollIntoView();
    }
}
    function validateRegistrationForm(e) {
        try {
            const formRegistration = document.forms['registration'];
            let email = document.getElementById('email');
            let nickname = document.getElementById('nickname');
            let passwordRegistr = document.getElementById('password');
            let nick = document.getElementsByClassName('nick');
            let pass = document.getElementsByClassName('pass');
            let emailBlock = document.getElementsByClassName('email');

            if (email.value === "" || email.value.indexOf('@') === -1) {                         // || /.+@.+\..+/i.test(connectEmailValue)
                let errorMessage = 'You don\'t type e-mail!';
                showErrorMessage(email,errorMessage);
                email.focus();
                e.preventDefault();
                return;
            }
            resetError(email);

            if (nickname.value === '') {
                console.log('Empty login field!');
                let errorMessage = 'Empty login field!';
                showErrorMessage(nickname,errorMessage);
                nickname.focus();
                e.preventDefault();
                return;
            }
            resetError(nickname);
            if (/^[а-яё]/gi.test(nickname.value)) {
                console.log('Invalid value!');
                let errorMessage = 'Invalid value!';
                showErrorMessage(nickname, errorMessage);
                nickname.focus();
                e.preventDefault();
                return;
            }
            resetError(nickname);
            if (passwordRegistr.value === '') {
                console.log('Empty password field!');
                let errorMessage = 'Empty password field!';
                showErrorMessage(passwordRegistr,errorMessage);
                passwordRegistr.focus();
                e.preventDefault();
                return;
            }
            resetError(passwordRegistr);
            if (passwordRegistr.value.length < 7) {
                console.log('Password\'s length should be more than 7 symbols!');
                let errorMessage = 'Password\'s length should be more than 7 symbols!';
                showErrorMessage(passwordRegistr,errorMessage);
                passwordRegistr.focus();
                e.preventDefault();
                return;
            }
            resetError(nickname);
            resetError(passwordRegistr);

            socket.emit('insert user', {email : email.value , login : nickname.value, password : passwordRegistr.value});
            document.getElementByID('box').style.display = 'none';
        }
        catch (Ex) {
            e.preventDefault();
            document.getElementById('nickname').scrollIntoView();
        }

    }

function showErrorMessage(element, errorMessage){
    error.classList.add('error');
    error.innerHTML = errorMessage;
    element.parentNode.insertBefore(error, element);
}

function resetError(element, elementParent) {
    error.classList.remove('error');
    error.textContent = undefined;
}

socket.on('newUser', function(userName) {             // прослушка события 'newUser' и принимаем переменную name в виде аргумента 'userName'
    $('#messages').append($('<li>').text(userName + '  connected').addClass('connectedUser')); // Это событие было отправлено всем кроме только подключенного, по этому мы пишем другим юзерам в поле что 'подключен новый юзер' с его ником
});

socket.on('dublicate userLogin', function(user, error){
    console.log('User  '+ user.login + '  not in database! ' + error);
    alert('User with this username or email is in database yet!' + ' \n' + error)
    document.forms['registration'].reset();

});

    socket.on('user not in database', function(user, error){
        console.log('User  '+ user + '  not in database!' + error);
        alert('Error! This username or this password are not in our database! Try again, please!' + '  ' + error);
    });


socket.on('userName', function(userName){
    console.log('New user has been connected to chat | ' + userName);
    APP.login = userName;
    chat.style.display = 'block';
    window.location.hash = 'chat';

    console.log(formsContainer);
    formsContainer.style.display = 'none';
    const li = document.getElementsByTagName('li');
    console.log('Your username is => ' + APP.login);

    name.textContent = 'Hi, ' + APP.login + '!';
    name.classList.add('name');
    $('#messages').append($('<li>').text('Your username => ' + APP.login));   // Выводим в поле для текста оповещение для подключенного с его ником

    socket.emit('receive messagesHistory');

});

    socket.on('history', (messages) => {                  // date пока не передаем
        //console.log(date.toDateString());

        for (let message of messages) {
            $('#messages').append($('<li>').text(message.shortDate).addClass('dateMessages'));
            if (message.type === 'href'){
                $('#messages').append($('<li>').text(message.username + '  :  ' ).add(("<a href=\"" + message.msg + "\">\"" + message.msg + "\"</a>")).addClass('news'));
            }
            else if(message.type === 'money'|| message.type === 'physic' || message.type === 'hello'){
                $('#messages').append($('<li>').text(message.username + '  :  ' + message.msg).addClass('bot'));

            }

            else if (message.type === 'string'){
                $('#messages').append($('<li>').text(message.username + '  :  ' + message.msg));// + '         \n' + message.date)); // + '\n' + message.date));
            }
            $('#messages').append($('<li>').text(message.time).addClass('time'));
            // let liTime = document.createElement('li');
            // liTime.textContent = message.time;
            // liTime.classList.add('time');
            // document.getElementById('messages').appendChild(liTime);
        }
       // $('#messages').scrollTop($('#messages').height());
        //$('#messages').scrollTop = $('#messages').scrollHeight;
        $(document).ready(function(){
            let block = document.getElementById('messages');
            $('#messages').scrollTop(block.scrollHeight-block.offsetHeight);
        });

    });


$(function () {
    var socket = io();
        $('form').submit(function(){
            var message =  $('#text').val();
            if (message === '') {
                return false;
            }
            let dateNow = new Date();
            let timeMessage = dateNow.toLocaleTimeString();
            let dateMessage = dateNow.toDateString();

            socket.emit('chat message', message, APP.login, timeMessage, dateMessage);
            $('#text').val('').focus();    // или можно $('#text').val(null); - заполнение поля для ввода пустым
            return false;
        });

        socket.on('chat message', function(msg,name, type, time,date, mesUser) {

            $('#messages').append($('<li>').text(date).addClass('dateMessages'));
            // let dateMessage = document.createElement('li');
            // dateMessage.textContent = date;
            // dateMessage.classList.add('dateMessages');
            // document.getElementById('messages').appendChild(dateMessage);

            let liTime = document.createElement('li');
            liTime.textContent = time;
            liTime.classList.add('time');

            if (type == "href") {
                $('#messages').append($('<li>').text(name + '  :  ' + mesUser + '! Catch link ').add(("<a href=\"" + msg + "\">\"" + msg + "\"</a>")).addClass('news'));
                document.getElementById('messages').appendChild(liTime);
            }
            else if(type === 'money'|| type === 'physic'){
                $('#messages').append($('<li>').text(name + '  :  ' + msg).addClass('bot'));
                document.getElementById('messages').appendChild(liTime);
            }
            else if(type === 'hello'){

                $('#messages').append($('<li>').text(name + '  :  ' + mesUser + '! ' + msg).addClass('bot'));
                document.getElementById('messages').appendChild(liTime);
            }

            // else if (type == 'money'){
            //     let uri = 'http://www.nbrb.by/API/';
            //     $.getJSON(uri + 'ExRates/Rates/' + msg, {'Periodicity': 0 })
            //         .done(function (data) {
            //             if (msg === '298'){
            //                 $('<li>', { text: name + ' : ' + '100 ' + data['Cur_Abbreviation'] + ' = ' + data['Cur_OfficialRate'] + ' BYN '}).appendTo($('#messages'));
            //             }
            //             else {
            //                 $('<li>', {text: name + ' : ' + '1 ' + data['Cur_Abbreviation'] + ' = ' + data['Cur_OfficialRate'] + ' BYN '}).appendTo($('#messages'));
            //
            //             }
            //
            //                 alert(data['Cur_OfficialRate']);
            //             });
            // }
            else {
                $('#messages').append($('<li>').text(name + '  :  ' + msg));//+'\n'+ messageDate));    //  поле для текста добавили сообщение вида ник : сообщение
                document.getElementById('messages').appendChild(liTime);
            }
           //$('#messages').scrollTop($('#messages').height());
            //$('#messages').scrollTop = $('#messages').scrollHeight;
            // var offset = document.getElementById('messages').offset();
            // var offsetTop = offset.top;
            // var totalScroll = offsetTop-40;
            $(document).ready(function(){
                let block = document.getElementById('messages');
                $('#messages').scrollTop(block.scrollHeight-block.offsetHeight);
            });

        });


    // socket.on('botMessage', function(msg,name, type, time,date) {
    //
    //     let dateMessage = document.createElement('li');
    //     dateMessage.textContent = date;
    //     dateMessage.classList.add('dateMessages');
    //     document.getElementById('messages').appendChild(dateMessage);
    //     let liTime = document.createElement('li');
    //     liTime.textContent = time;
    //     liTime.classList.add('time');
    //     if (type == "href") {
    //         $('<li>', {text: name + ' : '}).add(("<a href=\"" + msg + "\">\"" + msg + "\"</a>")).appendTo($('#messages'));
    //
    //         document.getElementById('messages').appendChild(liTime);
    //     }
    //     else {
    //         $('#messages').append($('<li>').text(name + '  :  ' + msg));//+'\n'+ messageDate));    //  поле для текста добавили сообщение вида ник : сообщение
    //         document.getElementById('messages').appendChild(liTime);
    //     }
    //     $('#messages').scrollTop($('#messages').height()).focus();
    // });

    });
        });









