
const socketio = io();

class Message {
    constructor(id, body, talk_on, fav_count) {
        this.id = id;
        this.body = body;
        this.talk_on = talk_on;
        this.fav_count = fav_count;
        this.is_fav = false;
    }

    static fromJson(json) {
        const ms = new Message('', '', '', 0);
        ms.id = json.id;
        ms.body = json.body;
        ms.talk_on = new Date(json.talk_on);
        ms.fav_count = json.fav_count;
        return ms;
    }
}

const timelineApp = new Vue({
    el: '#timeline',
    data: {
        xhr: new XMLHttpRequest(),
        messages: []
    },
    methods: {
        loadMessages: function() {
            this.xhr.addEventListener('load', () => {
                timelineApp.messages.splice(0);
                for (const resMessage of JSON.parse(this.xhr.responseText)) {
                    const message = Message.fromJson(resMessage);
                    timelineApp.messages.unshift(message);
                }
            });
            this.xhr.open('GET', '/get_messages');
            this.xhr.send();
        },
        fav: function(message) {
            // TODO - 過去のfavの履歴を保存
            console.log('fav', message);
            socketio.emit('Twattaa_FAV', message.id, message.is_fav ? 1 : -1);
        }
    },
    created : function() {
        this.loadMessages();
    },
});

const myMessageApp = new Vue({
    el: '#my_message',
    data: {
        myMessage: '',
    },
    methods: {
        input: function() {
            const textarea = document.getElementById('message_ta');
            if (textarea.scrollHeight > textarea.offsetHeight) {
                textarea.style.height = textarea.scrollHeight + 'px';
            } else {
                textarea.style.height = '0';
                textarea.style.height = textarea.scrollHeight + 'px';
            }
        },
        send: function() {
            if (this.myMessage !== '') {
                socketio.emit('Twattaa_SEND', null, this.myMessage);
                this.myMessage = '';
            }
        }
    },
});

socketio.on('Twattaa_SEND', (id, body, talk_on) => {
    timelineApp.messages.unshift(new Message(id, body, talk_on));
});

socketio.on('Twattaa_FAV', (id, add) => {
    timelineApp.messages.find(item => item.id == id).fav_count += add;
});
