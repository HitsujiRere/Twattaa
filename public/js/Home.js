
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

let user_id = '';

const timelineApp = new Vue({
    el: '#timeline',
    data: {
        messages: [],
    },
    methods: {
        loadMessages: async function() {
            await fetch("/get_messages?" + new URLSearchParams({user_id: user_id}), {
                method: "GET",
            })
            .then(
                response => response.json()
            )
            .then(resMessages => {
                timelineApp.messages.splice(0);
                for (const resMessage of resMessages) {
                    const message = Message.fromJson(resMessage);
                    timelineApp.messages.unshift(message);
                }
            });
        },
        fav: function(message) {
            console.log('fav', message);
            socketio.emit('Twattaa_FAV', message.id, message.is_fav ? 1 : -1, user_id);
        },
        loadFavHistory: async function () {
            await fetch("/get_fav_messages?" + new URLSearchParams({user_id: user_id}), {
                method: "GET",
            })
            .then(
                response => response.json()
            )
            .then(favs => {
                for (const fav of favs) {
                    for (const message of this.messages) {
                        if (message.id === fav.message_id) {
                            message.is_fav = true;
                        }
                    }
                }
            });
        },
        getUserID: async function() {
            let user_id_cookie = document.cookie.match('(^|;)\\s*user_id\\s*=\\s*([^;]+)');
            if (user_id_cookie) {
                return user_id_cookie.pop();
            }

            const user_id_get = await fetch("/get_user_id", {
                method: "GET",
            })
            .then(
                response => response.text()
            );
            document.cookie = 'user_id = ' + user_id_get;
            return user_id_get;
        },
    },
    created : async function() {
        user_id = await this.getUserID();
        console.log('user_id', user_id);
        await this.loadMessages();
        await this.loadFavHistory();
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
                socketio.emit('Twattaa_SEND', null, this.myMessage, null);
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
